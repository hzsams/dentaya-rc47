import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumeRequestBudget, hasJsonContentType, requestBodyTooLarge } from "@/lib/server/request-guard";

export const runtime = "nodejs";

const MAX_ADDRESS_LENGTH = 600;

type GoogleGeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
};

type GoogleGeocodeResponse = {
  status?: string;
  error_message?: string;
  results?: GoogleGeocodeResult[];
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  const googleKey = process.env.GOOGLE_MAPS_GEOCODING_KEY?.trim();
  const authorization = request.headers.get("authorization")?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonError("Supabase sunucu yapılandırması eksik.", 503);
  }

  if (!googleKey) {
    return jsonError(
      "Google Maps Geocoding anahtarı tanımlı değil. GOOGLE_MAPS_GEOCODING_KEY ortam değişkenini ekle.",
      503,
    );
  }

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return jsonError("Oturum doğrulaması gerekli.", 401);
  }

  const token = authorization.slice(7).trim();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonError("Oturum doğrulanamadı.", 401);
  }

  if (!hasJsonContentType(request)) return jsonError("Content-Type application/json olmalı.", 415);
  if (requestBodyTooLarge(request, 4096)) return jsonError("İstek gövdesi çok büyük.", 413);
  const budget = consumeRequestBudget(`geocode:${authData.user.id}`, 20, 300000);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi.", retryAfterSeconds: budget.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(budget.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", authData.user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return jsonError("Adres doğrulaması için kurum yöneticisi yetkisi gerekli.", 403);
  }

  let body: { address?: unknown };
  try {
    body = (await request.json()) as { address?: unknown };
  } catch {
    return jsonError("Geçersiz istek gövdesi.", 400);
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (address.length < 6 || address.length > MAX_ADDRESS_LENGTH) {
    return jsonError("Adres 6 ile 600 karakter arasında olmalı.", 400);
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", googleKey);
  url.searchParams.set("language", "tr");
  url.searchParams.set("region", "tr");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return jsonError("Google Maps servisine ulaşılamadı.", 502);
  }

  if (!response.ok) {
    return jsonError("Google Maps geocoding servisi hata döndürdü.", 502);
  }

  const payload = (await response.json()) as GoogleGeocodeResponse;
  if (payload.status !== "OK" || !payload.results?.length) {
    const suffix = payload.error_message ? ` ${payload.error_message}` : "";
    return jsonError(`Adres Google Maps üzerinde bulunamadı.${suffix}`.trim(), 422);
  }

  const result = payload.results[0];
  const latitude = result.geometry?.location?.lat;
  const longitude = result.geometry?.location?.lng;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return jsonError("Google Maps koordinat döndürmedi.", 422);
  }

  return NextResponse.json({
    formattedAddress: result.formatted_address ?? address,
    placeId: result.place_id ?? null,
    latitude,
    longitude,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumeRequestBudget, hasJsonContentType, requestBodyTooLarge } from "@/lib/server/request-guard";

export const runtime = "nodejs";

type LatLng = { latitude: number; longitude: number };
type ShipmentRow = {
  id: string;
  status: "created" | "pickup_requested" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  planned_distance_meters: number | null;
  planned_duration_seconds: number | null;
  remaining_distance_meters: number | null;
  remaining_duration_seconds: number | null;
  route_polyline: string | null;
  route_calculated_at: string | null;
  eta_at: string | null;
};
type CourierLocationRow = {
  latitude: number;
  longitude: number;
  recorded_at: string;
};
type GoogleRoute = {
  distanceMeters?: number;
  duration?: string;
  staticDuration?: string;
  polyline?: { encodedPolyline?: string };
};
type GoogleRoutesResponse = { routes?: GoogleRoute[] };

type RouteLeg = {
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number | null;
  encodedPolyline: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function finiteCoordinate(value: number | null, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function parseGoogleDuration(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : null;
}

function samePoint(a: LatLng, b: LatLng) {
  return Math.abs(a.latitude - b.latitude) < 0.000001 && Math.abs(a.longitude - b.longitude) < 0.000001;
}

async function computeRoute(apiKey: string, origin: LatLng, destination: LatLng): Promise<RouteLeg> {
  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify({
      origin: { location: { latLng: origin } },
      destination: { location: { latLng: destination } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      languageCode: "tr-TR",
      units: "METRIC",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Routes HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GoogleRoutesResponse;
  const route = payload.routes?.[0];
  const durationSeconds = parseGoogleDuration(route?.duration);
  const staticDurationSeconds = parseGoogleDuration(route?.staticDuration);
  const distanceMeters = route?.distanceMeters;

  if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters) || durationSeconds === null) {
    throw new Error("Google Routes did not return distance and duration.");
  }

  return {
    distanceMeters: Math.max(0, Math.round(distanceMeters)),
    durationSeconds,
    staticDurationSeconds,
    encodedPolyline: route?.polyline?.encodedPolyline ?? null,
  };
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();
  const googleKey = process.env.GOOGLE_MAPS_ROUTES_KEY?.trim();
  const authorization = request.headers.get("authorization")?.trim();

  if (!supabaseUrl || !supabaseKey) return jsonError("Supabase sunucu yapılandırması eksik.", 503);
  if (!googleKey) {
    return jsonError(
      "Google Routes anahtarı tanımlı değil. GOOGLE_MAPS_ROUTES_KEY ortam değişkenini ekle.",
      503,
    );
  }
  if (!authorization?.toLowerCase().startsWith("bearer ")) return jsonError("Oturum doğrulaması gerekli.", 401);

  const token = authorization.slice(7).trim();
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return jsonError("Oturum doğrulanamadı.", 401);

  if (!hasJsonContentType(request)) return jsonError("Content-Type application/json olmalı.", 415);
  if (requestBodyTooLarge(request, 4096)) return jsonError("İstek gövdesi çok büyük.", 413);
  const budget = consumeRequestBudget(`route:${authData.user.id}`, 90, 60000);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi.", retryAfterSeconds: budget.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(budget.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  let body: { shipmentId?: unknown };
  try {
    body = (await request.json()) as { shipmentId?: unknown };
  } catch {
    return jsonError("Geçersiz istek gövdesi.", 400);
  }

  const shipmentId = typeof body.shipmentId === "string" ? body.shipmentId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(shipmentId)) return jsonError("Geçersiz gönderi kimliği.", 400);

  const { data: shipmentData, error: shipmentError } = await supabase
    .from("shipments")
    .select("id,status,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng,planned_distance_meters,planned_duration_seconds,remaining_distance_meters,remaining_duration_seconds,route_polyline,route_calculated_at,eta_at")
    .eq("id", shipmentId)
    .maybeSingle();

  if (shipmentError) return jsonError("Gönderi bilgisi alınamadı.", 502);
  if (!shipmentData) return jsonError("Gönderi bulunamadı veya erişim iznin yok.", 404);

  const shipment = shipmentData as ShipmentRow;
  if (
    !finiteCoordinate(shipment.pickup_lat, -90, 90) ||
    !finiteCoordinate(shipment.pickup_lng, -180, 180) ||
    !finiteCoordinate(shipment.dropoff_lat, -90, 90) ||
    !finiteCoordinate(shipment.dropoff_lng, -180, 180)
  ) {
    return jsonError("Klinik veya laboratuvar rota koordinatları eksik. Önce kurum adresini doğrula.", 422);
  }

  const pickup: LatLng = { latitude: shipment.pickup_lat, longitude: shipment.pickup_lng };
  const dropoff: LatLng = { latitude: shipment.dropoff_lat, longitude: shipment.dropoff_lng };

  const { data: locationData } = await supabase
    .from("courier_locations")
    .select("latitude,longitude,recorded_at")
    .eq("shipment_id", shipmentId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const courierLocation = (locationData as CourierLocationRow | null) ?? null;
  const courierPoint: LatLng | null = courierLocation &&
    finiteCoordinate(courierLocation.latitude, -90, 90) &&
    finiteCoordinate(courierLocation.longitude, -180, 180)
    ? { latitude: courierLocation.latitude, longitude: courierLocation.longitude }
    : null;

  const activeTarget: "pickup" | "dropoff" =
    (shipment.status === "created" || shipment.status === "pickup_requested") && courierPoint
      ? "pickup"
      : "dropoff";
  const cachedAtMs = shipment.route_calculated_at ? new Date(shipment.route_calculated_at).getTime() : 0;
  const cacheFresh = Number.isFinite(cachedAtMs) && Date.now() - cachedAtMs < 20000;
  if (
    cacheFresh &&
    shipment.planned_distance_meters != null &&
    shipment.planned_duration_seconds != null &&
    shipment.remaining_distance_meters != null &&
    shipment.remaining_duration_seconds != null
  ) {
    return NextResponse.json({
      planned: {
        distanceMeters: shipment.planned_distance_meters,
        durationSeconds: shipment.planned_duration_seconds,
        staticDurationSeconds: null,
        encodedPolyline: null,
      },
      active: {
        distanceMeters: shipment.remaining_distance_meters,
        durationSeconds: shipment.remaining_duration_seconds,
        staticDurationSeconds: null,
        encodedPolyline: shipment.route_polyline,
      },
      activeTarget,
      calculatedAt: shipment.route_calculated_at,
      etaAt: shipment.eta_at,
      courierLocationAt: courierLocation?.recorded_at ?? null,
      cached: true,
    });
  }

  let planned: RouteLeg;
  try {
    planned = await computeRoute(googleKey, pickup, dropoff);
  } catch {
    return jsonError("Google Routes servisi rota hesaplayamadı.", 502);
  }

  let activeOrigin = pickup;
  let activeDestination = dropoff;

  if ((shipment.status === "created" || shipment.status === "pickup_requested") && courierPoint) {
    activeOrigin = courierPoint;
    activeDestination = pickup;
  } else if ((shipment.status === "picked_up" || shipment.status === "in_transit") && courierPoint) {
    activeOrigin = courierPoint;
    activeDestination = dropoff;
  }

  let active = planned;
  if (!samePoint(activeOrigin, pickup) || !samePoint(activeDestination, dropoff)) {
    try {
      active = await computeRoute(googleKey, activeOrigin, activeDestination);
    } catch {
      active = planned;
    }
  }

  const calculatedAt = new Date();
  const etaAt = shipment.status === "delivered" || shipment.status === "cancelled"
    ? null
    : new Date(calculatedAt.getTime() + active.durationSeconds * 1000).toISOString();

  if (shipment.status !== "cancelled") {
    await supabase.rpc("dentaya_record_route_snapshot", {
      p_shipment_id: shipmentId,
      p_planned_distance_meters: planned.distanceMeters,
      p_planned_duration_seconds: planned.durationSeconds,
      p_remaining_distance_meters: shipment.status === "delivered" ? 0 : active.distanceMeters,
      p_remaining_duration_seconds: shipment.status === "delivered" ? 0 : active.durationSeconds,
      p_eta_at: etaAt,
      p_polyline: active.encodedPolyline,
    });
  }

  return NextResponse.json({
    planned,
    active,
    activeTarget,
    calculatedAt: calculatedAt.toISOString(),
    etaAt,
    courierLocationAt: courierLocation?.recorded_at ?? null,
  });
}

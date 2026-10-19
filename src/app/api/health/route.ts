import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const checks = {
    supabase: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    ),
    mapsEmbed: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?.trim()),
    mapsGeocoding: Boolean(process.env.GOOGLE_MAPS_GEOCODING_KEY?.trim()),
    mapsRoutes: Boolean(process.env.GOOGLE_MAPS_ROUTES_KEY?.trim()),
    aiCloud: process.env.DENTAYA_AI_CLOUD_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY?.trim()),
  };

  // Maps and cloud conversation are optional integrations, not core CAD dependencies.
  const requiredReady = checks.supabase;
  const authenticated = await verifyUser(request.headers.get("authorization"));

  return NextResponse.json(
    {
      status: requiredReady ? "ready" : "degraded",
      release: process.env.NEXT_PUBLIC_DENTAYA_BUILD_LABEL ?? "DentAYA",
      channel: process.env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL ?? "unknown",
      ...(authenticated ? { checks } : {}),
      timestamp: new Date().toISOString(),
    },
    {
      status: requiredReady ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}

async function verifyUser(authorization: string | null) {
  if (!authorization?.toLowerCase().startsWith("bearer ")) return false;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  if (!url || !key) return false;

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

import { createClient } from "@supabase/supabase-js";

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const configuredKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

export const supabaseConfiguration = Object.freeze({
  isConfigured: Boolean(configuredUrl && configuredKey),
  url: configuredUrl ?? null,
  keySource: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? "publishable"
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "anon"
      : null,
});

// A valid local URL keeps static builds deterministic when release secrets are
// intentionally absent. AppRuntime surfaces a clear setup notice in that case.
const supabaseUrl = configuredUrl ?? "http://127.0.0.1:54321";
const supabaseKey = configuredKey ?? "dentaya-public-key-not-configured";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
    persistSession: typeof window !== "undefined",
  },
  global: {
    headers: {
      "X-Client-Info": "dentaya-production-rc/1.0.0-rc.47",
    },
  },
});

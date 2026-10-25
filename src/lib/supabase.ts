import { createClient } from "@supabase/supabase-js";
import { resolvePublicConnection } from './public-connection';

const connection = resolvePublicConnection({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export const supabaseConfiguration = Object.freeze({
  isConfigured: connection.isConfigured,
  status: connection.status,
  url: connection.url,
  keySource: connection.keySource,
});

// A valid local URL keeps static builds deterministic when release secrets are
// intentionally absent. AppRuntime surfaces a clear setup notice in that case.
const supabaseUrl = connection.clientUrl;
const supabaseKey = connection.clientKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: typeof window !== "undefined",
    detectSessionInUrl: typeof window !== "undefined",
    persistSession: typeof window !== "undefined",
  },
  global: {
    headers: {
      "X-Client-Info": "dentaya-production-rc/1.0.0-rc.57",
    },
  },
});

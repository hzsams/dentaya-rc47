import { devError } from "@/lib/dev-log";
import { supabase, supabaseConfiguration } from "@/lib/supabase";

export type OperationalSeverity = "info" | "warning" | "error" | "critical";
export type OperationalSource = "client" | "route" | "network" | "api" | "system";

type OperationalEventInput = {
  eventType: string;
  severity?: OperationalSeverity;
  source?: OperationalSource;
  message: string;
  errorCode?: string | null;
  route?: string | null;
  requestId?: string | null;
  details?: Record<string, unknown> | null;
};

const recentlyReported = new Map<string, number>();
const DEDUPE_WINDOW_MS = 20_000;
let reporting = false;

function cleanDetails(value: Record<string, unknown> | null | undefined) {
  if (!value) return {};

  const blocked = /(token|secret|password|authorization|cookie|key)/i;
  const next: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(value)) {
    if (blocked.test(key)) continue;
    if (typeof raw === "string") next[key] = raw.slice(0, 1000);
    else if (typeof raw === "number" || typeof raw === "boolean" || raw == null) next[key] = raw;
    else if (Array.isArray(raw)) next[key] = raw.slice(0, 20);
    else next[key] = String(raw).slice(0, 1000);
  }

  return next;
}

function signature(input: OperationalEventInput) {
  return `${input.eventType}|${input.severity ?? "error"}|${input.route ?? ""}|${input.message.slice(0, 240)}`;
}

export async function reportOperationalEvent(input: OperationalEventInput): Promise<void> {
  if (!supabaseConfiguration.isConfigured || reporting) return;

  const key = signature(input);
  const now = Date.now();
  const last = recentlyReported.get(key) ?? 0;
  if (now - last < DEDUPE_WINDOW_MS) return;
  recentlyReported.set(key, now);

  if (recentlyReported.size > 100) {
    for (const [candidate, timestamp] of recentlyReported) {
      if (now - timestamp > DEDUPE_WINDOW_MS * 3) recentlyReported.delete(candidate);
    }
  }

  reporting = true;
  try {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session?.user) return;

    const { error } = await supabase.rpc("dentaya_log_operational_event", {
      p_event_type: input.eventType.slice(0, 80),
      p_severity: input.severity ?? "error",
      p_source: input.source ?? "client",
      p_message: input.message.slice(0, 2000),
      p_error_code: input.errorCode?.slice(0, 120) ?? null,
      p_route: input.route?.slice(0, 500) ?? null,
      p_request_id: input.requestId ?? null,
      p_details: cleanDetails(input.details),
      p_client_created_at: new Date().toISOString(),
    });

    if (error) devError("DentAYA telemetry write failed", error);
  } catch (error) {
    devError("DentAYA telemetry exception", error);
  } finally {
    reporting = false;
  }
}

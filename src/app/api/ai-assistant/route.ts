import {isLocale,languageInfo} from "@/lib/i18n/locales";
import { buildAyaInstructions } from "@/lib/server/aya-instructions";
import { ayaCadGuidance } from "@/lib/server/aya-cad-guidance";
import { extractResponseText, normalizeHistory, readBoundedBody } from "@/lib/server/aya-response";
import { consumeRequestBudget, hasJsonContentType, requestBodyTooLarge } from "@/lib/server/request-guard";

export const runtime = "nodejs";

type RequestBody = {
  prompt?: string;
  locale?: unknown;
  action?: string;
  role?: string;
  context?: unknown;
  history?: unknown;
  detail?: unknown;
};

export async function GET() {
  const enabled =
    process.env.DENTAYA_AI_CLOUD_ENABLED ===
      "true" &&
    Boolean(
      process.env.OPENAI_API_KEY
    );

  return Response.json({
    enabled,
    reason: enabled ? null : process.env.DENTAYA_AI_CLOUD_ENABLED !== 'true' ? 'cloud_disabled' : 'key_missing',
    authConfigured:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)),
    model:
      enabled
        ? process.env.DENTAYA_AI_MODEL ??
          "gpt-5.4"
        : null,
  }, {headers:{"Cache-Control":"no-store"}});
}

export async function POST(
  request: Request
) {
  const enabled =
    process.env.DENTAYA_AI_CLOUD_ENABLED ===
      "true" &&
    Boolean(
      process.env.OPENAI_API_KEY
    );

  if (!enabled) {
    return Response.json(
      {
        error:
          "AI_MODEL_NOT_CONFIGURED",
      },
      {
        status: 503,
      }
    );
  }

  const userId =
    await verifySupabaseUser(
      request.headers.get(
        "authorization"
      )
    );

  if (!userId) {
    return Response.json(
      {
        error:
          "UNAUTHORIZED",
      },
      {
        status: 401,
      }
    );
  }

  if (!hasJsonContentType(request)) {
    return Response.json({ error: "JSON_CONTENT_TYPE_REQUIRED" }, { status: 415 });
  }

  if (requestBodyTooLarge(request, 128_000)) {
    return Response.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
  }

  const budget = consumeRequestBudget(`ai:${userId}`, 12, 60_000);
  if (!budget.allowed) {
    return Response.json(
      { error: "RATE_LIMITED", retryAfterSeconds: budget.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(budget.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  let body:
    RequestBody;

  try {
    body =
      JSON.parse(await readBoundedBody(request, 128_000));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_BODY");
  } catch (error) {
    if(error instanceof Error && error.message==="BODY_TOO_LARGE")return Response.json({error:"REQUEST_TOO_LARGE"},{status:413});
    return Response.json(
      {
        error:
          "INVALID_JSON",
      },
      {
        status: 400,
      }
    );
  }

  const prompt =
    String(
      body.prompt ?? ""
    )
      .trim()
      ;

  if (typeof body.prompt !== "string" || prompt.length > 8000) return Response.json({error:"INVALID_PROMPT"}, {status:400});

  if (!prompt) {
    return Response.json(
      {
        error:
          "PROMPT_REQUIRED",
      },
      {
        status: 400,
      }
    );
  }

  const contextText =
    JSON.stringify(
      body.context ?? {}
    ).slice(
      0,
      12_000
    );

  const role =
    String(
      body.role ?? "unknown"
    ).slice(
      0,
      40
    );

  const action =
    String(
      body.action ?? "custom"
    ).slice(
      0,
      60
    );

  const model =
    process.env.DENTAYA_AI_MODEL ??
    "gpt-5.4";

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      60_000
    );

  try {
    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            model,
            store: false,
            ...(/^gpt-5(?:[.-]|$)/.test(model) && !model.includes('-pro') ? {reasoning:{effort:action==='diagnostic'?'low':action==='deep'||body.detail==='detailed'?'high':'low'}} : {}),
            max_output_tokens:
              action==='diagnostic'?2048:body.detail==='detailed'?10000:6000,
            instructions:
              action==='diagnostic'?'Bağlantı testi. Yalnızca TAMAM yaz.':buildAyaInstructions(action, body.detail) + "\n" + ayaCadGuidance(action) + (isLocale(body.locale)?`\nYanıt dili tercihi: ${languageInfo(body.locale).name}. Kullanıcı farklı dil istemedikçe bu dili kullan.`:""),
            input: action==='diagnostic'?'Bağlantı testi':[
              ...normalizeHistory(body.history),
              { role: "user", content: JSON.stringify({request:prompt, action, userProvidedRole:role, untrustedCaseContext:body.context ? contextText : null}) },
            ],
          }),
          signal:
            AbortSignal.any([controller.signal,request.signal]),
        }
      );

    if (!response.ok) {
      const failure=await response.json().catch(()=>null);
      const error=response.status===401?'MODEL_AUTH_INVALID':failure?.error?.code==='insufficient_quota'?'MODEL_QUOTA_EXCEEDED':response.status===404?'MODEL_NOT_AVAILABLE':response.status===403?'MODEL_ACCESS_DENIED':response.status===400?'MODEL_REQUEST_INVALID':response.status===429?'MODEL_RATE_LIMITED':'MODEL_REQUEST_FAILED';
      return Response.json({error},{status:response.status===429?429:502,headers:{'Cache-Control':'no-store'}});
    }

    const data = await response.json();

    const output = extractResponseText(data);
    if (data?.status === "incomplete") return Response.json({error:"INCOMPLETE_MODEL_RESPONSE"},{status:502});

    if (!output) {
      return Response.json(
        {
          error:
            "EMPTY_MODEL_RESPONSE",
        },
        {
          status: 502,
        }
      );
    }

    return Response.json({
      output,
      model:
        String(
          data?.model ??
          model
        ),
      mode: "model",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const aborted =
      error instanceof
        Error &&
      error.name ===
        "AbortError";

    return Response.json(
      {
        error:
          aborted
            ? "MODEL_TIMEOUT"
            : "MODEL_UNAVAILABLE",
      },
      {
        status: 502,
      }
    );
  } finally {
    clearTimeout(
      timeout
    );
  }
}

async function verifySupabaseUser(
  authorization:
    | string
    | null
) {
  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  try {
    const response =
      await fetch(
        `${url}/auth/v1/user`,
        {
          headers: {
            Authorization:
              authorization,
            apikey: key,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }
      );

    if (!response.ok) return null;
    const user = await response.json() as { id?: unknown };
    return typeof user.id === "string" && user.id ? user.id : null;
  } catch {
    return null;
  }
}

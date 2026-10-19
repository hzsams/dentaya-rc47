import { readBoundedBody } from "@/lib/server/aya-response";
import { createClient } from "@supabase/supabase-js";
import { consumeRequestBudget, hasJsonContentType } from "@/lib/server/request-guard";
export async function POST(request: Request) {
 if (!hasJsonContentType(request)) return Response.json({error:"JSON_REQUIRED"},{status:415});
 const origin=request.headers.get("origin");
 if (origin && origin !== new URL(request.url).origin) return Response.json({error:"INVALID_ORIGIN"},{status:403});
 const budget=consumeRequestBudget(`preregister:${request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous"}`,5,60_000);
 if (!budget.allowed) return Response.json({error:"RATE_LIMITED"},{status:429,headers:{"Retry-After":String(budget.retryAfterSeconds)}});
 let body;
 try { const raw=await readBoundedBody(request,4096); if (new TextEncoder().encode(raw).length>4096) return Response.json({error:"TOO_LARGE"},{status:413}); body=JSON.parse(raw); } catch { return Response.json({error:"INVALID_JSON"},{status:400}); }
 if (!body || typeof body!=="object") return Response.json({error:"INVALID_BODY"},{status:400});
 const {name,email,role,consent}=body;
 if (typeof name!=="string" || !name.trim() || name.length>100 || typeof email!=="string" || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["clinic","laboratory","other"].includes(role) || consent!=="accepted") return Response.json({error:"INVALID_FIELDS"},{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!url || !key) return Response.json({error:"REGISTRATION_UNAVAILABLE"},{status:503});
 try {
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await db.from("pre_registrations").upsert({name:name.trim(),email:email.trim().toLowerCase(),role,consent_version:"launch-v1"},{onConflict:"email",ignoreDuplicates:true});
 if (error) return Response.json({error:"REGISTRATION_UNAVAILABLE"},{status:503});
 return Response.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 } catch { return Response.json({error:"REGISTRATION_UNAVAILABLE"},{status:503}); }
}

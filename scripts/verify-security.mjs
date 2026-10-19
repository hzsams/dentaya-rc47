import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const read=(file)=>readFileSync(resolve(root,file),"utf8");
const checks=[];
const expect=(name,ok)=>checks.push({name,ok:Boolean(ok)});

const next=read("next.config.ts");
const guard=read("src/lib/server/request-guard.ts");
const ai=read("src/app/api/ai-assistant/route.ts");
const geocode=read("src/app/api/maps/geocode/route.ts");
const route=read("src/app/api/maps/route/route.ts");
const health=read("src/app/api/health/route.ts");
const env=read(".env.release.example");

expect("nosniff header",next.includes('X-Content-Type-Options')&&next.includes('nosniff'));
expect("frame deny",next.includes('X-Frame-Options')&&next.includes('DENY'));
expect("HSTS",next.includes('Strict-Transport-Security'));
expect("courier geolocation allowed only to self",next.includes('geolocation=(self)'));
expect("camera remains disabled",next.includes('camera=()'));
expect("request guard has rate budget",guard.includes('consumeRequestBudget'));
expect("request guard checks JSON",guard.includes('hasJsonContentType'));
expect("request guard checks content length",guard.includes('requestBodyTooLarge'));
expect("AYA authenticated",ai.includes('verifySupabaseUser'));
expect("AYA rate limited",ai.includes('consumeRequestBudget(`ai:${userId}`'));
expect("AYA body capped",ai.includes('requestBodyTooLarge(request, 128_000)') && ai.includes('readBoundedBody(request, 128_000)'));
expect("geocode authenticated",geocode.includes('supabase.auth.getUser(token)'));
expect("geocode admin restricted",geocode.includes('["owner", "admin"]'));
expect("geocode rate limited",geocode.includes('consumeRequestBudget(`geocode:${authData.user.id}`'));
expect("routes authenticated",route.includes('supabase.auth.getUser(token)'));
expect("routes rate limited",route.includes('consumeRequestBudget(`route:${authData.user.id}`'));
expect("health details auth-gated",health.includes('...(authenticated ? { checks } : {})'));
expect("health no-store",health.includes('no-store, max-age=0'));
expect("release env has no public service role assignment",!/^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY\s*=/m.test(env));
expect("release env has no public OpenAI key",!/^NEXT_PUBLIC_OPENAI_API_KEY\s*=/m.test(env));
expect("server maps keys are not public",!/^NEXT_PUBLIC_GOOGLE_MAPS_(?:GEOCODING|ROUTES)_KEY\s*=/m.test(env));

const failed=checks.filter(x=>!x.ok);
for(const item of checks) console.log(`${item.ok?"PASS":"FAIL"} · ${item.name}`);
if(failed.length){console.error(`Security verification failed: ${failed.length}/${checks.length}`);process.exit(1);}
console.log(`Security verification PASS (${checks.length}/${checks.length})`);

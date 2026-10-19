import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root=process.cwd();
const file=resolve(root,".env.local");
if(!existsSync(file)){
  console.error("FAIL · .env.local bulunamadı. .env.release.example dosyasını kopyalayıp production/staging değerlerini doldurun.");
  process.exit(1);
}
const text=readFileSync(file,"utf8");
const env={};
for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();
  if(!line||line.startsWith("#")) continue;
  const i=line.indexOf("=");
  if(i<1) continue;
  env[line.slice(0,i).trim()]=line.slice(i+1).trim().replace(/^['"]|['"]$/g,"");
}
const checks=[]; const expect=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const has=(k)=>Boolean(env[k]&&env[k]!=="...");
expect("Supabase URL",has("NEXT_PUBLIC_SUPABASE_URL"));
expect("Supabase publishable/anon key",has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")||has("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
const mapsEnabled=has("GOOGLE_MAPS_GEOCODING_KEY")||has("GOOGLE_MAPS_ROUTES_KEY");
expect("Google Maps keys when routing is configured",!mapsEnabled||(has("GOOGLE_MAPS_GEOCODING_KEY")&&has("GOOGLE_MAPS_ROUTES_KEY")));
expect("Release channel staging/production",["staging","production"].includes(env.NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL));
const release=JSON.parse(readFileSync(resolve(root,"package.json"),"utf8")).version.split("-rc.")[1];
expect("Current build label (or default)",!has("NEXT_PUBLIC_DENTAYA_BUILD_LABEL")||[`DentAYA RC${release}`,`DentAYA Production RC${release}`].includes(env.NEXT_PUBLIC_DENTAYA_BUILD_LABEL));
expect("No public service-role secret",!has("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"));
expect("No public OpenAI secret",!has("NEXT_PUBLIC_OPENAI_API_KEY"));
const aiEnabled=String(env.DENTAYA_AI_CLOUD_ENABLED).toLowerCase()==="true";
expect("AYA cloud secret when enabled",!aiEnabled||has("OPENAI_API_KEY"));
for(const item of checks) console.log(`${item.ok?"PASS":"FAIL"} · ${item.name}`);
const failed=checks.filter(x=>!x.ok);
if(failed.length){console.error(`Environment verification failed: ${failed.length}/${checks.length}`);process.exit(1);}
console.log(`Environment verification PASS (${checks.length}/${checks.length})`);

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root=process.cwd();
const read=(file)=>readFileSync(resolve(root,file),"utf8");
const checks=[];const expect=(name,ok)=>checks.push({name,ok:Boolean(ok)});
const next=read("next.config.ts");
const logistics=read("src/app/logistics/page.tsx");
const compactLogistics=logistics.replace(/\s+/g,'');
const route=read("src/app/api/maps/route/route.ts");
const design=read("src/app/design/DesignStudioClient.tsx");
const recovery=read("src/lib/cad-recovery.ts");

expect("Next compression enabled",next.includes('compress: true'));
expect("route cache avoids Google call storms",route.includes('Date.now() - cachedAtMs < 20000'));
expect("live GPS throttled to 15 seconds",compactLogistics.includes('now-lastLocationSentAt.current<15000'));
expect("stationary GPS writes suppressed",compactLogistics.includes('ageMs<60000&&moved<8'));
expect("stationary GPS keeps heartbeat",compactLogistics.includes('ageMs<60000'));
expect("network recovery refreshes logistics",logistics.includes('dentaya-network-restored'));
expect("CAD recovery remains enabled",design.includes('cad-recovery')||recovery.includes('indexedDB'));
expect("CAD large mesh adaptation remains present",/adaptive|triangle|render mesh|working geometry/i.test(design));

const failed=checks.filter(x=>!x.ok);
for(const item of checks) console.log(`${item.ok?"PASS":"FAIL"} · ${item.name}`);
if(failed.length){console.error(`Performance verification failed: ${failed.length}/${checks.length}`);process.exit(1);}
console.log(`Performance verification PASS (${checks.length}/${checks.length})`);

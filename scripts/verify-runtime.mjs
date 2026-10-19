import { execFileSync } from "node:child_process";
import { supportsNode } from "./package-windows.mjs";

const checks=[];
const expect=(name,ok,detail="")=>checks.push({name,ok:Boolean(ok),detail});
const major=(v)=>Number(String(v).replace(/^v/,"").split(".")[0]||0);
const nodeVersion=process.version;
let npmVersion="unknown";
try {
  const cmd=process.platform==="win32"?"npm.cmd":"npm";
  npmVersion=execFileSync(cmd,["--version"],{encoding:"utf8"}).trim();
} catch {}
expect("Node.js 22.12+",supportsNode(nodeVersion),nodeVersion);
expect("npm 11+",major(npmVersion)>=11,npmVersion);
for(const item of checks) console.log(`${item.ok?"PASS":"FAIL"} · ${item.name} · ${item.detail}`);
const failed=checks.filter(x=>!x.ok);
if(failed.length){
  console.error("Runtime verification failed. DentAYA requires Node.js 22.12+ and npm 11+.");
  process.exit(1);
}
console.log(`Runtime verification PASS (${checks.length}/${checks.length})`);

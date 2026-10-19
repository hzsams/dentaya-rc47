import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
const rc = /^1\.0\.0-rc\.(\d+)$/.exec(version)?.[1];
if (!rc) throw new Error("Invalid DentAYA release version");
const file = resolve(root, ".env.local");
const text = readFileSync(file, "utf8");
const eol = text.includes("\r\n") ? "\r\n" : "\n";
const lines = text.split(/\r?\n/);
const label = `NEXT_PUBLIC_DENTAYA_BUILD_LABEL=DentAYA RC${rc}`;
let found = false;
const updated = lines.map(line => {
  if (!/^\s*NEXT_PUBLIC_DENTAYA_BUILD_LABEL\s*=/.test(line)) return line;
  found = true;
  return label;
});
if (!found) {
  if (updated.at(-1) === "") updated.pop();
  updated.push(label, "");
}
const result = updated.join(eol);
if (result !== text) writeFileSync(file, result, "utf8");
console.log(`DentAYA RC${rc} release label prepared.`);

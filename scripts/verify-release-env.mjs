import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";

const packageText = fs.readFileSync("package.json", "utf8");
const release = JSON.parse(packageText).version.split("-rc.")[1];
const prepare = path.resolve("scripts/prepare-release-env.mjs");
const verify = path.resolve("scripts/verify-env.mjs");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dentaya-release-env-"));
try {
  fs.writeFileSync(path.join(dir, "package.json"), packageText);
  const kept = ["# Keep configuration", "NEXT_PUBLIC_SUPABASE_URL=https://example.invalid", "NEXT_PUBLIC_SUPABASE_ANON_KEY=TEST-ANON-KEY", "SUPABASE_SERVICE_ROLE_KEY=TEST-NOT-A-REAL-KEY", "DENTAYA_AI_CLOUD_ENABLED=false", "NEXT_PUBLIC_DENTAYA_RELEASE_CHANNEL=staging"];
  for (const newline of ["\n", "\r\n"]) {
    for (const present of [true, false]) {
      fs.writeFileSync(path.join(dir, ".env.local"), [...kept, ...(present ? ['NEXT_PUBLIC_DENTAYA_BUILD_LABEL="DentAYA RC26"'] : []), ""].join(newline));
      execFileSync(process.execPath, [prepare], { cwd: dir });
      const result = fs.readFileSync(path.join(dir, ".env.local"), "utf8");
      assert.equal(result, [...kept, `NEXT_PUBLIC_DENTAYA_BUILD_LABEL=DentAYA RC${release}`, ""].join(newline));
      execFileSync(process.execPath, [prepare], { cwd: dir });
      assert.equal(fs.readFileSync(path.join(dir, ".env.local"), "utf8"), result);
      assert.equal(spawnSync(process.execPath, [verify], { cwd: dir }).status, 0, "Prepared label and optional services must pass environment checks");
    }
  }
  const example = fs.readFileSync(".env.release.example", "utf8");
  assert.ok(example.includes(`NEXT_PUBLIC_DENTAYA_BUILD_LABEL=DentAYA RC${release}`));
  console.log("PASS: old release label migration, preserved connection settings, LF/CRLF, repeat execution and environment validation.");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

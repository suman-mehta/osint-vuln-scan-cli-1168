import test from "node:test";
import assert from "node:assert/strict";
import { writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const cliPath = resolve("src", "index.js");

test("detect eval usage in JavaScript file", async (t) => {
  const tmpFile = resolve("tmp-test.js");
  await writeFile(tmpFile, "const a = eval(\"2+2\");");
  const result = spawnSync(process.execPath, [cliPath, tmpFile], { encoding: "utf-8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Potential vulnerabilities/);
  assert.match(result.stdout, /eval\(\)/);
  await rm(tmpFile);
});

test("handle non‑existent file gracefully", async (t) => {
  const result = spawnSync(process.execPath, [cliPath, "nonexistent.js"], { encoding: "utf-8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /File not found/);
});
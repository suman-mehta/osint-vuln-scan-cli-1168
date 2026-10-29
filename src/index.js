#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { request } from "node:https";
import { URL } from "node:url";
import { exit } from "node:process";

function printUsage() {
  console.log("Usage: osint-vuln-scan <target>");
  console.log("  <target> can be a URL (http/https) or a local file path.");
}

async function scanFile(filePath) {
  const content = await readFile(filePath, "utf-8");
  const findings = [];
  const patterns = [
    { regex: /\beval\s*\(/, description: "Use of eval() can lead to code injection" },
    { regex: /child_process\.exec\s*\(/, description: "Unvalidated exec() may spawn arbitrary commands" },
    { regex: /crypto\.createHash\s*\(\s*['"]md5['"]\s*\)/, description: "MD5 is cryptographically broken" }
  ];
  for (const { regex, description } of patterns) {
    if (regex.test(content)) {
      findings.push(`${description}`);
    }
  }
  return findings;
}

function fetchOSINT(targetUrl) {
  return new Promise((resolvePromise, reject) => {
    const url = new URL(targetUrl);
    const req = request(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolvePromise({
          status: res.statusCode,
          headers: res.headers,
          length: data.length
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printUsage();
    exit(1);
  }
  const target = args[0];
  if (target.startsWith("http://") || target.startsWith("https://")) {
    try {
      const result = await fetchOSINT(target);
      console.log("OSINT Summary:");
      console.log(`Status: ${result.status}`);
      console.log(`Content length: ${result.length}`);
    } catch (e) {
      console.error("Error fetching URL:", e.message);
      exit(1);
    }
  } else {
    const resolved = resolve(target);
    if (!existsSync(resolved)) {
      console.error("File not found:", resolved);
      exit(1);
    }
    const findings = await scanFile(resolved);
    if (findings.length === 0) {
      console.log("No obvious vulnerabilities found.");
    } else {
      console.log("Potential vulnerabilities:");
      findings.forEach((f) => console.log(`- ${f}`));
    }
  }
  exit(0);
}

await main();
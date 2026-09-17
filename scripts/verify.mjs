#!/usr/bin/env node
// The loop surface: runs the three acceptance-criteria checks from SPEC.md
// against a deployed URL, reports pass/fail per criterion, and exits
// non-zero if any threshold is missed. Meant to be run, fixed against,
// and re-run until clean — not read once and trusted.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.argv[2];
if (!url) {
  console.error("Usage: npm run verify -- <deployed-url>");
  process.exit(1);
}

function findLocalChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const cacheRoot = join(root, ".chrome-cache", "chrome");
  if (!existsSync(cacheRoot)) return null;
  for (const dir of readdirSync(cacheRoot)) {
    const candidate = join(cacheRoot, dir, "chrome-linux64", "chrome");
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

const results = [];
let allPassed = true;
function record(label, passed, detail) {
  results.push({ label, passed, detail });
  if (!passed) allPassed = false;
}

// 1. Markup validity — the built output (dist/index.html is what content-agent's
// content/about.html + content/projects.md get assembled into by scripts/build.mjs;
// run `npm run build` first), not the deployed copy.
console.log(`[1/3] html-validate dist/index.html`);
const hv = spawnSync("npx", ["html-validate", "--formatter", "json", "dist/index.html"], {
  cwd: root,
  encoding: "utf8",
});
let hvErrorCount = "?";
try {
  const report = JSON.parse(hv.stdout || "[]");
  hvErrorCount = report.reduce((sum, f) => sum + (f.errorCount || 0), 0);
} catch {
  hvErrorCount = hv.status === 0 ? 0 : "?";
}
record("dist/index.html", hvErrorCount === 0, `${hvErrorCount} errors`);

// 2. Link integrity — the deployed page, recursively.
console.log(`[2/3] linkinator ${url} --recurse`);
const li = spawnSync("npx", ["linkinator", url, "--recurse", "--format", "json"], {
  encoding: "utf8",
});
let totalLinks = "?";
let brokenLinks = "?";
try {
  const parsed = JSON.parse(li.stdout);
  const links = parsed.links || parsed;
  totalLinks = links.length;
  brokenLinks = links.filter((l) => l.state === "BROKEN").length;
} catch {
  totalLinks = "?";
  brokenLinks = li.status === 0 ? 0 : "?";
}
record(`Checked ${totalLinks} links`, brokenLinks === 0, `${brokenLinks} broken`);

// 3. Accessibility — the deployed page, via a locally-downloaded headless
// Chrome (this environment has no system Chrome; run `npm run setup:chrome` first).
console.log(`[3/3] lighthouse ${url} --only-categories=accessibility`);
const chromePath = findLocalChrome();
let a11yScore = "?";
if (!chromePath) {
  record("Accessibility score", false, "no local Chrome found — run `npm run setup:chrome`");
} else {
  const reportPath = join(root, ".lighthouse-report.json");
  // chrome-launcher mis-detects WSL and falls through into its win32 tmp-dir
  // branch, which creates a literally-named "C:\Users\...\lighthouse.N"
  // folder relative to cwd instead of a real temp dir. Passing an explicit
  // --user-data-dir skips that broken auto-detection entirely.
  const profileDir = join(tmpdir(), `lighthouse-profile-${process.pid}`);
  const lh = spawnSync(
    "npx",
    [
      "lighthouse",
      url,
      "--only-categories=accessibility",
      "--output=json",
      `--output-path=${reportPath}`,
      `--chrome-flags=--headless=new --no-sandbox --disable-gpu --user-data-dir=${profileDir}`,
      "--quiet",
    ],
    { cwd: root, encoding: "utf8", env: { ...process.env, CHROME_PATH: chromePath } }
  );
  try {
    const lr = JSON.parse(readFileSync(reportPath, "utf8"));
    a11yScore = Math.round(lr.categories.accessibility.score * 100);
  } catch {
    a11yScore = "?";
  }
  rmSync(profileDir, { recursive: true, force: true });
  record("Accessibility score", typeof a11yScore === "number" && a11yScore >= 90, `${a11yScore}`);
}

console.log("");
for (const r of results) {
  const label = r.label.padEnd(40, ".");
  console.log(`${label} ${r.detail}${r.passed ? "" : "  [FAIL]"}`);
}
console.log("");
console.log(allPassed ? "PASS — all acceptance criteria met" : "FAIL — see above");
process.exit(allPassed ? 0 : 1);

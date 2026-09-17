// One-time setup: this environment has no system Chrome/Chromium, and no
// `unzip` binary either (which @puppeteer/browsers needs to extract the
// download unless the optional `yauzl` dependency is present — already
// listed in package.json devDependencies for that reason).
//
// Downloads a pinned, known-good Chrome build into .chrome-cache/ (gitignored)
// for Lighthouse to drive. Run once: `npm run setup:chrome`.
import { install, Browser, resolveBuildId } from "@puppeteer/browsers";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, "..", ".chrome-cache");
const PINNED_BUILD = "131.0.6778.204";

const buildId = await resolveBuildId(Browser.CHROME, "linux", PINNED_BUILD).catch(() => PINNED_BUILD);

const result = await install({ browser: Browser.CHROME, buildId, cacheDir });
console.log("Chrome installed at:", result.executablePath);
console.log("Set CHROME_PATH to this path, or just use `npm run verify` which does it for you.");

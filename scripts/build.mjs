#!/usr/bin/env node
// The "graph" wiring: assembles the output the three scoped agents' files
// feed into, without any of them needing to touch each other's files.
//
//   content/about.html  \
//   content/projects.md  >--> dist/index.html   (this script)
//   template.html        /
//   styles.css + tailwind.config.js -----------> dist/styles.css  (tailwind CLI)
//
// Owned by neither content-agent, style-agent, nor deploy-agent — it's the
// shared contract between them (see SPEC.md "Agent scopes & the shared
// contract"). Changing the placeholder tokens or the projects.md line
// format here requires updating that contract too.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distDir = join(root, "dist");

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- projects.md -> <section> markup -----------------------------------
// Format (one per line): - **title** — one-line description — https://link
function renderProjects(md) {
  const lines = md.split("\n").filter((l) => l.trim().startsWith("- **"));
  const items = lines.map((line) => {
    const match = line.match(/-\s+\*\*(.+?)\*\*\s+—\s+(.+?)\s+—\s+(\S+)\s*$/);
    if (!match) {
      throw new Error(`content/projects.md line doesn't match the expected format: ${line}`);
    }
    const [, title, description, link] = match;
    return `      <li>
        <h3><a href="${escapeHtml(link)}">${escapeHtml(title)}</a></h3>
        <p>${escapeHtml(description)}</p>
      </li>`;
  });
  return `  <section aria-labelledby="projects-heading">
    <h2 id="projects-heading">Projects</h2>
    <ul class="project-list">
${items.join("\n")}
    </ul>
  </section>`;
}

mkdirSync(distDir, { recursive: true });

const template = readFileSync(join(root, "template.html"), "utf8");
const about = readFileSync(join(root, "content", "about.html"), "utf8").trim();
const projectsMd = readFileSync(join(root, "content", "projects.md"), "utf8");
const projectsHtml = renderProjects(projectsMd);

const html = template
  .replace("<!--CONTENT:ABOUT-->", about)
  .replace("<!--CONTENT:PROJECTS-->", projectsHtml);

writeFileSync(join(distDir, "index.html"), html);
console.log("Wrote dist/index.html");

if (existsSync(join(root, ".nojekyll"))) {
  copyFileSync(join(root, ".nojekyll"), join(distDir, ".nojekyll"));
}

// --- Tailwind build ------------------------------------------------------
execFileSync(
  "npx",
  ["tailwindcss", "-i", join(root, "styles.css"), "-o", join(distDir, "styles.css"), "--minify"],
  { cwd: root, stdio: "inherit" }
);
console.log("Wrote dist/styles.css");

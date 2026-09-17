# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A spec-driven personal site for Vaijanath Ruge, built strictly to `SPEC.md`, deployed as a GitHub
Pages project site at `github.com/VaijanathR/build4-portfolio`, live at
https://vaijanathr.github.io/build4-portfolio/. It's Build3 (content + automated verification loop)
with the build decomposed across three filesystem-scoped subagents so parallel edits don't collide.
Read `SPEC.md`'s "Agent scopes & the shared contract" section before editing anything.

## Agent scopes — do not cross them

| Agent | Owns (only these) | Never touches |
|---|---|---|
| content-agent | `content/about.html`, `content/projects.md` | `styles.css`, `tailwind.config.js`, `.github/workflows/*`, `template.html`, `scripts/*` |
| style-agent | `styles.css`, `tailwind.config.js` | anything under `content/`, `template.html`, `scripts/*` |
| deploy-agent | `.github/workflows/pages.yml` | `content/`, `styles.css`, `tailwind.config.js` |

If you're operating as one of these roles, stay inside your row. If you're the orchestrator
(deciding what each scoped agent should do, or changing the shared wiring itself), you own
`template.html`, `scripts/build.mjs`, and `package.json` — changing those is a cross-cutting
decision that affects all three scopes, not something to make inside a single agent's scope.

The three scopes work without coordinating directly because of a fixed contract (full detail in
`SPEC.md`): `template.html`'s two placeholder comments, `content/projects.md`'s exact line format,
`content/about.html`'s required section ids/classes, and the class names `style-agent`'s CSS must
cover. Renaming a class or changing the placeholder syntax breaks that contract for the other two
scopes — treat it as a breaking change, not a local styling choice.

## Build & the verification loop

```bash
npm install
npm run build                                 # dist/index.html + dist/styles.css from the 3 scopes
npm run setup:chrome                          # one-time
npm run verify -- <deployed-or-local-url>
```

`scripts/build.mjs` (shared, not scope-owned) assembles `template.html` + `content/about.html` +
`content/projects.md` into `dist/index.html`, and runs the Tailwind CLI against `styles.css` +
`tailwind.config.js` to produce `dist/styles.css`. `scripts/verify.mjs` (unchanged from Build3) then
runs `html-validate` on `dist/index.html`, `linkinator --recurse` and `lighthouse
--only-categories=accessibility` against the given URL, and exits non-zero if anything fails SPEC.md's
thresholds. Treat a non-zero exit as the work not being done: fix what it reports, re-run, repeat.

**No system Chrome is preinstalled in this environment**, and there's no `unzip` binary either (which
`@puppeteer/browsers` needs unless the `yauzl` npm package is present — already a devDependency).
`npm run setup:chrome` downloads a pinned Chrome build into `.chrome-cache/` (gitignored).
`scripts/verify.mjs` finds it automatically, or respects a `CHROME_PATH` env var.

Lighthouse's Chrome launcher has a known WSL bug in this environment: it mis-detects the platform
and falls through into Windows tmp-dir logic, creating a literally-named `C:\Users\...\lighthouse.N`
folder relative to cwd. `scripts/verify.mjs` already works around this with an explicit
`--user-data-dir` chrome flag — if you touch that script, keep the workaround.

## Structure

- `template.html` — page skeleton with `<!--CONTENT:ABOUT-->` / `<!--CONTENT:PROJECTS-->` markers
  and the static header/footer/Contact section (not scope-owned by any agent)
- `content/about.html`, `content/projects.md` — content-agent's scope, sourced from `resume.pdf`
  (gitignored locally — has a phone number/photo — never committed or linked from the page)
- `styles.css`, `tailwind.config.js` — style-agent's scope: dark background, exactly one accent
  color (light blue, `#7ec8e3`), must render with no horizontal overflow at 375px
- `.github/workflows/pages.yml` — deploy-agent's scope: builds with `npm ci && npm run build`,
  deploys `dist/` via `actions/upload-pages-artifact` + `actions/deploy-pages`
- `scripts/build.mjs` — the shared wiring (see above)
- `scripts/verify.mjs`, `scripts/setup-chrome.mjs` — carried over from Build3 unchanged
- `dist/` — build output, gitignored, never committed; CI rebuilds it fresh on every deploy

## Deploying

Push to `main`; GitHub Actions (not the legacy branch-based Pages source Build1–3 used) builds and
deploys automatically. Check the workflow run with:

```bash
gh run list --repo VaijanathR/build4-portfolio --limit 5
```

Then run `npm run verify -- https://vaijanathr.github.io/build4-portfolio/` against the live URL —
a push is not "done" until that passes.

## Related

`../CH3Build1`, `../CH3Build2`, `../CH3Build3` are separate, independent sites for the same person
(earlier iterations — single-file site, then spec+verification, now scoped multi-agent). Not linked
to each other or to this one; edit independently.

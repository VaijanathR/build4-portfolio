# Build4 — the graph surface

Everything from Build3 (spec-driven content, an automated verification loop) plus work decomposed
across three filesystem-scoped subagents so parallel edits to the same site don't collide:

| Agent | Owns | Scope |
|---|---|---|
| content-agent | `content/about.html`, `content/projects.md` | Content only |
| style-agent | `styles.css`, `tailwind.config.js` | Styling only |
| deploy-agent | `.github/workflows/pages.yml` | Deployment config only |

`template.html`, `scripts/build.mjs`, and `package.json` are the shared wiring between those scopes
— see `SPEC.md`'s "Agent scopes & the shared contract" section for the exact interface (placeholder
tokens, `projects.md` line format, required class names) that lets the three agents work without
coordinating directly.

## Build & verify

```bash
npm install
npm run build                                  # assembles dist/index.html + dist/styles.css
npm run setup:chrome                           # one-time
npm run verify -- https://vaijanathr.github.io/build4-portfolio/
```

`npm run verify` runs the same three checks as Build3 (`html-validate`, `linkinator --recurse`,
`lighthouse --only-categories=accessibility`) against the deployed URL and reports pass/fail per
`SPEC.md`'s thresholds.

## Structure

- `template.html` — page skeleton with `<!--CONTENT:ABOUT-->` / `<!--CONTENT:PROJECTS-->` markers
- `content/about.html`, `content/projects.md` — content-agent's scope
- `styles.css`, `tailwind.config.js` — style-agent's scope (Tailwind, dark background, one accent)
- `.github/workflows/pages.yml` — deploy-agent's scope (build + deploy to Pages via Actions)
- `scripts/build.mjs` — assembles `dist/` from the above; not owned by any single agent
- `scripts/verify.mjs`, `scripts/setup-chrome.mjs` — carried over from Build3 unchanged
- `resume.pdf` (gitignored — has a phone number/photo) — source for About/Experience content

## Deploying

GitHub Actions builds on every push to `main` and deploys `dist/` to Pages (not the legacy
branch-based source Build1–3 used). Re-run `npm run verify -- <live-url>` after every deploy before
calling it done.

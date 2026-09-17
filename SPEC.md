# SPEC.md
## Sections
- About: two paragraphs, pulled from resume.pdf, not invented
- Experience: full career timeline, pulled from resume.pdf, not invented
- Projects: title + one-line description + link, from projects.md
- Contact: real email address, no contact form
## Visual constraints
- Single page, dark background, one accent color (lightblue)
- Must render correctly on a 375px-wide mobile screen
## Acceptance criteria
- Every link in Projects resolves (no 404s)
- Lighthouse accessibility score >= 90
- Deployed URL returns the page within 2 seconds

## Verification (automated)

The three acceptance criteria above are not self-certified — they are checked by running these
exact commands against the deployed URL, and the build is not "done" until all three pass:

```
$ npx html-validate dist/index.html
$ npx linkinator <deployed-url> --recurse
$ npx lighthouse <deployed-url> --only-categories=accessibility
```

Pass thresholds:

| Check | Command | Pass condition |
|---|---|---|
| Markup validity | `html-validate dist/index.html` | 0 errors |
| Link integrity | `linkinator <url> --recurse` | 0 broken links |
| Accessibility | `lighthouse <url> --only-categories=accessibility` | score >= 90 |

`npm run verify -- <deployed-url>` runs all three and fails (non-zero exit) if any threshold is
missed. This is the loop surface: run verify, fix whatever it reports, re-run verify, repeat until
clean — inside the session, not after a visitor finds the problem.

## Agent scopes & the shared contract (the graph surface)

Build4 decomposes editing across three filesystem-scoped agents so parallel work on the same site
doesn't collide. Each agent only ever touches files inside its own scope:

| Agent | Owns (only these) | Scope |
|---|---|---|
| content-agent | `content/about.html`, `content/projects.md` | Content only. No CSS, no Tailwind config, no workflow files. |
| style-agent | `styles.css`, `tailwind.config.js` | Styling only. No page content, no markup structure changes. |
| deploy-agent | `.github/workflows/pages.yml` | Deployment config only. Doesn't touch content or style. |

None of the three owns `template.html`, `scripts/build.mjs`, or `package.json` — those are the
shared wiring between the scopes (see `scripts/build.mjs`'s header comment) and changing them is
an orchestrator-level decision, not something any single scoped agent should do unilaterally.

**The contract that lets them not coordinate directly:**

- `template.html` has two placeholder comments, `<!--CONTENT:ABOUT-->` and `<!--CONTENT:PROJECTS-->`,
  that `scripts/build.mjs` replaces with the contents of `content/about.html` and a `<section>`
  rendered from `content/projects.md` respectively.
- `content/projects.md` lines must match: `- **title** — one-line description — https://link`
  (em dash `—` as separator) — `scripts/build.mjs` parses this exact shape.
- `content/about.html` must contain two `<section>` elements using these exact ids/classes (styled
  by `style-agent`'s CSS, never renamed by `content-agent`):
  `<section aria-labelledby="about-heading"><h2 id="about-heading">` and
  `<section aria-labelledby="experience-heading"><h2 id="experience-heading">` with an
  `<ol class="experience-list">` of `<li>` entries, each with an `<h3>`, a
  `<p class="exp-meta">` (dates), and a `<p>` (description).
- `style-agent`'s `styles.css` is a Tailwind entry file (`@tailwind base/components/utilities`)
  that must style every class name already in use across `template.html` and `content/about.html`
  — `site-header`, `site-name`, `skip-link`, `page-title`, `page-subtitle`, `about-heading` section,
  `experience-heading` section + `experience-list` + `exp-meta`, `projects-heading` section +
  `project-list` (built by `scripts/build.mjs`), `contact-heading` section + `contact-email`,
  `site-footer` — without introducing new class names content-agent would need to adopt.
  `tailwind.config.js`'s `content` globs must include `template.html` and `content/**/*.html`.
- `deploy-agent`'s workflow builds with `npm ci && npm run build` (output: `dist/`) and deploys
  `dist/` to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages` — not the
  legacy branch-based Pages source.

Each agent reports back a compressed summary of what it changed, inside its own scope, on its own
branch/worktree — not a narration of the whole site.

# Syed Moiz: DevOps & Platform Engineering portfolio

A static portfolio for DevOps, platform engineering, SRE and AWS infrastructure work, hosted on Vercel.

- **Homepage:** full-screen photo hero with a centred glass card and a cursor-following water ripple; about, find me online, certifications, skills & tech superpowers, "How I work" pipeline, experience & education, a project image carousel and contact.
- **Page-wide tile grid:** tiles light up along the cursor path (mouse users only; off for touch and reduced motion).
- **`/projects/`:** every public project, filterable by engineering area, with a status badge on each card.
- **`/projects/<slug>/`:** case studies with an interactive architecture diagram.
- **Chaos Mode:** an incident simulation in which visitors resolve a simulated outage. It is always labelled as a simulation.

## Stack

| Concern | Choice |
|---|---|
| Framework | Astro 7, fully static output |
| Fonts | Jost, Inter, JetBrains Mono, downloaded at build time and self-hosted (Astro fonts API) |
| Images | `astro:assets` → AVIF/WebP at several widths. Sources: `src/assets/images/hero-podium.png`, `portrait.png` (copies of the photos in `Picture/`, which is git-ignored) |
| Security | Per-page hash-based CSP `<meta>` (Astro `security.csp`) plus header policy in `customHttp.yml` |
| Tests | Playwright (desktop + mobile), axe accessibility in dark and light themes |
| Hosting | Vercel, configured in `vercel.json` (build, output folder and security headers) |

No backend, database, analytics or third-party runtime requests.

## Project structure

```
src/
  content/projects.json     All project data (the only file to edit for projects)
  content.config.ts         Schema for projects.json
  data/profile.ts           Profile, experience, certifications, community
  data/taxonomy.ts          Status and domain labels, sorting
  components/               Header, Footer, SectionHead, ProjectCard, ProjectThumb, ArchDiagram, OperateFlow, ChaosConsole
  pages/                    index, projects/index, projects/[slug]
  scripts/interactions.ts   Preloader, reveal, scroll-spy, theme, menu, typed role, carousel, filters, diagrams
  scripts/ripple.ts         Hero water-ripple simulation
  scripts/tiles.ts          Page-wide cursor tile grid
  scripts/chaos.ts          Chaos Mode simulation
  styles/global.css         Design system
scripts/check-content.mjs   Post-build content and secret scan
tests/site.spec.ts          End-to-end tests
```

## Résumé download

Put the PDF in `public/` and set `profile.resume` in `src/data/profile.ts` (for example `'/Syed-Moiz-Resume.pdf'`). The hero's **Download CV** button appears only when this is set.

## Editing projects

Projects live in `src/content/projects.json` and are validated by the schema in `src/content.config.ts` at build time.

| Field | Notes |
|---|---|
| `tier` | `featured` and `secondary` appear in the homepage carousel (featured first); `archive` is on `/projects/` only |
| `order` | Sort order within a tier |
| `status` | `production`, `deployed-demo`, `prototype`, `hackathon`, `challenge`, `learning`, `concept`, `unconfirmed`. Always shown. |
| `links.repo` / `links.demo` / `links.video` / `links.docs` | Separate fields. Only filled links render; empty ones are hidden. |
| `unconfirmedLinks` | Known URLs that could not be verified. Stored but **never rendered**. Move a URL into `links` once you confirm it works. |
| `caseStudy` | Adds a `/projects/<id>/` page: problem, approach, architecture diagram, decisions, security, deployment, results (each with a source), limitations. |
| `published` | `false` hides a project everywhere. |

Each project is one JSON file in `src/content/projects/` (the file name is the URL slug); all other site text (profile and hero, about, section headings, skills, How I work, experience, education, community, research, certifications) lives in JSON files in `src/data/`. Everything is edited in the admin at `/lock` (Keystatic): sign in with GitHub, edit, save, and the save is committed to this repository, which redeploys the site. Only GitHub accounts with write access to the repository can save. Setup is in `docs/DEPLOYMENT.md`.

## Local development

Requires Node.js 22.23.4 or later.

```bash
npm ci
npm run dev          # http://localhost:4321
npm run build        # static output in dist/
npm run check:content
npm run test:install # once: downloads Chromium for Playwright
npm test             # builds are served with `astro preview`
```

`npm run ci` runs build, content check and tests in order.

## Content rules

- No invented roles, metrics, results or credentials. Results in case studies cite the repository file they came from.
- Certifications link to issuer verification pages only when the link was verified.
- The content check fails the build if the output contains placeholder links, unconfirmed links, AWS access keys, GitHub tokens, private keys, ARNs with account IDs, or VPC/subnet/security-group IDs.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment.

# Deployment

The site is static and is hosted on **Vercel**. `vercel.json` sets the build command (`npm run build && npm run check:content`), the `dist` output folder and the security headers.

## Vercel

1. Push the repository to GitHub (below).
2. On vercel.com: **Add New > Project**, import the repository. Vercel reads `vercel.json`; no settings need changing.
3. Optional: set the environment variable `SITE_URL` to the production URL (for example `https://<project>.vercel.app`) for absolute canonical and social-preview URLs, then redeploy.

Every push to `main` deploys to production; other branches get preview URLs.

The Amplify instructions below are kept as an alternative.

## 1. Push the repository to GitHub

```bash
git init
git add .
git commit -m "Portfolio"
git branch -M main
git remote add origin https://github.com/SYMOIZ/<repo-name>.git
git push -u origin main
```

Then set `profile.portfolioRepo` in `src/data/profile.ts` to the repository URL so the footer links to it.

`.gitignore` already excludes `node_modules/`, `dist/`, `.astro/`, test output and `.env*`.

## 2. Create the Amplify app

1. AWS Console → **AWS Amplify** → **Create new app** → **GitHub**, then authorise and pick the repository and `main`.
2. Amplify detects `amplify.yml` in the repo root. Keep it:
   - `preBuild`: installs Node 22 with `nvm`, then `npm ci`.
   - `build`: `npm run build`, then `npm run check:content`, which fails the deploy on placeholder or unconfirmed links or secret-like strings.
   - Artifacts: `dist/`.
3. **Environment variables** (optional): `SITE_URL` = the app URL Amplify gives you, for example `https://main.<app-id>.amplifyapp.com`. It enables absolute canonical and social-preview (`og:image`) URLs. Redeploy after setting it.
4. **Custom headers:** Amplify reads `customHttp.yml` from the repo root. If the console asks you to manage headers there instead, paste the same YAML into **Hosting → Custom headers**. Headers set:
   - Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy and Permissions-Policy.
   - A header CSP with `frame-ancestors`, `object-src`, `base-uri` and `upgrade-insecure-requests`. Each page also carries its own hash-based CSP `<meta>` for scripts and styles.
   - Long-lived caching for fingerprinted `/_astro/*` assets.
5. Save and deploy. The first build downloads fonts and optimises images, which takes a few minutes.

### Alternative: deploy without GitHub (manual upload)

If you prefer not to connect GitHub, Amplify can host a zip of `dist/`. Run these after `aws sts get-caller-identity` works:

```bash
npm run build && npm run check:content
```
```bash
cd dist && powershell -Command "Compress-Archive -Path * -DestinationPath ../site.zip -Force" && cd ..
```
```bash
aws amplify create-app --name syed-moiz-portfolio --region us-east-1
```
```bash
aws amplify create-branch --app-id <APP_ID> --branch-name main --region us-east-1
```
```bash
aws amplify create-deployment --app-id <APP_ID> --branch-name main --region us-east-1
```
Upload `site.zip` to the `zipUploadUrl` from that output (`curl -T site.zip "<zipUploadUrl>"`), then:
```bash
aws amplify start-deployment --app-id <APP_ID> --branch-name main --job-id <JOB_ID> --region us-east-1
```
With manual deploys, `customHttp.yml` is not read from a repository, so paste its contents into **Hosting → Custom headers** in the console.

## 3. Verify the deployment

- Open the Amplify URL. Check the homepage, `/projects/` and one case study.
- Response headers: `curl -sI https://main.<app-id>.amplifyapp.com/ | grep -iE "strict-transport|content-security|x-frame"`
- Open Chaos Mode, run one scenario, and press Esc.

## 4. Cost controls

Before relying on these numbers, check the AWS pricing pages for your account type. As published by AWS in Oct 2026:

- Amplify Hosting free tier: 1,000 build minutes, 5 GB stored and 15 GB served per month for 12 months. New accounts since 15 Jul 2025 instead get up to $200 in credits, with a 6-month free plan.
- After that: $0.01 per build minute, $0.023 per GB-month stored, $0.15 per GB served.
- Nothing else is billed: there is no backend, database or WAF. The WAF add-on costs $15 per month and is not needed.

Recommended: **Billing → Budgets → Create budget** with a monthly cost budget of $5 and an email alert at 80%.

## 5. CI

`.github/workflows/ci.yml` runs on pushes and pull requests: build, content check and the Playwright suite (Chromium). It needs no AWS credentials. Amplify does the deploy.

## 6. Updating content

- Edit `src/content/projects.json` or `src/data/profile.ts`, then push. Amplify rebuilds automatically.
- To publish a demo link you have confirmed, move it from `unconfirmedLinks` to `links` in `projects.json`.

## Challenge submission checklist

- [ ] Live Amplify URL loads, and stays up through judging. Avoid risky pushes after submitting.
- [ ] GitHub repository link set in `profile.portfolioRepo`.
- [ ] Screenshots: homepage, a case study, Chaos Mode mid-incident and its postmortem, the Amplify console (app overview, build log, custom headers). Crop out account IDs and email addresses.
- [ ] Write-up: AWS services used (Amplify Hosting with its managed CDN, plus IAM for the Amplify service role and AWS Budgets), what you learned, and the challenges you hit.

## Planned: `/lock` admin dashboard (not built yet)

The design is agreed but not implemented. It would use Amplify Gen 2 in the same app:

- Amazon Cognito with self sign-up turned off, an admin group and TOTP MFA.
- DynamoDB for project records, and S3 for screenshots and diagrams, both admin-only.
- Publishing triggers a rebuild, so unpublished projects never reach the public site.

It will read and write the same project fields as `projects.json`. Costs and setup will be documented when it is built.

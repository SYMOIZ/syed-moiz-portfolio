// Content and safety checks for the built site. Runs after `astro build` locally, in CI and on Vercel.
// Fails the deploy if the output contains placeholder links, unconfirmed links, or anything that
// looks like a credential or an AWS account identifier.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const DIST = 'dist';
const PROJECT_DIR = 'src/content/projects';
const projects = readdirSync(PROJECT_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({ id: f.slice(0, -5), ...JSON.parse(readFileSync(join(PROJECT_DIR, f), 'utf8')) }));
const problems = [];

// 1. Data model sanity: every rendered link must be https; no placeholders in data.
const PLACEHOLDER = /(VIDEO_URL|APP_URL|example\.com|your-email|TODO|<[A-Z_]+>)/;
for (const p of projects) {
  for (const [kind, url] of Object.entries(p.links ?? {})) {
    if (!url) continue; // the admin saves unused links as empty
    if (!/^https:\/\//.test(url)) problems.push(`project ${p.id}: ${kind} link is not https: ${url}`);
    if (PLACEHOLDER.test(url)) problems.push(`project ${p.id}: ${kind} link is a placeholder: ${url}`);
  }
  if (p.status === 'production' && !p.links?.demo) {
    problems.push(`project ${p.id}: status "production" needs a confirmed demo link`);
  }
}

// 2. Built output: walk dist and scan text files.
const unconfirmed = projects.flatMap((p) => Object.values(p.unconfirmedLinks ?? {})).filter(Boolean);
const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/github_pat_[A-Za-z0-9_]{20,}/, 'GitHub fine-grained token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d{12}:/, 'ARN with account id'],
  [/\b(vpc|subnet|sg)-[0-9a-f]{8,17}\b/, 'VPC resource id'],
];
const TEXT = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.svg']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

let scanned = 0;
for (const file of walk(DIST)) {
  if (!TEXT.has(extname(file))) continue;
  scanned++;
  const body = readFileSync(file, 'utf8');
  const rel = relative('.', file);
  for (const url of unconfirmed) if (body.includes(url)) problems.push(`${rel}: renders unconfirmed link ${url}`);
  for (const [re, label] of SECRET_PATTERNS) if (re.test(body)) problems.push(`${rel}: looks like a ${label}`);
  if (extname(file) === '.html' && PLACEHOLDER.test(body.replace(/<script[\s\S]*?<\/script>/g, ''))) {
    const m = body.match(PLACEHOLDER);
    problems.push(`${rel}: placeholder text "${m[0]}"`);
  }
}

if (problems.length) {
  console.error(`Content check failed (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Content check passed: ${projects.length} projects, ${scanned} built files scanned.`);

import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';

type Project = CollectionEntry<'projects'>;
type Status = Project['data']['status'];
type Domain = Project['data']['domains'][number];

export const STATUS_LABEL: Record<Status, string> = {
  production: 'In production',
  'deployed-demo': 'Deployed demo',
  prototype: 'Prototype',
  hackathon: 'Hackathon build',
  challenge: 'Challenge entry',
  learning: 'Learning project',
  concept: 'Concept',
  unconfirmed: 'Status not confirmed',
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  'incident-response': 'Incident response',
  'ci-cd': 'CI/CD',
  iac: 'Infrastructure as Code',
  networking: 'Networking',
  security: 'Security & IAM',
  observability: 'Observability',
  cost: 'Cost & governance',
  serverless: 'Serverless',
  containers: 'Containers',
  'ai-ops': 'AI for operations',
  data: 'Data engineering',
  apps: 'Applications',
};

const TIER_RANK = { featured: 0, secondary: 1, archive: 2 } as const;

export async function getPublishedProjects(): Promise<Project[]> {
  const all = await getCollection('projects', (p) => p.data.published);
  return all.sort((a, b) => TIER_RANK[a.data.tier] - TIER_RANK[b.data.tier] || a.data.order - b.data.order);
}

export function projectHref(p: Project): string | undefined {
  if (p.data.caseStudy) return `/projects/${p.id}/`;
  return p.data.links.repo;
}

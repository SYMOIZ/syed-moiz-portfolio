// Allowed project statuses and engineering areas. Shared by the content schema and the /lock admin,
// so it must not import anything Astro-specific.
export const STATUSES = [
  'production',
  'deployed-demo',
  'prototype',
  'hackathon',
  'challenge',
  'learning',
  'concept',
  'unconfirmed',
] as const;

export const DOMAINS = [
  'incident-response',
  'ci-cd',
  'iac',
  'networking',
  'security',
  'observability',
  'cost',
  'serverless',
  'containers',
  'ai-ops',
  'data',
  'apps',
] as const;

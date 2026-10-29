import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// Project data model. Every field here is editable without touching page code.
// The planned /lock admin dashboard will write this same shape.

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

const url = z.string().url();

const diagram = z.object({
  caption: z.string(),
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      kind: z.enum(['actor', 'entry', 'compute', 'decision', 'store', 'external', 'action']),
      col: z.number(),
      row: z.number(),
      note: z.string(),
    }),
  ),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })),
});

const projects = defineCollection({
  loader: file('src/content/projects.json'),
  schema: z.object({
    name: z.string(),
    published: z.boolean().default(true),
    tier: z.enum(['featured', 'secondary', 'archive']),
    order: z.number(),
    status: z.enum(STATUSES),
    statusNote: z.string().optional(),
    event: z.string().optional(),
    domains: z.array(z.enum(DOMAINS)).min(1),
    summary: z.string(),
    stack: z.array(z.string()),
    // Only links listed here are rendered. Empty = hidden.
    links: z
      .object({ repo: url.optional(), demo: url.optional(), video: url.optional(), docs: url.optional() })
      .default({}),
    // Known URLs that could not be verified yet. Stored, never rendered, until moved into `links`.
    unconfirmedLinks: z.object({ demo: url.optional(), video: url.optional() }).optional(),
    caseStudy: z
      .object({
        problem: z.string(),
        approach: z.array(z.string()),
        architecture: diagram.optional(),
        decisions: z.array(z.string()),
        security: z.array(z.string()),
        deployment: z.array(z.string()),
        results: z.array(z.object({ text: z.string(), source: z.string() })),
        limitations: z.array(z.string()),
        sources: z.array(z.string()),
      })
      .optional(),
  }),
});

export const collections = { projects };

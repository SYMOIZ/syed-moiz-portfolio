import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { STATUSES, DOMAINS } from './data/enums';

// Project data model. Every field here is editable without touching page code.
// One JSON file per project in src/content/projects/; the /lock admin (Keystatic) edits them.
// The admin writes empty optional fields as "" or null, so those are normalised to undefined here.

export { STATUSES, DOMAINS };

const url = z.string().url();
const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const optionalUrl = z.preprocess(blankToUndefined, url.optional());
const optionalText = z.preprocess(blankToUndefined, z.string().optional());
// An unused case study or diagram is saved as an empty object; treat it as absent.
const emptyCaseStudy = (v: unknown) => (v && typeof v === 'object' && !(v as { problem?: string }).problem ? undefined : v);
const emptyDiagram = (v: unknown) =>
  v && typeof v === 'object' && !((v as { nodes?: unknown[] }).nodes ?? []).length ? undefined : v;

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
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: optionalText })),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: 'src/content/projects' }),
  schema: z.object({
    name: z.string(),
    published: z.boolean().default(true),
    tier: z.enum(['featured', 'secondary', 'archive']),
    order: z.number(),
    status: z.enum(STATUSES),
    statusNote: optionalText,
    event: optionalText,
    domains: z.array(z.enum(DOMAINS)).min(1),
    summary: z.string(),
    stack: z.array(z.string()),
    // Only links listed here are rendered. Empty = hidden.
    links: z
      .object({ repo: optionalUrl, demo: optionalUrl, video: optionalUrl, docs: optionalUrl })
      .default({}),
    // Known URLs that could not be verified yet. Stored, never rendered, until moved into `links`.
    unconfirmedLinks: z.object({ demo: optionalUrl, video: optionalUrl }).optional(),
    caseStudy: z.preprocess(
      emptyCaseStudy,
      z
        .object({
          problem: z.string(),
          approach: z.array(z.string()),
          architecture: z.preprocess(emptyDiagram, diagram.optional()),
          decisions: z.array(z.string()),
          security: z.array(z.string()),
          deployment: z.array(z.string()),
          results: z.array(z.object({ text: z.string(), source: z.string() })),
          limitations: z.array(z.string()),
          sources: z.array(z.string()),
        })
        .optional(),
    ),
  }),
});

export const collections = { projects };

// Admin for the portfolio, served at /keystatic (and /lock, which redirects there).
// In production it signs in with GitHub and every save is a commit to the repository, which
// redeploys the site on Vercel. Only accounts with write access to the repository can save.
// Locally (`npm run dev`) it edits the files on disk instead; set PUBLIC_KEYSTATIC_STORAGE=github to use
// GitHub mode locally (needed once, to create the GitHub App; see docs/DEPLOYMENT.md).
import { config, collection, singleton, fields } from '@keystatic/core';
import { STATUSES, DOMAINS } from './src/data/enums';

const words = (s: string) => s.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const options = (values: readonly string[]) => values.map((value) => ({ label: words(value), value }));
const list = (label: string, itemLabel = 'Item') =>
  fields.array(fields.text({ label: itemLabel, multiline: true }), {
    label,
    itemLabel: (p) => p.value.slice(0, 80) || itemLabel,
  });

export default config({
  storage: import.meta.env.PROD || import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github'
    ? { kind: 'github', repo: { owner: 'SYMOIZ', name: 'syed-moiz-portfolio' } }
    : { kind: 'local' },
  ui: {
    brand: { name: 'Syed Moiz · Admin' },
    navigation: { Content: ['projects', 'certifications'] },
  },
  collections: {
    projects: collection({
      label: 'Projects',
      path: 'src/content/projects/*',
      format: { data: 'json' },
      slugField: 'name',
      columns: ['tier', 'order', 'status'],
      schema: {
        name: fields.slug({ name: { label: 'Name' }, slug: { label: 'File name (URL slug)' } }),
        published: fields.checkbox({ label: 'Published', defaultValue: true }),
        tier: fields.select({
          label: 'Tier',
          options: [
            { label: 'Featured (homepage)', value: 'featured' },
            { label: 'Secondary (homepage)', value: 'secondary' },
            { label: 'Archive (projects page only)', value: 'archive' },
          ],
          defaultValue: 'secondary',
        }),
        order: fields.integer({ label: 'Order', description: 'Lower numbers come first within a tier.', defaultValue: 50 }),
        status: fields.select({ label: 'Status', options: options(STATUSES), defaultValue: 'prototype' }),
        statusNote: fields.text({ label: 'Status note', multiline: true }),
        event: fields.text({ label: 'Event', description: 'Hackathon or challenge name, if any.' }),
        domains: fields.multiselect({ label: 'Engineering areas', options: options(DOMAINS) }),
        summary: fields.text({ label: 'Summary', multiline: true, validation: { length: { min: 1 } } }),
        stack: fields.array(fields.text({ label: 'Technology' }), {
          label: 'Stack',
          itemLabel: (p) => p.value || 'Technology',
        }),
        links: fields.object(
          {
            repo: fields.url({ label: 'Repository' }),
            demo: fields.url({ label: 'Live demo' }),
            video: fields.url({ label: 'Video' }),
            docs: fields.url({ label: 'Docs' }),
          },
          { label: 'Links', description: 'Only filled links are shown on the site.' },
        ),
        unconfirmedLinks: fields.object(
          { demo: fields.url({ label: 'Demo' }), video: fields.url({ label: 'Video' }) },
          { label: 'Unconfirmed links', description: 'Stored but never shown until moved into Links.' },
        ),
        caseStudy: fields.object(
          {
            problem: fields.text({ label: 'Problem', multiline: true }),
            approach: list('Approach', 'Step'),
            architecture: fields.object(
              {
                caption: fields.text({ label: 'Caption' }),
                nodes: fields.array(
                  fields.object({
                    id: fields.text({ label: 'ID' }),
                    label: fields.text({ label: 'Label' }),
                    kind: fields.select({
                      label: 'Kind',
                      options: options(['actor', 'entry', 'compute', 'decision', 'store', 'external', 'action']),
                      defaultValue: 'compute',
                    }),
                    col: fields.integer({ label: 'Column', defaultValue: 0 }),
                    row: fields.integer({ label: 'Row', defaultValue: 0 }),
                    note: fields.text({ label: 'Note', multiline: true }),
                  }),
                  { label: 'Nodes', itemLabel: (p) => p.fields.label.value || 'Node' },
                ),
                edges: fields.array(
                  fields.object({
                    from: fields.text({ label: 'From (node ID)' }),
                    to: fields.text({ label: 'To (node ID)' }),
                    label: fields.text({ label: 'Label' }),
                  }),
                  { label: 'Edges', itemLabel: (p) => `${p.fields.from.value} → ${p.fields.to.value}` },
                ),
              },
              { label: 'Architecture diagram', description: 'Leave the nodes empty for no diagram.' },
            ),
            decisions: list('Key decisions'),
            security: list('Security'),
            deployment: list('Deployment'),
            results: fields.array(
              fields.object({
                text: fields.text({ label: 'Result', multiline: true }),
                source: fields.text({ label: 'Source' }),
              }),
              { label: 'Results', itemLabel: (p) => p.fields.text.value.slice(0, 80) || 'Result' },
            ),
            limitations: list('Limitations'),
            sources: list('Sources'),
          },
          { label: 'Case study', description: 'Leave the problem empty for no case-study page.' },
        ),
      },
    }),
  },
  singletons: {
    certifications: singleton({
      label: 'Certifications',
      path: 'src/data/certifications',
      format: { data: 'json' },
      schema: {
        items: fields.array(
          fields.object({
            name: fields.text({ label: 'Name', validation: { length: { min: 1 } } }),
            code: fields.text({ label: 'Exam code', description: 'For example AZ-104. Optional.' }),
            issuer: fields.text({ label: 'Issuer', defaultValue: 'Microsoft' }),
            level: fields.select({
              label: 'Level',
              options: options(['Expert', 'Professional', 'Associate', 'Specialty', 'Fundamentals', 'Foundational']).map(
                (o) => ({ ...o, label: o.value }),
              ),
              defaultValue: 'Associate',
            }),
            date: fields.text({ label: 'Earned', description: 'For example Jul 2026.' }),
            expires: fields.text({ label: 'Valid to', description: 'Optional.' }),
            verify: fields.url({ label: 'Verify link', description: 'Optional. Shows a Verify button.' }),
          }),
          { label: 'Certifications', itemLabel: (p) => `${p.fields.issuer.value} · ${p.fields.name.value}` },
        ),
      },
    }),
  },
});

// Admin for the whole portfolio, served at /keystatic (and /lock, which redirects there).
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

const heading = (label: string) =>
  fields.object(
    {
      kicker: fields.text({ label: 'Small label above the title' }),
      title: fields.text({ label: 'Title' }),
      lede: fields.text({ label: 'Intro sentence', description: 'Optional.', multiline: true }),
    },
    { label },
  );

export default config({
  storage: import.meta.env.PROD || import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github'
    ? { kind: 'github', repo: { owner: 'SYMOIZ', name: 'syed-moiz-portfolio' } }
    : { kind: 'local' },
  ui: {
    brand: { name: 'Syed Moiz · Admin' },
    navigation: {
      'Home page': ['profile', 'sections', 'skills', 'workflow', 'resume'],
      Content: ['projects', 'certifications'],
    },
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
    profile: singleton({
      label: 'Profile, hero and about',
      path: 'src/data/profile',
      format: { data: 'json' },
      schema: {
        name: fields.text({ label: 'Name', validation: { length: { min: 1 } } }),
        role: fields.text({ label: 'Role', description: 'Shown in the page title and footer.' }),
        roles: fields.array(fields.text({ label: 'Role' }), {
          label: 'Typed roles in the hero',
          itemLabel: (p) => p.value || 'Role',
        }),
        valueLine: fields.text({ label: 'Hero sentence', multiline: true }),
        location: fields.text({ label: 'Location' }),
        email: fields.text({ label: 'Email' }),
        linkedin: fields.text({ label: 'LinkedIn URL' }),
        github: fields.text({ label: 'GitHub URL' }),
        portfolioRepo: fields.text({ label: 'This site repository URL', description: 'Footer "Site source" link. Optional.' }),
        resume: fields.text({ label: 'CV file path', description: 'For example /Syed-Moiz-Resume.pdf in public/. Empty hides "Download CV".' }),
        now: fields.text({ label: 'Now', description: 'What you are doing now (About section).', multiline: true }),
        about: list('About paragraphs', 'Paragraph'),
        principles: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            text: fields.text({ label: 'Text', multiline: true }),
          }),
          { label: 'Principles (About cards)', itemLabel: (p) => p.fields.title.value || 'Principle' },
        ),
      },
    }),
    sections: singleton({
      label: 'Section headings and buttons',
      path: 'src/data/sections',
      format: { data: 'json' },
      schema: {
        hero: fields.object(
          {
            greeting: fields.text({ label: 'Greeting above the name' }),
            primaryButton: fields.text({ label: 'Main button' }),
            secondaryButton: fields.text({ label: 'Second button' }),
            chaosHint: fields.text({ label: 'Chaos Mode hint' }),
            chaosHintAction: fields.text({ label: 'Chaos Mode hint (bold part)' }),
          },
          { label: 'Hero' },
        ),
        about: heading('About'),
        social: heading('Find me online'),
        certifications: heading('Certifications'),
        skills: fields.object(
          {
            kicker: fields.text({ label: 'Small label above the title' }),
            title: fields.text({ label: 'Title' }),
            lede: fields.text({ label: 'Intro sentence', multiline: true }),
            capabilitiesTitle: fields.text({ label: 'Capabilities list heading' }),
          },
          { label: 'Skills' },
        ),
        operate: heading('How I work'),
        experience: heading('Experience & education'),
        projects: heading('Projects'),
        contact: heading('Contact'),
      },
    }),
    skills: singleton({
      label: 'Skills and capabilities',
      path: 'src/data/skills',
      format: { data: 'json' },
      schema: {
        skillGroups: fields.array(
          fields.object({
            name: fields.text({
              label: 'Group name',
              description: 'Cloud, Automation, Containers, Systems, Languages and Data platforms have their own icons.',
            }),
            skills: fields.array(fields.text({ label: 'Skill' }), { label: 'Skills', itemLabel: (p) => p.value || 'Skill' }),
          }),
          { label: 'Skill groups', itemLabel: (p) => p.fields.name.value || 'Group' },
        ),
        capabilities: fields.array(
          fields.object({
            area: fields.text({ label: 'Capability' }),
            projects: fields.multiRelationship({ label: 'Projects that prove it', collection: 'projects' }),
          }),
          { label: 'Capabilities', itemLabel: (p) => p.fields.area.value || 'Capability' },
        ),
      },
    }),
    workflow: singleton({
      label: 'How I work',
      path: 'src/data/workflow',
      format: { data: 'json' },
      schema: {
        stages: fields.array(
          fields.object({
            id: fields.text({ label: 'ID', description: 'Short, lowercase and unique.' }),
            label: fields.text({ label: 'Label' }),
            text: fields.text({ label: 'Text', multiline: true }),
            evidence: fields.array(
              fields.object({
                label: fields.text({ label: 'Label' }),
                href: fields.text({ label: 'Link', description: 'For example /projects/dlq-judge/. Optional.' }),
              }),
              { label: 'Where this shows up', itemLabel: (p) => p.fields.label.value || 'Evidence' },
            ),
          }),
          { label: 'Stages', itemLabel: (p) => p.fields.label.value || 'Stage' },
        ),
      },
    }),
    resume: singleton({
      label: 'Experience, education, community, research',
      path: 'src/data/resume',
      format: { data: 'json' },
      schema: {
        experience: fields.array(
          fields.object({
            role: fields.text({ label: 'Role' }),
            org: fields.text({ label: 'Organisation' }),
            period: fields.text({ label: 'Period', description: 'For example Aug 2026 to Present.' }),
            points: list('Highlights', 'Point'),
          }),
          { label: 'Experience', itemLabel: (p) => `${p.fields.role.value} · ${p.fields.org.value}` },
        ),
        education: fields.array(
          fields.object({
            degree: fields.text({ label: 'Degree' }),
            school: fields.text({ label: 'School' }),
          }),
          { label: 'Education', itemLabel: (p) => p.fields.degree.value || 'Education' },
        ),
        community: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            period: fields.text({ label: 'Period' }),
            text: fields.text({ label: 'Text', multiline: true }),
            url: fields.url({ label: 'Link', description: 'Optional.' }),
          }),
          { label: 'Community', itemLabel: (p) => p.fields.title.value || 'Entry' },
        ),
        publications: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            venue: fields.text({ label: 'Venue' }),
            date: fields.text({ label: 'Date' }),
            url: fields.url({ label: 'Link', description: 'Optional.' }),
          }),
          { label: 'Research', itemLabel: (p) => p.fields.title.value || 'Publication' },
        ),
      },
    }),
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

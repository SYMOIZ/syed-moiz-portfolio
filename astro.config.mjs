// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';

// Static pages served from Vercel's CDN. Only the /keystatic admin and its /api/keystatic routes run
// on demand (as Vercel functions); /lock redirects to the admin.
// Fonts are downloaded at build time and self-hosted, so no third-party requests at runtime.
// security.csp emits a per-page CSP <meta> with hashes for every inline script/style Astro renders.
export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [react(), keystatic()],
  redirects: { '/lock': '/keystatic' },
  // Set SITE_URL in the Vercel environment to the production URL; it enables
  // absolute canonical and social-preview URLs. Without it those tags are omitted.
  site: process.env.SITE_URL || undefined,
  trailingSlash: 'ignore',
  // No code blocks are rendered; disabling Shiki keeps every page compatible with the strict CSP.
  markdown: { syntaxHighlight: false },
  build: {
    inlineStylesheets: 'never',
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Jost',
      cssVariable: '--font-display',
      weights: [300, 400, 500, 600],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-body',
      weights: [400, 500, 600],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-code',
      weights: [400, 500],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});

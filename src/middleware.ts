import { defineMiddleware } from 'astro:middleware';

// The /keystatic admin is a React app that injects its own styles and talks to GitHub, so its pages
// get a wider CSP than the strict, hash-only policy used on the public site. Its pages render on
// demand, where Astro sends the CSP as a response header; only the style, font, image and connect
// directives are replaced, so Astro's script hashes stay in force.
const ADMIN_DIRECTIVES: Record<string, string> = {
  'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
  'font-src': "'self' https://fonts.gstatic.com",
  'img-src': "'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com",
  // File contents are read from raw.githubusercontent.com; the GitHub API does the rest.
  'connect-src': "'self' https://api.github.com https://github.com https://raw.githubusercontent.com",
};

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const policy = response.headers.get('content-security-policy');
  if (!policy || !/^\/keystatic(\/|$)/.test(context.url.pathname)) return response;

  const directives = policy
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .filter((d) => !(d.split(/\s+/)[0] in ADMIN_DIRECTIVES));
  for (const [name, value] of Object.entries(ADMIN_DIRECTIVES)) directives.push(`${name} ${value}`);
  response.headers.set('content-security-policy', directives.join('; '));
  return response;
});

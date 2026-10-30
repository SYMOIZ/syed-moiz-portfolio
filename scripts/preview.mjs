// Serves the Vercel build locally for checks and tests, because `astro preview` does not support the
// Vercel adapter: static files from .vercel/output/static, and the /keystatic admin through the built
// function. To edit content locally, use `npm run dev` and open /keystatic instead.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = '.vercel/output/static';
const FUNCTION = '.vercel/output/functions/_render.func/.vercel/output/server/entry.mjs';
let fn;
const render = async (req) => {
  fn ??= (await import(pathToFileURL(resolvePath(FUNCTION)).href)).default;
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req;
  return fn.fetch(
    new Request(new URL(req.url, `http://${req.headers.host}`), { method: req.method, headers: req.headers, body, duplex: 'half' }),
  );
};
const PORT = Number(process.env.PORT || 4321);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

async function resolve(pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  for (const candidate of [safe, join(safe, 'index.html'), `${safe}.html`]) {
    const file = join(ROOT, candidate);
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/lock') {
    res.writeHead(301, { Location: '/keystatic' }).end();
    return;
  }
  if (/^\/(api\/)?keystatic(\/|$)/.test(pathname)) {
    const r = await render(req);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  const file = await resolve(pathname);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}`));

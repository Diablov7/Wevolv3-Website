// Minimal static server for local preview of the Wevolv3 site.
// Mirrors Netlify's extensionless routing (/about -> about.html) so internal
// links can be checked the way a crawler would follow them.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = 8010;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

async function resolve(pathname) {
  const clean = decodeURIComponent(pathname).replace(/\/+$/, '') || '/index.html';
  const candidates = [
    clean,
    `${clean}.html`,
    join(clean, 'index.html'),
    clean === '/index.html' ? null : '/index.html',
  ].filter(Boolean);

  for (const c of candidates) {
    const file = join(ROOT, c);
    if (!file.startsWith(ROOT)) continue;
    try {
      const s = await stat(file);
      if (s.isFile()) return file;
    } catch {}
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const file = await resolve(pathname);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    return res.end('404');
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(PORT, () => console.log(`wevolv3-site preview on http://localhost:${PORT}`));

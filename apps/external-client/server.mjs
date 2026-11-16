import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

export async function resolveRuntimeConfig(env = process.env) {
  let fileConfig = {
    authApiUrl: 'http://localhost:3001',
    kahootApiUrl: 'http://localhost:3002',
    email: 'docente.demo@example.com',
    sessionCode: 'K7M3QX',
  };

  try {
    const raw = await fs.readFile(path.join(__dirname, 'config.json'), 'utf8');
    fileConfig = { ...fileConfig, ...JSON.parse(raw) };
  } catch {
    // Use defaults if config.json cannot be read
  }

  return {
    authApiUrl: env.EXTERNAL_AUTH_API_URL || env.VITE_AUTH_API_URL || fileConfig.authApiUrl,
    kahootApiUrl: env.EXTERNAL_KAHOOT_API_URL || env.VITE_KAHOOT_API_URL || fileConfig.kahootApiUrl,
    email: env.EXTERNAL_CLIENT_EMAIL || env.DEMO_EMAIL || fileConfig.email,
    sessionCode: env.EXTERNAL_CLIENT_SESSION_CODE || fileConfig.sessionCode,
  };
}

export function createExternalClientServer(env = process.env) {
  return http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    const pathname = reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname;

    if (pathname === '/config.js') {
      const cfg = await resolveRuntimeConfig(env);
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(`window.__EXTERNAL_CLIENT_CONFIG__ = ${JSON.stringify(cfg)};\n`);
      return;
    }

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'ok', service: 'external-client' }));
      return;
    }

    const safeRelPath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
    const targetPath = path.join(__dirname, safeRelPath);
    if (!targetPath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const stat = await fs.stat(targetPath);
      if (!stat.isFile()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(targetPath).toLowerCase();
      const content = await fs.readFile(targetPath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.EXTERNAL_CLIENT_PORT || 5174);
  const server = createExternalClientServer(process.env);
  server.listen(port, '0.0.0.0', () => {
    console.log(`[external-client] serving on http://localhost:${port}`);
  });
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const FORBIDDEN_PATTERNS = [
  /apps[\\/]auth-api/i,
  /apps[\\/]kahoot-api/i,
  /apps[\\/]web/i,
  /@rubymind[\\/]auth-api/i,
  /@rubymind[\\/]kahoot-api/i,
  /@rubymind[\\/]web/i,
  /\bfrom\s+['"]pg['"]/i,
  /\brequire\(\s*['"]pg['"]\s*\)/i,
  /\bfrom\s+['"]typeorm['"]/i,
  /\brequire\(\s*['"]typeorm['"]\s*\)/i,
  /postgresql:\/\//i,
  /AUTH_DATABASE_URL/i,
  /KAHOOT_DATABASE_URL/i,
];

async function listSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'test') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(full)));
    } else if (/\.(html|js|mjs|css|json)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

export async function verifyIndependence() {
  const pkgRaw = await fs.readFile(path.join(rootDir, 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
    ...(pkg.peerDependencies || {}),
  };

  for (const depName of Object.keys(allDeps)) {
    assert.ok(
      !depName.startsWith('@rubymind/') && depName !== 'pg' && depName !== 'typeorm',
      `Dependencia prohibida detectada en apps/external-client/package.json: ${depName}`,
    );
  }

  const files = await listSourceFiles(rootDir);
  assert.ok(files.length >= 4, 'Debe existir al menos index.html, app.js, styles.css y config.json');

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.ok(
        !pattern.test(content),
        `El archivo ${path.relative(rootDir, file)} contiene una referencia prohibida (${pattern})`,
      );
    }
  }
}

test('1.2 verifica que apps/external-client no importa código de las APIs ni accede a la base de datos', async () => {
  await verifyIndependence();
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await verifyIndependence();
  console.log('[independence] OK: sin referencias a las APIs ni acceso directo a base de datos.');
}

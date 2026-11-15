// Verifica que los tipos generados en src/generated esten al dia con los OpenAPI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'contracts-types-'));
const require = createRequire(import.meta.url);
const pkgPath = require.resolve('openapi-typescript/package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const binRel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin['openapi-typescript'];
const bin = path.join(path.dirname(pkgPath), binRel);
const norm = (s) => s.replace(/\r\n/g, '\n');

let stale = 0;
for (const name of ['auth-api', 'kahoot-api']) {
  const out = path.join(tmp, `${name}.d.ts`);
  execFileSync(process.execPath, [bin, path.join(root, 'openapi', `${name}.yaml`), '-o', out], { stdio: 'ignore' });
  const current = path.join(root, 'src', 'generated', `${name}.d.ts`);
  if (!fs.existsSync(current) || norm(fs.readFileSync(current, 'utf8')) !== norm(fs.readFileSync(out, 'utf8'))) {
    console.error(`DESACTUALIZADO src/generated/${name}.d.ts: ejecuta "npm run gen:types -w @profelink/contracts"`);
    stale++;
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
if (!stale) console.log('Tipos generados al dia');
process.exit(stale ? 1 : 0);

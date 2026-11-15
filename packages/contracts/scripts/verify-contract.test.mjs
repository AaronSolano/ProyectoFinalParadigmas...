import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { compare } from './verify-contract.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (n) => YAML.parse(fs.readFileSync(path.join(root, 'openapi', `${n}.yaml`), 'utf8'));

test('el contrato coincide consigo mismo (con y sin prefijo)', () => {
  for (const n of ['auth-api', 'kahoot-api']) {
    const doc = load(n);
    assert.equal(compare(doc, doc, { strict: true }).ok, true);
  }
});

test('una implementacion con prefijo /api/v1 en las rutas coincide', () => {
  const contract = load('kahoot-api');
  const impl = { paths: Object.fromEntries(Object.entries(contract.paths).map(([p, v]) => [`/api/v1${p}`, v])) };
  assert.equal(compare(contract, impl, { strict: true }).ok, true);
});

test('un endpoint no declarado hace fallar la verificacion', () => {
  const contract = load('kahoot-api');
  const impl = structuredClone(contract);
  impl.paths['/admin/secret'] = { get: { responses: { 200: { description: 'x' } } } };
  const r = compare(contract, impl);
  assert.equal(r.ok, false);
  assert.deepEqual(r.undeclared, ['GET /admin/secret']);
});

test('un metodo extra en una ruta existente hace fallar la verificacion', () => {
  const contract = load('auth-api');
  const impl = structuredClone(contract);
  impl.paths['/auth/login'].delete = { responses: { 200: { description: 'x' } } };
  assert.deepEqual(compare(contract, impl).undeclared, ['DELETE /auth/login']);
});

test('en modo estricto una operacion faltante hace fallar', () => {
  const contract = load('auth-api');
  const impl = structuredClone(contract);
  delete impl.paths['/auth/me'];
  assert.equal(compare(contract, impl).ok, true);
  assert.deepEqual(compare(contract, impl, { strict: true }).missing, ['GET /auth/me']);
});

test('la CLI sale con codigo 1 ante un endpoint no declarado', () => {
  const tmp = path.join(root, 'scripts', '.tmp-impl.json');
  const impl = load('auth-api');
  impl.paths['/hidden'] = { get: { responses: { 200: { description: 'x' } } } };
  fs.writeFileSync(tmp, JSON.stringify(impl));
  try {
    const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'verify-contract.mjs'), 'auth-api', tmp], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /GET \/hidden/);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

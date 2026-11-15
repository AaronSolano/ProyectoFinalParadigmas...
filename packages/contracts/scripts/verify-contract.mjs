// Compara el documento OpenAPI que genera una API (archivo .json/.yaml o URL) con el contrato congelado.
// Falla (codigo 1) si la implementacion expone una ruta+metodo que NO esta en el contrato.
// Con --strict tambien falla si el contrato declara operaciones que la implementacion no tiene.
//
// Uso: node scripts/verify-contract.mjs <auth-api|kahoot-api> <ruta-o-url> [--prefix /api/v1] [--strict]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head'];

function normalizePath(p, prefix) {
  let out = p;
  if (prefix && out.startsWith(prefix)) out = out.slice(prefix.length) || '/';
  return out.replace(/\{[^}]+\}/g, '{}').replace(/\/+$/, '') || '/';
}

export function operationsOf(doc, prefix = '') {
  const ops = new Set();
  for (const [p, item] of Object.entries(doc.paths ?? {})) {
    for (const m of METHODS) if (item?.[m]) ops.add(`${m.toUpperCase()} ${normalizePath(p, prefix)}`);
  }
  return ops;
}

export function compare(contractDoc, implDoc, { prefix = '/api/v1', strict = false } = {}) {
  const contract = operationsOf(contractDoc, prefix);
  const impl = operationsOf(implDoc, prefix);
  const undeclared = [...impl].filter((o) => !contract.has(o)).sort();
  const missing = strict ? [...contract].filter((o) => !impl.has(o)).sort() : [];
  return { undeclared, missing, ok: undeclared.length === 0 && missing.length === 0 };
}

async function load(src) {
  const text = /^https?:\/\//.test(src) ? await (await fetch(src)).text() : fs.readFileSync(src, 'utf8');
  return YAML.parse(text);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const [name, src] = args;
  const prefixIdx = args.indexOf('--prefix');
  const prefix = prefixIdx >= 0 ? args[prefixIdx + 1] : '/api/v1';
  const strict = args.includes('--strict');
  if (!['auth-api', 'kahoot-api'].includes(name) || !src) {
    console.error('Uso: verify-contract.mjs <auth-api|kahoot-api> <ruta-o-url> [--prefix /api/v1] [--strict]');
    process.exit(2);
  }
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const contract = await load(path.join(root, 'openapi', `${name}.yaml`));
  const impl = await load(src);
  const r = compare(contract, impl, { prefix, strict });
  for (const o of r.undeclared) console.error(`NO DECLARADO EN EL CONTRATO: ${o}`);
  for (const o of r.missing) console.error(`DECLARADO PERO NO IMPLEMENTADO: ${o}`);
  console.log(r.ok ? `Contrato ${name}: OK` : `Contrato ${name}: FALLA`);
  process.exit(r.ok ? 0 : 1);
}

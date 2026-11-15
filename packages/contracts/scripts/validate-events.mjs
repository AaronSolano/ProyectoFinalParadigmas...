// Valida que cada JSON Schema de eventos compile y que sus "examples" cumplan el esquema.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'events', 'schemas');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.schema.json'));
const schemas = files.map((f) => ({ file: f, schema: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
for (const { schema } of schemas) ajv.addSchema(schema);

let failures = 0;
let examples = 0;
for (const { file, schema } of schemas) {
  const validate = ajv.getSchema(schema.$id);
  if (!validate) {
    console.error(`FALLA ${file}: el esquema no compila`);
    failures++;
    continue;
  }
  for (const [i, ex] of (schema.examples ?? []).entries()) {
    examples++;
    if (!validate(ex)) {
      console.error(`FALLA ${file} ejemplo ${i}:`, JSON.stringify(validate.errors));
      failures++;
    }
  }
}
console.log(`${schemas.length} esquemas, ${examples} ejemplos validados, ${failures} fallas`);
process.exit(failures ? 1 : 0);

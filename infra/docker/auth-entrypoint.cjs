// Arranque de auth-api dentro del contenedor:
//  1. Usa las claves JWT del entorno; si faltan, las lee de /keys o las genera y las guarda alli
//     (asi los tokens siguen siendo validos tras reiniciar y no hay secretos en el repositorio).
//  2. Aplica las migraciones pendientes.
//  3. Inicia el servicio.
const fs = require("node:fs");
const path = require("node:path");
const { generateKeyPairSync } = require("node:crypto");

function ensureKeys() {
  if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) return;
  const dir = process.env.JWT_KEYS_DIR || "/keys";
  const privatePath = path.join(dir, "private.pem");
  const publicPath = path.join(dir, "public.pem");
  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
    fs.mkdirSync(dir, { recursive: true });
    const pair = generateKeyPairSync("rsa", {
      modulusLength: 3072,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    fs.writeFileSync(privatePath, pair.privateKey, { mode: 0o600 });
    fs.writeFileSync(publicPath, pair.publicKey, { mode: 0o644 });
    console.log("auth-api: claves JWT generadas en " + dir);
  }
  process.env.JWT_PRIVATE_KEY = fs.readFileSync(privatePath, "utf8");
  process.env.JWT_PUBLIC_KEY = fs.readFileSync(publicPath, "utf8");
  process.env.JWT_KEY_ID ||= "auth-key-1";
}

async function migrate() {
  if (process.env.RUN_MIGRATIONS === "false") return;
  require("reflect-metadata");
  const { createDataSource } = require("./dist/data/data-source");
  const db = await createDataSource(
    process.env.AUTH_DATABASE_URL,
    process.env.DATABASE_SSL === "true",
  ).initialize();
  try {
    await db.runMigrations();
  } finally {
    await db.destroy();
  }
}

(async () => {
  ensureKeys();
  await migrate();
  require("./dist/main");
})().catch((error) => {
  console.error(
    "auth-api no pudo iniciar:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});

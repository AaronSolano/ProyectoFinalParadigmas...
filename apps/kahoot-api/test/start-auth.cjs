// Disposable local load fixture: ephemeral RSA keys never leave this process.
const { generateKeyPairSync } = require("node:crypto");
const pair = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
process.env.JWT_PRIVATE_KEY = pair.privateKey;
process.env.JWT_PUBLIC_KEY = pair.publicKey;
process.env.JWT_KEY_ID = "load-fixture";
(async () => {
  const { createDataSource } = require("./dist/data/data-source");
  const db = await createDataSource(process.env.AUTH_DATABASE_URL).initialize();
  try {
    await db.runMigrations();
  } finally {
    await db.destroy();
  }
  require("./dist/main");
})().catch(() => {
  console.error("No se pudo iniciar auth de pruebas");
  process.exitCode = 1;
});

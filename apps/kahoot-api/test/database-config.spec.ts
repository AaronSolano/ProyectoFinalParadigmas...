import { database } from "../src/data/database";
import { loadConfig } from "../src/config/config";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

const url = "postgresql://postgres@localhost/test";
function createDataSource(
  databaseUrl: string,
  ssl = false,
  sslCa?: string,
  databaseSchema = "public",
) {
  return database({
    ...loadConfig({
      KAHOOT_DATABASE_URL: databaseUrl,
      AUTH_BASE_URL: "http://localhost:3001",
      PUBLIC_API_URL: "http://localhost:3002",
    }),
    ssl,
    sslCa,
    databaseSchema,
  });
}
test("DataSource mantiene public y TLS verificado con CA PEM opcional", () => {
  expect(createDataSource(url).options).toMatchObject({
    schema: "public",
    ssl: false,
  });
  expect(
    (createDataSource(url, true).options as PostgresConnectionOptions).ssl,
  ).toEqual({
    rejectUnauthorized: true,
  });
  const ca = "-----BEGIN CERTIFICATE-----\\nroot\\n-----END CERTIFICATE-----";
  const options = createDataSource(url + "?sslmode=no-verify", true, ca, "auth")
    .options as PostgresConnectionOptions;
  expect(options.schema).toBe("auth");
  expect(options.ssl).toEqual({
    rejectUnauthorized: true,
    ca: ca.replace(/\\n/g, "\n"),
  });
  expect(options.url).not.toContain("sslmode");
  expect(
    (createDataSource(url, false, ca).options as PostgresConnectionOptions).ssl,
  ).toBe(false);
  expect(
    loadConfig({
      KAHOOT_DATABASE_URL: url,
      AUTH_BASE_URL: "http://localhost:3001",
      PUBLIC_API_URL: "http://localhost:3002",
      DATABASE_SSL: "true",
      DATABASE_SSL_CA: ca,
      DATABASE_SCHEMA: "auth",
    }),
  ).toMatchObject({
    ssl: true,
    sslCa: ca.replace(/\\n/g, "\n"),
    databaseSchema: "auth",
  });
});
test.each([
  "",
  "bad-name",
  "auth;DROP SCHEMA public",
  "pg_catalog",
  "a".repeat(64),
])("rechaza esquema inseguro: %s", (schema) => {
  expect(() => createDataSource(url, false, undefined, schema)).toThrow(
    "DATABASE_SCHEMA",
  );
});
test("espera la preparación de cada conexión y propaga errores de inicialización", async () => {
  const options = createDataSource(url, false, undefined, "auth")
    .options as PostgresConnectionOptions;
  const client = { query: jest.fn().mockResolvedValue([]) };
  await options.extra.onConnect(client);
  expect(client.query.mock.calls).toEqual([
    ["SELECT pg_advisory_lock(400, hashtext($1))", ["schema:auth"]],
    ['CREATE SCHEMA IF NOT EXISTS "auth"'],
    ["SELECT pg_advisory_unlock(400, hashtext($1))", ["schema:auth"]],
    [
      "SELECT set_config('search_path', $1, false)",
      ['"auth", public, extensions'],
    ],
  ]);
  client.query.mockClear();
  client.query.mockRejectedValueOnce(new Error("unavailable"));
  await expect(options.extra.onConnect(client)).rejects.toThrow("unavailable");
});

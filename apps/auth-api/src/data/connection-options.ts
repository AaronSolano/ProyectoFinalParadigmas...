// pg-pool awaits onConnect before making a new connection available to TypeORM.
interface DatabaseClient {
  query(sql: string, values?: unknown[]): Promise<unknown>;
}
export function connectionOptions(
  ssl: boolean,
  ca?: string,
  schema = 'public',
) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(schema) || /^pg_/i.test(schema))
    throw new Error('DATABASE_SCHEMA inválido');
  const certificate = ca?.replace(/\\n/g, '\n');
  return {
    schema,
    ssl: ssl
      ? {
          rejectUnauthorized: true,
          ...(certificate ? { ca: certificate } : {}),
        }
      : false,
    extra: {
      onConnect: async (client: DatabaseClient) => {
        if (schema !== 'public') {
          // Serialize CREATE SCHEMA across concurrent instances of the same service.
          await client.query('SELECT pg_advisory_lock(400, hashtext($1))', [
            `schema:${schema}`,
          ]);
          try {
            await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
          } finally {
            await client.query('SELECT pg_advisory_unlock(400, hashtext($1))', [
              `schema:${schema}`,
            ]);
          }
        }
        // public/extensions provide extension types (citext) already installed by Supabase.
        await client.query("SELECT set_config('search_path', $1, false)", [
          `"${schema}", public, extensions`,
        ]);
      },
    },
  };
}
// Explicit TLS settings must not be overridden by sslmode/CA paths in the URL.
export function connectionUrl(url: string) {
  const parsed = new URL(url);
  for (const name of [
    'sslmode',
    'sslrootcert',
    'sslcert',
    'sslkey',
    'sslpassword',
    'ssl',
  ])
    parsed.searchParams.delete(name);
  return parsed.toString();
}

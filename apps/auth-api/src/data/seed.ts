import { DataSource } from 'typeorm';
import { isEmail, isUUID } from 'class-validator';
import { validatePassword } from '../domain/profile';
import { ArgonPasswords } from './credentials';
import { createDataSource } from './data-source';
export async function seedDemoProfile(
  db: DataSource,
  env: NodeJS.ProcessEnv = process.env,
) {
  const id = env.DEMO_PROFILE_ID ?? '00000000-0000-4000-8000-000000000001';
  const email = (env.DEMO_EMAIL ?? 'docente.demo@example.com').toLowerCase();
  const displayName = (env.DEMO_DISPLAY_NAME ?? 'Docente demo').trim();
  const password = env.DEMO_PASSWORD;
  if (
    !isUUID(id) ||
    !isEmail(email) ||
    email.length > 254 ||
    displayName.length < 2 ||
    displayName.length > 40
  )
    throw new Error(
      'Configuración DEMO_PROFILE_ID, DEMO_EMAIL o DEMO_DISPLAY_NAME inválida',
    );
  if (!password) throw new Error('Falta DEMO_PASSWORD');
  validatePassword(password);
  return db.transaction(async (manager) => {
    await manager.query(
      'INSERT INTO profiles (id,email,display_name,password_hash) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [id, email, displayName, await new ArgonPasswords().hash(password)],
    );
    const rows: { id: string; email: string }[] = await manager.query(
      'SELECT id,email FROM profiles WHERE id=$1',
      [id],
    );
    if (rows.length !== 1 || rows[0].email.toLowerCase() !== email)
      throw new Error(
        'La identidad demo entra en conflicto con un perfil existente',
      );
    return rows[0];
  });
}
async function main() {
  if (!process.env.AUTH_DATABASE_URL)
    throw new Error('Falta AUTH_DATABASE_URL');
  const db = await createDataSource(
    process.env.AUTH_DATABASE_URL,
    process.env.DATABASE_SSL === 'true',
    process.env.DATABASE_SSL_CA,
    process.env.DATABASE_SCHEMA,
  ).initialize();
  try {
    const profile = await seedDemoProfile(db);
    console.log(`Perfil demo disponible: ${profile.id}`);
  } finally {
    await db.destroy();
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Error de seed');
    process.exitCode = 1;
  });

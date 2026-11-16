export interface Config {
  databaseUrl: string;
  ssl: boolean;
  sslCa?: string;
  databaseSchema: string;
  port: number;
  authUrl: string;
  issuer: string;
  audience: string;
  publicUrl: string;
  imagePath: string;
  imageMaxBytes: number;
  storage: string;
  supabaseUrl: string;
  supabaseKey: string;
  supabaseBucket: string;
  questionTime: number;
  cors: string[];
  runMigrations: boolean;
  liveMaxEventsPerSecond: number;
}
export function loadConfig(env = process.env): Config {
  const required = (key: string) => {
    const value = env[key];
    if (!value) throw new Error(`Falta ${key}`);
    return value;
  };
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const n = Number(env[key] ?? fallback);
    if (!Number.isInteger(n) || n < min || n > max)
      throw new Error(`${key} invalido`);
    return n;
  };
  const url = (value: string) => {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol))
      throw new Error("URL invalida");
    return value.replace(/\/$/, "");
  };
  const storage = env.IMAGE_STORAGE ?? "disk";
  if (env.DATABASE_SSL && !["true", "false"].includes(env.DATABASE_SSL))
    throw new Error("DATABASE_SSL invalido");
  if (
    env.RUN_MIGRATIONS !== undefined &&
    !["true", "false"].includes(env.RUN_MIGRATIONS)
  )
    throw new Error("RUN_MIGRATIONS invalido");
  if (!["disk", "supabase"].includes(storage))
    throw new Error("IMAGE_STORAGE invalido");
  return {
    databaseUrl: required("KAHOOT_DATABASE_URL"),
    ssl: env.DATABASE_SSL === "true",
    sslCa: env.DATABASE_SSL_CA?.replace(/\\n/g, "\n"),
    databaseSchema: env.DATABASE_SCHEMA ?? "public",
    port: integer("KAHOOT_PORT", 3002, 1, 65535),
    authUrl: url(required("AUTH_BASE_URL")),
    issuer: env.JWT_ISSUER ?? "auth-api",
    audience: env.JWT_AUDIENCE ?? "kahoot-api",
    publicUrl: url(required("PUBLIC_API_URL")),
    imagePath: env.IMAGE_STORAGE_PATH ?? "./data/images",
    imageMaxBytes: integer("IMAGE_MAX_BYTES", 2097152, 1, 2097152),
    storage,
    supabaseUrl: storage === "supabase" ? url(required("SUPABASE_URL")) : "",
    supabaseKey: storage === "supabase" ? required("SUPABASE_SERVICE_KEY") : "",
    supabaseBucket: env.SUPABASE_BUCKET ?? "question-images",
    questionTime: integer("QUESTION_TIME_SECONDS", 20, 5, 120),
    cors: (env.CORS_ORIGINS ?? "http://localhost:5173").split(","),
    runMigrations: env.RUN_MIGRATIONS !== "false",
    liveMaxEventsPerSecond: integer("LIVE_MAX_EVENTS_PER_SECOND", 20, 1, 10000),
  };
}

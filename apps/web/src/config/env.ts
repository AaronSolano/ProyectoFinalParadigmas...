export interface AppEnv {
  authApiUrl: string;
  kahootApiUrl: string;
}

export function getAppEnv(): AppEnv {
  const metaEnv = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const authApiUrl = (metaEnv.VITE_AUTH_API_URL ?? '').replace(/\/+$/, '');
  const kahootApiUrl = (metaEnv.VITE_KAHOOT_API_URL ?? '').replace(/\/+$/, '');
  return {
    authApiUrl,
    kahootApiUrl,
  };
}

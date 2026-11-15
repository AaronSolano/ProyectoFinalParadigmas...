export interface AppEnv {
  authApiUrl: string;
  kahootApiUrl: string;
  enableDebugControls: boolean;
}

export function getAppEnv(): AppEnv {
  const metaEnv = (import.meta.env ?? {}) as Record<string, string | undefined>;
  const authApiUrl = (metaEnv.VITE_AUTH_API_URL ?? '').replace(/\/+$/, '');
  const kahootApiUrl = (metaEnv.VITE_KAHOOT_API_URL ?? '').replace(/\/+$/, '');
  const enableDebugControls =
    String(metaEnv.VITE_ENABLE_DEBUG_CONTROLS ?? 'false').toLowerCase() === 'true';
  return {
    authApiUrl,
    kahootApiUrl,
    enableDebugControls,
  };
}

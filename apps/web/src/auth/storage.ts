import type { SessionProfile } from '../api/client';

const TOKEN_KEY = 'profelink_auth_token';
const PROFILE_KEY = 'profelink_auth_profile';
const SESSION_EXPIRED_KEY = 'profelink_session_expired';

let memoryToken: string | null = null;
let memoryProfile: SessionProfile | null = null;
let memorySessionExpired = false;

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function getStoredToken(): string | null {
  if (memoryToken) {
    return memoryToken;
  }
  try {
    const stored = window.sessionStorage.getItem(TOKEN_KEY);
    if (stored) {
      memoryToken = stored;
      return stored;
    }
  } catch {
    // ignore sessionStorage errors
  }
  return null;
}

export function getStoredProfile(): SessionProfile | null {
  if (memoryProfile) {
    return memoryProfile;
  }
  try {
    const raw = window.sessionStorage.getItem(PROFILE_KEY);
    if (raw) {
      memoryProfile = JSON.parse(raw) as SessionProfile;
      return memoryProfile;
    }
  } catch {
    // ignore sessionStorage errors
  }
  return null;
}

export function hasSessionExpiredNotice(): boolean {
  if (memorySessionExpired) {
    return true;
  }
  try {
    if (window.sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1') {
      memorySessionExpired = true;
      return true;
    }
  } catch {
    // ignore sessionStorage errors
  }
  return false;
}

export function clearSessionExpiredNotice(): void {
  memorySessionExpired = false;
  try {
    window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  } catch {
    // ignore sessionStorage errors
  }
}

export function saveAuthSession(token: string, profile: SessionProfile): void {
  memoryToken = token;
  memoryProfile = profile;
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore sessionStorage errors
  }
  clearSessionExpiredNotice();
}

export function clearAuthSession(): void {
  memoryToken = null;
  memoryProfile = null;
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore sessionStorage errors
  }
  clearSessionExpiredNotice();
}

export function onUnauthorizedSession(
  listener: UnauthorizedListener,
): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function notifySessionExpired(): void {
  clearAuthSession();
  memorySessionExpired = true;
  try {
    window.sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
  } catch {
    // ignore sessionStorage errors
  }
  for (const listener of unauthorizedListeners) {
    listener();
  }
}

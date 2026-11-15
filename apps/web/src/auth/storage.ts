import type { Profile } from '../api/client';

const TOKEN_KEY = 'profelink_auth_token';
const PROFILE_KEY = 'profelink_auth_profile';

let memoryToken: string | null = null;
let memoryProfile: Profile | null = null;

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

export function getStoredProfile(): Profile | null {
  if (memoryProfile) {
    return memoryProfile;
  }
  try {
    const raw = window.sessionStorage.getItem(PROFILE_KEY);
    if (raw) {
      memoryProfile = JSON.parse(raw) as Profile;
      return memoryProfile;
    }
  } catch {
    // ignore sessionStorage errors
  }
  return null;
}

export function saveAuthSession(token: string, profile: Profile): void {
  memoryToken = token;
  memoryProfile = profile;
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
    window.sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore sessionStorage errors
  }
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
}

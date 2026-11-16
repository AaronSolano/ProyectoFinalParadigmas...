import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import {
  authApi,
  type Profile,
  type SessionProfile,
  type LoginRequest,
  type RegisterRequest,
} from '../api/client';
import {
  clearAuthSession,
  clearSessionExpiredNotice,
  getStoredProfile,
  getStoredToken,
  hasSessionExpiredNotice,
  onUnauthorizedSession,
  saveAuthSession,
} from './storage';

interface AuthContextValue {
  token: string | null;
  profile: SessionProfile | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  joinAsGuest: (displayName: string) => Promise<void>;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  login: (input: LoginRequest) => Promise<Profile>;
  register: (input: RegisterRequest) => Promise<Profile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [profile, setProfile] = useState<SessionProfile | null>(() =>
    getStoredProfile(),
  );
  const [sessionExpired, setSessionExpired] = useState<boolean>(() =>
    hasSessionExpiredNotice(),
  );

  useEffect(() => {
    return onUnauthorizedSession(() => {
      setToken(null);
      setProfile(null);
      setSessionExpired(true);
    });
  }, []);

  const clearSessionExpired = useCallback(() => {
    clearSessionExpiredNotice();
    setSessionExpired(false);
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    const res = await authApi.login(input);
    saveAuthSession(res.accessToken, res.profile);
    setToken(res.accessToken);
    setProfile(res.profile);
    setSessionExpired(false);
    return res.profile;
  }, []);

  const register = useCallback(async (input: RegisterRequest) => {
    const res = await authApi.register(input);
    saveAuthSession(res.accessToken, res.profile);
    setToken(res.accessToken);
    setProfile(res.profile);
    setSessionExpired(false);
    return res.profile;
  }, []);

  const joinAsGuest = useCallback(async (displayName: string) => {
    const res = await authApi.guest(displayName.trim());
    const identity = { ...res.guest, guest: true as const };
    saveAuthSession(res.accessToken, identity);
    setToken(res.accessToken);
    setProfile(identity);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setProfile(null);
    setSessionExpired(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      profile,
      isAuthenticated: Boolean(token && profile),
      isGuest: Boolean(profile && 'guest' in profile && profile.guest),
      joinAsGuest,
      sessionExpired,
      clearSessionExpired,
      login,
      register,
      logout,
    }),
    [
      token,
      profile,
      joinAsGuest,
      sessionExpired,
      clearSessionExpired,
      login,
      register,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  authApi,
  type Profile,
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
  profile: Profile | null;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  login: (input: LoginRequest) => Promise<Profile>;
  register: (input: RegisterRequest) => Promise<Profile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [profile, setProfile] = useState<Profile | null>(() => getStoredProfile());
  const [sessionExpired, setSessionExpired] = useState<boolean>(() => hasSessionExpiredNotice());

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
      sessionExpired,
      clearSessionExpired,
      login,
      register,
      logout,
    }),
    [token, profile, sessionExpired, clearSessionExpired, login, register, logout],
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

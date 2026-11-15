import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  authApi,
  type Profile,
  type LoginRequest,
  type RegisterRequest,
} from '../api/client';
import {
  clearAuthSession,
  getStoredProfile,
  getStoredToken,
  saveAuthSession,
} from './storage';

interface AuthContextValue {
  token: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  login: (input: LoginRequest) => Promise<Profile>;
  register: (input: RegisterRequest) => Promise<Profile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [profile, setProfile] = useState<Profile | null>(() => getStoredProfile());

  const login = useCallback(async (input: LoginRequest) => {
    const res = await authApi.login(input);
    saveAuthSession(res.accessToken, res.profile);
    setToken(res.accessToken);
    setProfile(res.profile);
    return res.profile;
  }, []);

  const register = useCallback(async (input: RegisterRequest) => {
    const res = await authApi.register(input);
    saveAuthSession(res.accessToken, res.profile);
    setToken(res.accessToken);
    setProfile(res.profile);
    return res.profile;
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setToken(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      profile,
      isAuthenticated: Boolean(token && profile),
      login,
      register,
      logout,
    }),
    [token, profile, login, register, logout],
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

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authStorage, type UserRole } from './authStorage';
import { roleHome } from './roleHome';

type AuthState = {
  token: string | null;
  role: UserRole | null;
  email: string | null;
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  login: (payload: { token: string; role?: UserRole | null; email?: string | null }) => void;
  logout: () => void;
  homePath: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => ({
    token: authStorage.getToken(),
    role: authStorage.getRole(),
    email: authStorage.getEmail(),
  }));

  const syncFromStorage = useCallback(() => {
    setState({
      token: authStorage.getToken(),
      role: authStorage.getRole(),
      email: authStorage.getEmail(),
    });
  }, []);

  useEffect(() => {
    const onChanged = () => syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === 'token' || e.key === 'role' || e.key === 'user_email') syncFromStorage();
    };
    window.addEventListener('auth:changed', onChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('auth:changed', onChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [syncFromStorage]);

  const login = useCallback((payload: { token: string; role?: UserRole | null; email?: string | null }) => {
    authStorage.setAuth(payload);
    syncFromStorage();
  }, [syncFromStorage]);

  const logout = useCallback(() => {
    authStorage.clear();
    syncFromStorage();
  }, [syncFromStorage]);

  const value = useMemo<AuthContextValue>(() => {
    const isAuthenticated = !!state.token;
    return {
      ...state,
      isAuthenticated,
      login,
      logout,
      homePath: roleHome(state.role),
    };
  }, [login, logout, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


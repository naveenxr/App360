'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types/auth';
import authService from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (moduleName: string, action: 'create' | 'read' | 'update' | 'delete') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on client-side mount
  useEffect(() => {
    try {
      const storedToken = authService.getStoredToken();
      const storedUser = authService.getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.login(email, password);
      setToken(result.token);
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const role: UserRole | null = (
    user?.role && typeof user.role === 'object' ? user.role.name : (user?.role as UserRole)
  ) || null;

  const hasPermission = useCallback(
    (moduleName: string, action: 'create' | 'read' | 'update' | 'delete'): boolean => {
      if (!user) return false;
      if (role === 'ADMIN') return true;

      if (user.role && typeof user.role === 'object' && user.role.permissions) {
        const mod = user.role.permissions[moduleName];
        if (mod && mod[action] === true) {
          return true;
        }
      }

      return false;
    },
    [user, role]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


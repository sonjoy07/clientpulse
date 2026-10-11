'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AuthenticatedUser, Role } from '@/types';
import { authApi } from '@/lib/api/services';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/api/client';

interface AuthContextType {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: Role[]) => boolean;
  isClient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load session from storage or API on mount
  useEffect(() => {
    async function initSession() {
      const token = getAccessToken();
      const savedUserStr = localStorage.getItem('clientpulse_user');

      if (!token) {
        setIsLoading(false);
        return;
      }

      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr));
        } catch {
          // ignore corrupted JSON
        }
      }

      try {
        const freshUser = await authApi.getMe();
        setUser(freshUser);
        localStorage.setItem('clientpulse_user', JSON.stringify(freshUser));
      } catch (err: any) {
        if (err?.statusCode === 401) {
          clearTokens();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const res = await authApi.login(credentials);
      setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      localStorage.setItem('clientpulse_user', JSON.stringify(res.user));

      // Redirect based on role
      if (res.user.role === 'CLIENT') {
        router.push('/portal/dashboard');
      } else {
        router.push('/dashboard');
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore network error on logout
      }
    }
    clearTokens();
    setUser(null);
    router.push('/login');
  }, [router]);

  const hasRole = useCallback(
    (allowedRoles: Role[]) => {
      if (!user) return false;
      return allowedRoles.includes(user.role);
    },
    [user],
  );

  const isClient = user?.role === 'CLIENT';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasRole,
        isClient,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/lib/types';

function ZustandProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type AuthContextType = {
  user: User | null;
  login: (phone: string, password: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((phone: string, password: string) => {
    if (phone === 'ahmad' && password === 'Jallow@123') {
      setUser({
        id: 'u_ahmad',
        name: 'Ahmad',
        phone,
        role: 'agent',
      });
      return true;
    }

    return false;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const authValue = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ZustandProvider>
        <AuthProvider>{children}</AuthProvider>
      </ZustandProvider>
    </QueryClientProvider>
  );
}

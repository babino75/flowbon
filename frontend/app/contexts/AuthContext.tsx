"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "../lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_backup_manager: boolean;
  is_backup_accountant: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (data: Record<string, unknown>, redirectUrl?: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: true,
  });
  const router = useRouter();

  useEffect(() => {
    // Try to restore session on mount
    const initAuth = async () => {
      try {
        const userData = await api.getMe() as User;
        setAuthState({ user: userData, loading: false });
      } catch {
        // Not logged in or token expired
        setAuthState({ user: null, loading: false });
      }
    };
    initAuth();
  }, []);

  const login = async (data: Record<string, unknown>, redirectUrl?: string) => {
    const res = await api.login(data);
    setToken(res.access_token);
    const userData = await api.getMe() as User;
    setAuthState({ user: userData, loading: false });
    router.push(redirectUrl || "/dashboard");
  };

  const register = async (data: Record<string, unknown>) => {
    await api.register(data);
    // Optionally auto-login after register
    await login({ email: data.email, password: data.password });
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    } finally {
      setAuthState({ user: null, loading: false });
      setToken(null);
      window.location.href = "/login";
    }
  };

  // Auto-logout after 15 minutes of inactivity
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes en millisecondes

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (authState.user) {
        timeoutId = setTimeout(() => {
          logout();
        }, INACTIVITY_LIMIT);
      }
    };

    if (authState.user) {
      resetTimer();

      const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'];
      const handleActivity = () => resetTimer();

      events.forEach((event) => window.addEventListener(event, handleActivity));

      return () => {
        clearTimeout(timeoutId);
        events.forEach((event) => window.removeEventListener(event, handleActivity));
      };
    }
  }, [authState.user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ user: authState.user, loading: authState.loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

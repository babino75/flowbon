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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Try to restore session on mount
    const initAuth = async () => {
      try {
        const userData = await api.getMe() as User;
        setUser(userData);
      } catch {
        // Not logged in or token expired
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (data: Record<string, unknown>, redirectUrl?: string) => {
    const res = await api.login(data);
    setToken(res.access_token);
    const userData = await api.getMe() as User;
    setUser(userData);
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
      setUser(null);
      setToken(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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

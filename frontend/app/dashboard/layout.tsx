"use client";

import { useAuth } from "../contexts/AuthContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400 tracking-wide animate-pulse">
          Restauration de la session en cours...
        </p>
      </div>
    );
  }

  // We keep the !user check to prevent rendering the dashboard content
  // before the user data is loaded by the AuthContext, even if middleware
  // protects the route (middleware only guarantees the token exists, not
  // that the user object is already fetched in React state).
  if (!user) {
    return null;
  }

  return <>{children}</>;
}

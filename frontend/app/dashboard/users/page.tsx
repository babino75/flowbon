"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

type UserDeptLink = { department_id: string; is_primary: boolean; department?: { name: string } };
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  scope_type: string;
  scope_id?: string;
  is_active: boolean;
  is_backup_manager: boolean;
  is_backup_accountant: boolean;
  is_backup_cashier?: boolean;
  department_links?: UserDeptLink[];
};

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "🌍 Global",
  DEPARTMENT: "🏢 Département",
  PROJECT: "📁 Projet",
  TREASURY: "💰 Trésorerie",
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data as User[]);
    } catch {
      setError("Impossible de rafraîchir la liste des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await api.deactivateUser(userId);
        setActionMessage("Utilisateur désactivé avec succès.");
      } else {
        await api.activateUser(userId);
        setActionMessage("Utilisateur activé avec succès.");
      }
      setTimeout(() => setActionMessage(null), 3000);
      await refreshUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de modifier le statut de l'utilisateur.");
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!['admin', 'super_admin', 'manager'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Accès refusé</h1>
          <p className="mt-4 text-slate-600">Vous n'avez pas l'autorisation de voir cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            ← Retour au Tableau de bord
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Annuaire de l'Équipe</h1>
            <p className="mt-2 text-slate-600">Consultez les membres de votre entreprise et gérez leurs accès.</p>
          </div>
          <div className="flex gap-3">
            {['admin', 'super_admin'].includes(user.role) && (
              <Link
                href="/dashboard/organisation"
                className="inline-flex items-center justify-center rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ⚙️ Gérer les droits
              </Link>
            )}
            <Link
              href="/dashboard/users/invite"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              ➕ Inviter un membre
            </Link>
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>}
        
        {actionMessage && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-6 flex justify-between">
          {actionMessage}
          <button onClick={() => setActionMessage(null)} className="font-bold">✕</button>
        </div>}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Chargement de l'annuaire...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Aucun utilisateur trouvé.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-sm font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="px-6 py-4">Utilisateur</th>
                    <th className="px-6 py-4">Rôle & Droits</th>
                    <th className="px-6 py-4">Périmètre</th>
                    <th className="px-6 py-4">Départements</th>
                    <th className="px-6 py-4 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{u.name}</div>
                            <div className="text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                            u.role === 'admin' || u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'accountant' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {u.role === 'admin' ? 'Administrateur' : u.role === 'manager' ? 'Manager' : u.role === 'accountant' ? 'Comptable' : 'Employé'}
                          </span>
                          {u.is_backup_manager && <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">Sup. Manager</span>}
                          {u.is_backup_accountant && <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-teal-100 text-teal-800">Sup. Comptable</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {SCOPE_LABELS[u.scope_type] || u.scope_type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {!u.department_links || u.department_links.length === 0 ? (
                            <span className="text-slate-400 italic text-xs">Aucun</span>
                          ) : (
                            u.department_links.map(dl => (
                              <span key={dl.department_id} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200 whitespace-nowrap">
                                {dl.department?.name || 'Inconnu'}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        {['admin', 'super_admin'].includes(user.role) && u.id !== user.id ? (
                          <button
                            onClick={() => toggleActive(u.id, u.is_active)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                              u.is_active 
                                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" 
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            {u.is_active ? "Désactiver l'accès" : "Réactiver l'accès"}
                          </button>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          }`}>
                            {u.is_active ? "Actif" : "Inactif"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

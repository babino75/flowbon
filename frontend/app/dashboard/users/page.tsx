"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_backup_manager: boolean;
  is_backup_accountant: boolean;
};

const roles = ["employee", "manager", "accountant", "admin"];

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [roleUpdates, setRoleUpdates] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getUsers()
      .then((data) => setUsers(data as User[]))
      .catch(() => setError("Impossible de charger la liste des utilisateurs."))
      .finally(() => setLoading(false));
  }, []);

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

  const handleRoleChange = (userId: string, selectedRole: string) => {
    setRoleUpdates((prev) => ({ ...prev, [userId]: selectedRole }));
  };

  const updateRole = async (userId: string) => {
    const newRole = roleUpdates[userId];
    if (!newRole) return;
    try {
      await api.updateUserRole(userId, { role: newRole });
      setActionMessage("Le rôle a été mis à jour.");
      await refreshUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le rôle.");
    }
  };

  const toggleBackupManager = async (userRow: User) => {
    try {
      await api.updateUserRole(userRow.id, {
        role: userRow.role,
        is_backup_manager: !userRow.is_backup_manager,
      });
      setActionMessage(`Droits de Manager suppléant pour ${userRow.name} mis à jour.`);
      await refreshUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour les droits.");
    }
  };

  const toggleBackupAccountant = async (userRow: User) => {
    try {
      await api.updateUserRole(userRow.id, {
        role: userRow.role,
        is_backup_accountant: !userRow.is_backup_accountant,
      });
      setActionMessage(`Droits de Comptable suppléant pour ${userRow.name} mis à jour.`);
      await refreshUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour les droits.");
    }
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await api.deactivateUser(userId);
        setActionMessage("Utilisateur désactivé.");
      } else {
        await api.activateUser(userId);
        setActionMessage("Utilisateur activé.");
      }
      await refreshUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de modifier le statut de l'utilisateur.");
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
          <p className="mt-4 text-slate-600">Vous devez être administrateur, manager ou super admin pour voir cette page.</p>
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
            <h1 className="text-3xl font-bold text-slate-900">Utilisateurs</h1>
            <p className="mt-2 text-slate-600">Gérez les membres de votre entreprise.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/users/invite"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Inviter ou ajouter un utilisateur
            </Link>
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">{error}</div>}
        {actionMessage && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-6">{actionMessage}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Rôle</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Droits Suppléants</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((userRow) => (
                    <tr key={userRow.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{userRow.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{userRow.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        <div className="flex items-center gap-3">
                          <select
                            value={roleUpdates[userRow.id] ?? userRow.role}
                            onChange={(e) => handleRoleChange(userRow.id, e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                          >
                            {roles.map((roleOption) => (
                              <option key={roleOption} value={roleOption}>
                                {roleOption}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => updateRole(userRow.id)}
                            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            Mettre à jour
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {userRow.role === "admin" || userRow.role === "super_admin" ? (
                          <span className="text-xs text-slate-400 italic">Tous les droits (Admin)</span>
                        ) : userRow.role === "employee" ? (
                          <span className="text-xs text-slate-400 italic">Aucun droit suppléant (Employé)</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={userRow.is_backup_manager}
                                onChange={() => toggleBackupManager(userRow)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Manager suppléant</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={userRow.is_backup_accountant}
                                onChange={() => toggleBackupAccountant(userRow)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Comptable suppléant</span>
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex rounded-full px-3 py-1 font-medium ${userRow.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {userRow.is_active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => toggleActive(userRow.id, userRow.is_active)}
                          className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          {userRow.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

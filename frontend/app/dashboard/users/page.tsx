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

const roles = ["employee", "manager", "accountant", "cashier", "admin"];
const SCOPE_TYPES = ["GLOBAL", "DEPARTMENT", "TREASURY", "PROJECT"];

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [allDepts, setAllDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [roleUpdates, setRoleUpdates] = useState<Record<string, string>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [deptSelections, setDeptSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    Promise.all([
      api.getUsers(),
      api.getDepartments().catch(() => []),
    ])
      .then(([usersData, depts]) => {
        setUsers(usersData as User[]);
        setAllDepts(depts as any[]);
      })
      .catch(() => setError("Impossible de charger les données."))
      .finally(() => setLoading(false));
  }, []);

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const [data, depts] = await Promise.all([api.getUsers(), api.getDepartments().catch(() => [])]);
      setUsers(data as User[]);
      setAllDepts(depts as any[]);
    } catch {
      setError("Impossible de rafraîchir la liste des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  const updateScope = async (userRow: User, scopeType: string) => {
    try {
      await api.updateUserRole(userRow.id, { role: userRow.role, scope_type: scopeType, scope_id: scopeType !== "GLOBAL" ? userRow.scope_id : null });
      setActionMessage(`Périmètre de ${userRow.name} mis à jour.`);
      await refreshUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du périmètre.");
    }
  };

  const saveDeptAssignment = async (userRow: User) => {
    const ids = deptSelections[userRow.id] ?? (userRow.department_links || []).map((d: any) => d.department_id);
    try {
      await api.updateUserDepartments(userRow.id, ids);
      setActionMessage(`Départements de ${userRow.name} mis à jour.`);
      setExpandedUser(null);
      await refreshUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour des départements.");
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

  const toggleBackupCashier = async (userRow: User) => {
    try {
      await api.updateUserRole(userRow.id, {
        role: userRow.role,
        is_backup_cashier: !userRow.is_backup_cashier,
      });
      setActionMessage(`Droits de Caissier suppléant pour ${userRow.name} mis à jour.`);
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
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Périmètre</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Départements</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Droits Suppléants</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((userRow) => (
                    <tr key={userRow.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{userRow.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{userRow.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        <div className="flex items-center gap-2">
                          <select
                            value={roleUpdates[userRow.id] ?? userRow.role}
                            onChange={(e) => handleRoleChange(userRow.id, e.target.value)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                          >
                            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => updateRole(userRow.id)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
                            OK
                          </button>
                        </div>
                      </td>
                      {/* Scope column */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={userRow.scope_type || "GLOBAL"}
                          onChange={(e) => updateScope(userRow, e.target.value)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                        >
                          {SCOPE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      {/* Departments column */}
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          {(userRow.department_links || []).length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Aucun</span>
                          ) : (
                            (userRow.department_links || []).map((dl: any) => (
                              <span key={dl.department_id} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 font-medium">
                                {dl.department?.name || dl.department_id}
                                {dl.is_primary && <span className="text-indigo-400">★</span>}
                              </span>
                            ))
                          )}
                          <button
                            onClick={() => {
                              setExpandedUser(expandedUser === userRow.id ? null : userRow.id);
                              setDeptSelections(prev => ({ ...prev, [userRow.id]: (userRow.department_links || []).map((d: any) => d.department_id) }));
                            }}
                            className="mt-1 text-xs font-semibold text-indigo-600 hover:underline text-left"
                          >
                            {expandedUser === userRow.id ? "Fermer" : "Modifier"}
                          </button>
                          {expandedUser === userRow.id && (
                            <div className="mt-2 flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-200">
                              {allDepts.map((dept: any) => (
                                <label key={dept.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={(deptSelections[userRow.id] || []).includes(dept.id)}
                                    onChange={(e) => {
                                      setDeptSelections(prev => {
                                        const current = prev[userRow.id] || [];
                                        return { ...prev, [userRow.id]: e.target.checked ? [...current, dept.id] : current.filter(id => id !== dept.id) };
                                      });
                                    }}
                                    className="rounded border-slate-300 text-indigo-600"
                                  />
                                  {dept.name}
                                </label>
                              ))}
                              <button onClick={() => saveDeptAssignment(userRow)} className="mt-2 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors">
                                Enregistrer
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {userRow.role === "admin" || userRow.role === "super_admin" ? (
                          <span className="text-xs text-slate-400 italic">Tous les droits (Admin)</span>
                        ) : userRow.role === "employee" ? (
                          <span className="text-xs text-slate-400 italic">Aucun droit suppléant</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                              <input type="checkbox" checked={userRow.is_backup_manager} onChange={() => toggleBackupManager(userRow)} className="rounded border-slate-300 text-indigo-600" />
                              <span>Manager suppléant</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                              <input type="checkbox" checked={userRow.is_backup_accountant} onChange={() => toggleBackupAccountant(userRow)} className="rounded border-slate-300 text-indigo-600" />
                              <span>Comptable suppléant</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                              <input type="checkbox" checked={!!userRow.is_backup_cashier} onChange={() => toggleBackupCashier(userRow)} className="rounded border-slate-300 text-indigo-600" />
                              <span>Caissier suppléant</span>
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${userRow.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {userRow.is_active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleActive(userRow.id, userRow.is_active)}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
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

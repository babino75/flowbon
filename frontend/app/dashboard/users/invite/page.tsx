"use client";

import { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { api } from "../../../lib/api";

const roles = ["employee", "manager", "accountant", "admin"];

export default function InviteUserPage() {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("employee");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!['admin', 'super_admin'].includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Accès refusé</h1>
          <p className="mt-4 text-slate-600">Vous devez être administrateur de l'entreprise pour inviter ou ajouter des utilisateurs.</p>
        </div>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoadingInvite(true);

    try {
      await api.inviteUser({ email: inviteEmail, role: inviteRole });
      setStatus("Invitation envoyée avec succès.");
      setInviteEmail("");
      setInviteRole("employee");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer l'invitation.");
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoadingCreate(true);

    if (createPassword.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      setLoadingCreate(false);
      return;
    }

    try {
      await api.createUser({
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole,
      });
      setStatus("Utilisateur ajouté avec succès.");
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("employee");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter l'utilisateur.");
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900">Inviter ou créer un utilisateur</h1>
          <p className="mt-2 text-slate-600">Envoyez une invitation par email ou créez directement un compte pour un membre de votre équipe.</p>

          {error && <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
          {status && <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">{status}</div>}

          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Invitation par email</h2>
              <p className="mt-2 text-sm text-slate-600">L'invité recevra un lien sécurisé pour terminer sa création de compte.</p>
              <form className="mt-6 space-y-5" onSubmit={handleInvite}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Rôle</span>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  >
                    {roles.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={loadingInvite}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingInvite ? "Envoi..." : "Envoyer l'invitation"}
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Créer manuellement un utilisateur</h2>
              <p className="mt-2 text-sm text-slate-600">Créez directement un compte pour un membre de votre équipe.</p>
              <form className="mt-6 space-y-5" onSubmit={handleCreate}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Nom complet</span>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Mot de passe</span>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Rôle</span>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  >
                    {roles.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleOption}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={loadingCreate}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingCreate ? "Création..." : "Créer l'utilisateur"}
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

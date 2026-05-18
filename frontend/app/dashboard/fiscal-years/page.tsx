"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

type FiscalYear = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
  closed_at: string | null;
  total_expenses: number;
  total_paid: number;
  total_approved: number;
  pending_count: number;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
        Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
      🔒 Clôturé
    </span>
  );
}

export default function FiscalYearsPage() {
  const { user } = useAuth();
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFY, setNewFY] = useState({
    label: "",
    start_date: "",
    end_date: "",
  });

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  const loadFiscalYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFiscalYears() as FiscalYear[];
      setFiscalYears(data);
    } catch (err: any) {
      setError(err?.message || "Impossible de charger les exercices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiscalYears();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await api.createFiscalYear(newFY);
      setSuccess("Exercice comptable créé avec succès !");
      setShowCreateModal(false);
      setNewFY({ label: "", start_date: "", end_date: "" });
      await loadFiscalYears();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (fy: FiscalYear) => {
    if (!window.confirm(
      `Êtes-vous sûr de vouloir clôturer l'exercice "${fy.label}" ?\n\nCette action est irréversible. L'exercice passera en lecture seule.`
    )) return;

    setClosingId(fy.id);
    setError(null);
    try {
      await api.closeFiscalYear(fy.id);
      setSuccess(`Exercice "${fy.label}" clôturé avec succès.`);
      await loadFiscalYears();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la clôture.");
    } finally {
      setClosingId(null);
    }
  };

  // Auto-suggest label and dates for next year
  const suggestNextYear = () => {
    const currentYear = new Date().getFullYear();
    const latestYear = fiscalYears.length > 0
      ? Math.max(...fiscalYears.map(fy => parseInt(fy.label) || currentYear))
      : currentYear - 1;
    const nextYear = latestYear + 1;
    setNewFY({
      label: String(nextYear),
      start_date: `${nextYear}-01-01`,
      end_date: `${nextYear}-12-31`,
    });
    setShowCreateModal(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            ← Tableau de bord
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">📅 Exercices Comptables</h1>
            <p className="mt-2 text-slate-500 text-sm max-w-xl">
              Gérez les cycles annuels de dépenses de votre entreprise. Clôturez un exercice pour le geler en lecture seule et ouvrez le suivant sur de nouvelles bases.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={suggestNextYear}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
            >
              ➕ Nouvel exercice
            </button>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700 font-medium">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700 font-medium">
            ✅ {success}
          </div>
        )}

        {/* Fiscal Years List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-10 w-10 rounded-full border-b-2 border-indigo-600" />
          </div>
        ) : fiscalYears.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <span className="text-5xl mb-4 block">📋</span>
            <p className="text-slate-500 text-sm">Aucun exercice comptable configuré.</p>
            {isAdmin && (
              <button
                onClick={suggestNextYear}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                ➕ Créer le premier exercice
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {fiscalYears.map((fy) => (
              <div
                key={fy.id}
                className={`rounded-3xl border bg-white p-6 shadow-sm transition-all ${
                  fy.status === "open"
                    ? "border-emerald-200 ring-1 ring-emerald-100"
                    : "border-slate-200 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm ${
                      fy.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {fy.label.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900">Exercice {fy.label}</h2>
                        <StatusBadge status={fy.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Du {new Date(fy.start_date).toLocaleDateString("fr-FR")} au {new Date(fy.end_date).toLocaleDateString("fr-FR")}
                        {fy.closed_at && ` · Clôturé le ${new Date(fy.closed_at).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 flex-wrap text-center">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Bons</p>
                      <p className="text-lg font-bold text-slate-800">{fy.total_expenses}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Payé</p>
                      <p className="text-lg font-bold text-emerald-600">{fy.total_paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Approuvé</p>
                      <p className="text-lg font-bold text-blue-600">{fy.total_approved.toLocaleString()}</p>
                    </div>
                    {fy.pending_count > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 font-medium">En attente</p>
                        <p className="text-lg font-bold text-amber-600">{fy.pending_count}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin && fy.status === "open" && (
                    <button
                      onClick={() => handleClose(fy)}
                      disabled={closingId === fy.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {closingId === fy.id ? (
                        <span className="animate-spin h-3 w-3 rounded-full border-b-2 border-slate-500 inline-block" />
                      ) : "🔒"}
                      {closingId === fy.id ? "Clôture..." : "Clôturer l'exercice"}
                    </button>
                  )}
                </div>

                {/* Pending warning */}
                {fy.pending_count > 0 && fy.status === "open" && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <span>⚠️</span>
                    <span>
                      <strong>{fy.pending_count} bon(s)</strong> sont encore en brouillon ou en attente. Traitez-les avant de clôturer.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              <h2 className="text-xl font-bold text-slate-900 mb-6">📅 Nouvel exercice comptable</h2>
              <form onSubmit={handleCreate} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Libellé</span>
                  <input
                    type="text"
                    required
                    placeholder="ex: 2026"
                    value={newFY.label}
                    onChange={(e) => setNewFY((p) => ({ ...p, label: e.target.value }))}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Date de début</span>
                    <input
                      type="date"
                      required
                      value={newFY.start_date}
                      onChange={(e) => setNewFY((p) => ({ ...p, start_date: e.target.value }))}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Date de fin</span>
                    <input
                      type="date"
                      required
                      value={newFY.end_date}
                      onChange={(e) => setNewFY((p) => ({ ...p, end_date: e.target.value }))}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {creating ? "Création..." : "Créer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

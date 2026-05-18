"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

const ADVANCE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  pending: "En attente de validation",
  approved: "Approuvé (À décaisser)",
  disbursed: "Fonds remis (En cours)",
  rejected: "Rejeté",
  reconciled: "Clôturé (Rapproché)",
};

const ADVANCE_STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200 animate-pulse",
  approved: "bg-blue-50 text-blue-800 border-blue-200",
  disbursed: "bg-indigo-50 text-indigo-800 border-indigo-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  reconciled: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export default function AdvancesPage() {
  const { user } = useAuth();
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [companyCurrency, setCompanyCurrency] = useState("XOF");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchAdvances = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdvances(statusFilter ? { status_filter: statusFilter } : {});
      setAdvances(data as any[]);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des avances");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompany = async () => {
    try {
      const comp = await api.getCompany() as any;
      if (comp && comp.currency) {
        setCompanyCurrency(comp.currency);
      }
    } catch (err) {
      console.error("Impossible de récupérer la devise de l'entreprise", err);
    }
  };

  useEffect(() => {
    fetchAdvances();
    fetchCompany();
  }, [statusFilter]);

  const handleCreateAdvance = async (status: "draft" | "pending") => {
    setSubmitting(true);
    setModalError(null);
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Veuillez saisir un montant supérieur à 0.");
      }
      if (!description.trim()) {
        throw new Error("Veuillez saisir un motif ou une description.");
      }

      await api.createAdvance({
        amount: numAmount,
        currency: companyCurrency,
        description: description,
        status: status,
      });

      // Reset & Refresh
      setAmount("");
      setDescription("");
      setModalOpen(false);
      fetchAdvances();
    } catch (err: any) {
      setModalError(err.message || "Impossible de créer la demande d'avance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            ← Retour au Tableau de bord
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">💰 Avances de Caisse</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gérez les demandes de fonds préalables et justifiez vos dépenses au centime près.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            ➕ Demander une avance
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtrer par statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="pending">En attente de validation</option>
              <option value="approved">Approuvé (À décaisser)</option>
              <option value="disbursed">Fonds remis (En cours)</option>
              <option value="reconciled">Clôturé (Rapproché)</option>
              <option value="rejected">Rejeté</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Content Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-slate-500">Chargement des avances...</p>
          </div>
        ) : advances.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-5xl">💸</span>
            <h3 className="text-lg font-bold text-slate-800 mt-4">Aucune avance trouvée</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              {statusFilter
                ? "Aucune avance ne correspond au statut filtré."
                : "Vous n'avez soumis aucune demande d'avance. Initiez-en une en cliquant sur le bouton ci-dessus."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {user?.role !== "employee" && (
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Demandeur</th>
                    )}
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Montant</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Motif</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Statut</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                      {user?.role !== "employee" && (
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {adv.user?.name || "Inconnu"}
                        </td>
                      )}
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {parseFloat(adv.amount).toLocaleString()} {adv.currency}
                      </td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate">{adv.description || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ADVANCE_STATUS_BADGES[adv.status] || ADVANCE_STATUS_BADGES.draft}`}>
                          {ADVANCE_STATUS_LABELS[adv.status] || adv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(adv.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/advances/${adv.id}`}
                          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Rapprocher / Suivre
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">➕ Nouvelle demande d'avance</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {modalError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
                  {modalError}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Montant demandé ({companyCurrency})</label>
                <input
                  type="number"
                  placeholder="Ex: 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Description / Justification du besoin</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Frais de déplacement pour la mission à Cotonou..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleCreateAdvance("draft")}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Enregistrer en brouillon
              </button>
              <button
                type="button"
                onClick={() => handleCreateAdvance("pending")}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {submitting ? "Soumission..." : "Soumettre la demande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

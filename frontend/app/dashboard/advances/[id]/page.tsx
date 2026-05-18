"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { api } from "../../../lib/api";

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

const EXPENSE_STATUS_BADGES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-500 line-through",
};

const EXPENSE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  pending: "À valider",
  approved: "Approuvé",
  rejected: "Rejeté",
  paid: "Payé",
  cancelled: "Annulé",
};

export default function AdvanceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  const [advance, setAdvance] = useState<any | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchAdvanceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const adv = await api.getAdvance(id);
      setAdvance(adv);

      // Load expenses linked to this advance
      const allExpenses = await api.getExpenses({ advance_id: id });
      setExpenses(allExpenses as any[]);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des détails de l'avance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvanceDetails();
  }, [id]);

  const handleAction = async (actionFn: (id: string) => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    setActionFeedback(null);
    try {
      await actionFn(id);
      setActionFeedback(successMsg);
      await fetchAdvanceDetails();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors du traitement.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-500">Chargement de la fiche d'avance...</p>
      </div>
    );
  }

  if (error || !advance) {
    return (
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold text-slate-800 mt-4">Fiche d'avance introuvable</h2>
          <p className="text-sm text-slate-500 mt-1">{error || "Cette avance de caisse n'existe pas ou vous n'y avez pas accès."}</p>
          <Link href="/dashboard/advances" className="mt-6 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            Retourner aux avances de caisse
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = user?.id === advance.user_id;
  const balance = parseFloat(advance.balance);
  const matchedSum = parseFloat(advance.matched_expenses_sum);
  const advanceAmount = parseFloat(advance.amount);

  // Authorizations
  const canApprove = (user?.role && ["manager", "admin", "super_admin"].includes(user.role) || user?.is_backup_manager) && !isOwner;
  const canDisburse = (user?.role && ["accountant", "admin", "super_admin"].includes(user.role) || user?.is_backup_accountant) && !isOwner;
  const canReconcile = (user?.role && ["accountant", "admin", "super_admin"].includes(user.role) || user?.is_backup_accountant);

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <Link href="/dashboard/advances" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            ← Retour aux avances de caisse
          </Link>
        </div>

        {/* Action feedback */}
        {actionFeedback && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800 flex items-center gap-2">
            <span>✅</span>
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ADVANCE_STATUS_BADGES[advance.status] || ADVANCE_STATUS_BADGES.draft} mb-3`}>
              {ADVANCE_STATUS_LABELS[advance.status] || advance.status}
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{advance.description || "Demande d'avance"}</h1>
            <p className="text-xs text-slate-500 mt-1">
              Soumis par <span className="font-semibold text-slate-700">{advance.user?.name}</span> ({advance.user?.email}) le {new Date(advance.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="text-left md:text-right">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Montant Initial</label>
            <span className="text-3xl font-extrabold text-indigo-600">{advanceAmount.toLocaleString()} {advance.currency}</span>
          </div>
        </div>

        {/* Rapprochement Financier Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-800">📊 Rapprochement Financier</h2>
            <p className="text-xs text-slate-500 mt-0.5">Calcul en temps réel basé sur les justificatifs fournis par l'employé.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">1. Montant Avance</span>
                <p className="text-xl font-bold text-slate-800 mt-1">{advanceAmount.toLocaleString()} {advance.currency}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">2. Justifié (Factures)</span>
                <p className="text-xl font-bold text-indigo-600 mt-1">{matchedSum.toLocaleString()} {advance.currency}</p>
              </div>
              <div className="p-4 rounded-xl border text-center bg-indigo-50/30 border-indigo-100">
                <span className="text-xs font-semibold text-indigo-500 uppercase">3. Solde Restant</span>
                <p className={`text-xl font-black mt-1 ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {(balance >= 0 ? "+" : "")}{balance.toLocaleString()} {advance.currency}
                </p>
              </div>
            </div>

            {/* Reconciliation message */}
            {advance.status === "disbursed" && (
              <div className={`p-4 rounded-xl border text-sm flex gap-3 items-start ${balance > 0 ? "bg-amber-50 border-amber-100 text-amber-800" : balance < 0 ? "bg-red-50 border-red-100 text-red-800" : "bg-emerald-50 border-emerald-100 text-emerald-800"}`}>
                <span className="text-xl">{balance > 0 ? "⚠️" : balance < 0 ? "💸" : "✅"}</span>
                <div>
                  <h4 className="font-bold">{balance > 0 ? "Monnaie à restituer par l'employé" : balance < 0 ? "Remboursement de dépassement requis" : "Avance parfaitement équilibrée"}</h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    {balance > 0 && `L'employé doit restituer physiquement ${balance.toLocaleString()} ${advance.currency} au comptable pour clore ce dossier.`}
                    {balance < 0 && `L'entreprise doit rembourser le surplus de ${Math.abs(balance).toLocaleString()} ${advance.currency} à l'employé car les dépenses ont dépassé l'avance accordée.`}
                    {balance === 0 && `Le montant cumulé des factures correspond exactement à l'avance de caisse octroyée. Aucun transfert de fonds supplémentaire n'est requis.`}
                  </p>
                </div>
              </div>
            )}

            {advance.status === "reconciled" && (
              <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-100 text-emerald-800 text-sm flex gap-3 items-center">
                <span className="text-xl">🎉</span>
                <div>
                  <h4 className="font-bold">Dossier de rapprochement archivé</h4>
                  <p className="text-xs mt-0.5">Cette avance a été entièrement rapprochée, validée et clôturée en comptabilité.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linked Expenses / Justifications List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-800">📄 Justificatifs & Factures</h2>
              <p className="text-xs text-slate-500 mt-0.5">Bons de dépenses individuels rattachés à cette avance.</p>
            </div>
            {advance.status === "disbursed" && isOwner && (
              <Link
                href={`/dashboard/expenses/new?advance_id=${advance.id}`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                ➕ Ajouter une facture
              </Link>
            )}
          </div>
          {expenses.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl">🧾</span>
              <h4 className="text-sm font-bold text-slate-700 mt-3">Aucun justificatif lié</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {isOwner 
                  ? "Vous devez associer vos factures à cette avance active en créant de nouveaux bons de dépenses."
                  : "L'employé n'a pas encore lié de bons de dépenses à cette avance."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30">
                    <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Description</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Catégorie</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Statut</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase">Date</th>
                    <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <Link href={`/dashboard/expenses/${exp.id}`} className="hover:text-indigo-600 hover:underline">
                          {exp.description || "Dépense"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{exp.category || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${EXPENSE_STATUS_BADGES[exp.status] || "bg-gray-100"}`}>
                          {EXPENSE_STATUS_LABELS[exp.status] || exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(exp.expense_date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-right">
                        {parseFloat(exp.amount).toLocaleString()} {exp.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Decisive Action Panel */}
        {(advance.status !== "reconciled" && advance.status !== "rejected") && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">🛠️ Actions Administratives & Comptables</h3>
              <p className="text-xs text-slate-400 mt-0.5">Décidez du statut ou finalisez la clôture du rapprochement comptable.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Approval controls (Manager/Admin) */}
              {advance.status === "pending" && (
                <>
                  <button
                    onClick={() => handleAction(api.rejectAdvance, "La demande d'avance a été rejetée.")}
                    disabled={actionLoading || (!canApprove && !canDisburse)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40"
                  >
                    Rejeter
                  </button>
                  <button
                    onClick={() => handleAction(api.approveAdvance, "La demande d'avance a été approuvée avec succès. En attente de remise des fonds.")}
                    disabled={actionLoading || !canApprove}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-40 shadow-sm"
                  >
                    {isOwner ? "Auto-approbation bloquée" : "Approuver la demande"}
                  </button>
                </>
              )}

              {/* Disbursement controls (Accountant/Admin) */}
              {advance.status === "approved" && (
                <>
                  <button
                    onClick={() => handleAction(api.rejectAdvance, "La demande d'avance a été rejetée.")}
                    disabled={actionLoading || (!canApprove && !canDisburse)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-40"
                  >
                    Rejeter
                  </button>
                  <button
                    onClick={() => handleAction(api.disburseAdvance, "Les fonds ont été remis physiquement à l'employé. L'avance est désormais active.")}
                    disabled={actionLoading || !canDisburse}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-sm"
                  >
                    {isOwner ? "Auto-décaissement bloqué" : "Remettre les fonds (Payer)"}
                  </button>
                </>
              )}

              {/* Reconciliation closing controls (Accountant/Admin) */}
              {advance.status === "disbursed" && (
                <button
                  onClick={() => handleAction(api.reconcileAdvance, "L'avance a été rapprochée et clôturée définitivement.")}
                  disabled={actionLoading || !canReconcile}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-40 shadow-sm"
                >
                  Confirmer le rapprochement & Clôturer l'avance
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

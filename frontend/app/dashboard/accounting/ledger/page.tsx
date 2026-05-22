"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { api } from "../../../lib/api";
import Link from "next/link";

interface AccountingAccount {
  id: string;
  code: string;
  name: string;
}

interface LedgerEntry {
  id: string;
  accounting_account_id: string;
  reference_id: string | null;
  reference_type: string;
  description: string | null;
  debit: number;
  credit: number;
  transaction_date: string;
  account?: AccountingAccount;
}

export default function LedgerPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = user?.role === "admin" || user?.role === "super_admin" || user?.role === "accountant";

  useEffect(() => {
    if (!canManage) return;
    fetchLedger();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLedger() {
    setLoading(true);
    try {
      const data = await api.listLedgerEntries() as LedgerEntry[];
      setEntries(data);
    } catch (e: any) {
      setError("Impossible de charger le Grand Livre.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <p className="text-5xl mb-3">🔒</p>
          <p className="text-slate-600 font-semibold text-lg">Accès réservé aux Comptables et Administrateurs.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 transition-colors font-medium text-sm">← Retour au tableau de bord</Link>
        </div>
      </div>
    );
  }

  // Calcul des totaux
  const totalDebit = entries.reduce((acc, curr) => acc + Number(curr.debit), 0);
  const totalCredit = entries.reduce((acc, curr) => acc + Number(curr.credit), 0);
  const solde = totalDebit - totalCredit;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/accounting" className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-semibold">← Comptabilité</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-2xl">📓</span> Grand Livre
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="font-bold text-red-500 hover:text-red-700 ml-4 text-lg">×</button>
          </div>
        )}

        {/* Totaux */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Débit</p>
            <p className="text-2xl font-black text-slate-800">{totalDebit.toLocaleString("fr-FR")} XOF</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Crédit</p>
            <p className="text-2xl font-black text-slate-800">{totalCredit.toLocaleString("fr-FR")} XOF</p>
          </div>
          <div className={`rounded-2xl p-6 border shadow-sm ${solde === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              Balance (Débit - Crédit)
              {solde === 0 && <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Équilibré</span>}
              {solde !== 0 && <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">Déséquilibré</span>}
            </p>
            <p className={`text-2xl font-black ${solde === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {solde.toLocaleString("fr-FR")} XOF
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto">
            <p className="text-6xl mb-4">📖</p>
            <h2 className="text-2xl font-black text-slate-700 mb-2">Le Grand Livre est vide</h2>
            <p className="text-slate-500 mb-6 text-sm px-8">Les écritures comptables apparaîtront ici automatiquement lors du paiement des dépenses.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Compte</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Libellé</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Réf. Type</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Débit</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(entry.transaction_date).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-indigo-600">{entry.account?.code || "N/A"}</span>
                          <span className="text-xs text-slate-500">{entry.account?.name || "Compte supprimé"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 max-w-xs truncate">
                        {entry.description || "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                          {entry.reference_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-right text-slate-800 whitespace-nowrap">
                        {Number(entry.debit) > 0 ? Number(entry.debit).toLocaleString("fr-FR") : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-right text-slate-800 whitespace-nowrap">
                        {Number(entry.credit) > 0 ? Number(entry.credit).toLocaleString("fr-FR") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

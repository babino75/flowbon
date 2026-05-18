"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { translateStatus } from "../../lib/utils";

const statusOptions = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "paid",
  "cancelled",
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getExpenses({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setExpenses(data as any[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de charger les dépenses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await api.getCategories(true);
        setCategories(cats as any[]);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    fetchCats();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [statusFilter, categoryFilter, fromDate, toDate]);

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
            <h1 className="text-3xl font-bold text-slate-900">Dépenses</h1>
            <p className="mt-2 text-slate-600">Consultez et gérez vos bons de dépense.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/expenses/new"
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Nouvel expense
            </Link>
            <button
              type="button"
              onClick={fetchExpenses}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Statut</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              <option value="">Tous</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {translateStatus(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Catégorie</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
            >
              <option value="">Toutes</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Depuis</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Jusqu’à</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-6">{error}</div>
        )}

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
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employé</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Montant</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Catégorie</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-sm text-slate-500">
                        Aucun bon de dépense trouvé.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{expense.expense_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {expense.user ? (
                            <span title={expense.user.email}>{expense.user.name}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{expense.amount} {expense.currency}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{expense.category}</span>
                            {expense.advance_id && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                💰 Avance
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 capitalize">{translateStatus(expense.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/expenses/${expense.id}`}
                            className="inline-flex rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                          >
                            Voir
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

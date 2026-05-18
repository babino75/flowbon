"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { translateStatus } from "../../../lib/utils";

const statuses = ["draft", "pending"];

export default function NewExpensePage() {
  const [formData, setFormData] = useState({
    amount: "",
    tax_amount: "",
    currency: "XOF",
    category_id: "",
    description: "",
    expense_date: "",
    status: "draft",
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [activeAdvances, setActiveAdvances] = useState<any[]>([]);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [catsLoading, setCatsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Read query params safely to avoid Next.js Suspense de-optimization on build
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const advId = params.get("advance_id");
      if (advId) {
        setSelectedAdvanceId(advId);
      }
    }
  }, []);

  useEffect(() => {
    const initPage = async () => {
      try {
        const [cats, comp, advances] = await Promise.all([
          api.getCategories(true),
          api.getCompany(),
          api.getAdvances({ status_filter: "disbursed" }),
        ]);
        setCategories(cats as any[]);
        setActiveAdvances(advances as any[]);
        
        if ((cats as any[]).length > 0) {
          setFormData((prev) => ({
            ...prev,
            category_id: (cats as any[])[0].id,
            currency: (comp as any).currency || "XOF",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            currency: (comp as any).currency || "XOF",
          }));
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setCatsLoading(false);
      }
    };
    initPage();
  }, []);

  useEffect(() => {
    if (selectedAdvanceId && activeAdvances.length > 0) {
      const adv = activeAdvances.find((a) => a.id === selectedAdvanceId);
      if (adv && adv.category_id) {
        setFormData((prev) => ({
          ...prev,
          category_id: adv.category_id,
        }));
      }
    }
  }, [selectedAdvanceId, activeAdvances]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.category_id) {
      setError("Veuillez sélectionner une catégorie.");
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const data = {
        amount: Number(formData.amount),
        tax_amount: Number(formData.tax_amount) || 0,
        currency: formData.currency,
        category_id: formData.category_id,
        description: formData.description,
        expense_date: formData.expense_date,
        status: formData.status,
        advance_id: selectedAdvanceId || null,
      };
      const created = await api.createExpense(data) as any;
      
      if (files.length > 0 && created && created.id) {
        await api.uploadAttachments(created.id, files);
      }
      
      setMessage("Bon de dépense créé.");
      
      if (selectedAdvanceId) {
        // Redirect back to the cash advance details for a smooth reconciliation flow!
        router.push(`/dashboard/advances/${selectedAdvanceId}`);
      } else if (created && created.id) {
        router.push(`/dashboard/expenses/${created.id}`);
      } else {
        router.push("/dashboard/expenses");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de créer le bon de dépense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            Tableau de bord
          </Link>
          <span className="text-slate-300">/</span>
          <Link href="/dashboard/expenses" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            Dépenses
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-400">Nouveau</span>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Nouveau bon de dépense</h1>
            <p className="mt-2 text-slate-600">Créez un brouillon ou soumettez directement une dépense.</p>
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-6">{message}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Montant Total (TTC)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Devise (Définie par la société)</span>
                <input
                  type="text"
                  value={formData.currency}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 cursor-not-allowed focus:outline-none"
                  readOnly
                  disabled
                />
              </label>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Montant de la TVA (Facultatif)</span>
                <input
                  type="number"
                  step="0.01;0.05"
                  min="0"
                  placeholder="Laisser vide si inconnu"
                  value={formData.tax_amount}
                  onChange={(e) => handleChange("tax_amount", e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </label>
              <div className="hidden sm:block"></div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Catégorie</span>
                {catsLoading ? (
                  <div className="mt-2 text-slate-500 text-sm">Chargement des catégories...</div>
                ) : (
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleChange("category_id", e.target.value)}
                    disabled={!!selectedAdvanceId}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed text-sm"
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date de dépense</span>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => handleChange("expense_date", e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  required
                />
              </label>
            </div>

            {/* Optional cash advance dropdown */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Associer à une avance de caisse active (Facultatif)</span>
              <select
                value={selectedAdvanceId}
                onChange={(e) => setSelectedAdvanceId(e.target.value)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
              >
                <option value="">Aucune avance (Dépense standard)</option>
                {activeAdvances.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {parseFloat(adv.amount).toLocaleString()} {adv.currency} — {adv.description || "Sans motif"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                rows={4}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Justificatifs (pdf, png, jpg)</span>
              <input
                type="file"
                multiple
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(Array.from(e.target.files));
                  }
                }}
                className="mt-2 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Statut</span>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {translateStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/expenses"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Création..." : "Créer le bon"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

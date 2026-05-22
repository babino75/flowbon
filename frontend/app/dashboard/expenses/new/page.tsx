"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { translateStatus } from "../../../lib/utils";
import { useAuth } from "../../../contexts/AuthContext";

const statuses = ["draft", "pending"];

export default function NewExpensePage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    amount: "",
    tax_amount: "",
    currency: "XOF",
    category_id: "",
    department_id: "",
    project_id: "",
    description: "",
    expense_date: "",
    status: "draft",
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [userDepartments, setUserDepartments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeAdvances, setActiveAdvances] = useState<any[]>([]);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState("");
  const [activeFiscalYear, setActiveFiscalYear] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [catsLoading, setCatsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
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
        const [cats, comp, advances, activeFY, projs] = await Promise.all([
          api.getCategories(true).catch(() => []),
          api.getCompany(),
          api.getAdvances({ status_filter: "disbursed" }).catch(() => []),
          api.getActiveFiscalYear().catch(() => null),
          api.listProjects(false).catch(() => []),
        ]);
        setCategories(cats as any[]);
        setActiveAdvances(advances as any[]);
        setProjects(projs as any[]);

        if (activeFY) {
          setActiveFiscalYear(activeFY);
        }

        // Populate user departments from auth context
        const deptLinks = (user as any)?.department_links || [];
        setUserDepartments(deptLinks);
        if (deptLinks.length === 1) {
          // Auto-assign if only one department
          setFormData((prev) => ({ ...prev, department_id: deptLinks[0].department_id }));
        } else if (deptLinks.length > 1) {
          // Pre-select primary
          const primary = deptLinks.find((d: any) => d.is_primary);
          if (primary) setFormData((prev) => ({ ...prev, department_id: primary.department_id }));
        }

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
  }, [user]);

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
    if (field === "expense_date") {
      setDateError(null);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (activeFiscalYear && formData.expense_date) {
      const selectedYear = new Date(formData.expense_date).getFullYear();
      const startYear = new Date(activeFiscalYear.start_date).getFullYear();
      const endYear = new Date(activeFiscalYear.end_date).getFullYear();
      
      if (selectedYear < startYear || selectedYear > endYear) {
        if (startYear === endYear) {
          setDateError(`L'année doit être ${startYear} (exercice comptable en cours).`);
        } else {
          setDateError(`L'année doit être comprise entre ${startYear} et ${endYear} (exercice comptable en cours).`);
        }
        return;
      }
    }

    if (!formData.category_id) {
      setError("Veuillez sélectionner une catégorie.");
      return;
    }
    
    setError(null);
    setDateError(null);
    setMessage(null);
    setLoading(true);

    try {
      const data: Record<string, unknown> = {
        amount: Number(formData.amount),
        tax_amount: Number(formData.tax_amount) || 0,
        currency: formData.currency,
        category_id: formData.category_id,
        description: formData.description,
        expense_date: formData.expense_date,
        status: formData.status,
        advance_id: selectedAdvanceId || null,
      };
      if (formData.department_id) data.department_id = formData.department_id;
      if (formData.project_id) data.project_id = formData.project_id;
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

          {!activeFiscalYear && !loading && (
            <div className="mb-8 rounded-2xl bg-rose-50/70 border border-rose-100 p-5 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 animate-fade-in">
              <div className="flex gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full text-rose-500 shadow-sm border border-rose-100 flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18"></path></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-800 mb-1">Aucun exercice comptable actif</h3>
                  <p className="text-xs font-medium text-rose-600/80 leading-relaxed">
                    Il est impossible de créer une nouvelle dépense sans un exercice comptable ouvert pour la période actuelle.
                  </p>
                </div>
              </div>
              {user?.role === "admin" || user?.role === "super_admin" || user?.role === "accountant" ? (
                <Link href="/dashboard/accounting" className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-50 transition-colors shadow-sm">
                  <span>⚙️</span> Ouvrir l'exercice
                </Link>
              ) : (
                <p className="shrink-0 text-xs font-semibold text-slate-500 italic px-2 py-2 text-center sm:text-right">
                  Veuillez contacter votre administrateur.
                </p>
              )}
            </div>
          )}

          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-6">{message}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <fieldset disabled={!activeFiscalYear} className="space-y-6 group">
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
                  className={`mt-2 block w-full rounded-2xl border bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-indigo-500 ${
                    dateError ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-indigo-500"
                  }`}
                  required
                />
                {dateError && (
                  <p className="mt-2 text-xs text-red-500 font-medium">
                    {dateError}
                  </p>
                )}
              </label>
            </div>

            {/* Department dropdown — only shown when user belongs to multiple departments */}
            {userDepartments.length > 1 && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Département / Projet</span>
                <select
                  value={formData.department_id}
                  onChange={(e) => handleChange("department_id", e.target.value)}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
                  required
                >
                  <option value="">Sélectionner un département...</option>
                  {userDepartments.map((link: any) => (
                    <option key={link.department_id} value={link.department_id}>
                      {link.department?.name || link.department_id}
                      {link.is_primary ? " (Principal)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Project dropdown (Phase 4) */}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Projet (Facultatif)</span>
              <select
                value={formData.project_id}
                onChange={(e) => handleChange("project_id", e.target.value)}
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 text-sm"
              >
                <option value="">-- Aucun projet --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>


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
            </fieldset>
          </form>
        </div>
      </div>
    </main>
  );
}

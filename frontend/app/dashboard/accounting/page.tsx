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

export default function AccountingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"categories" | "sources" | "fiscal_years">("categories");

  // Shared state
  const [loading, setLoading] = useState(true);

  // Categories State
  const [categories, setCategories] = useState<any[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [catSuccess, setCatSuccess] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [togglingCategoryId, setTogglingCategoryId] = useState<string | null>(null);

  // Sources State
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState("BOTH");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceSuccess, setSourceSuccess] = useState<string | null>(null);
  const [creatingSource, setCreatingSource] = useState(false);
  const [togglingSourceId, setTogglingSourceId] = useState<string | null>(null);

  // Fiscal Years State
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [fyLoading, setFyLoading] = useState(false);
  const [fyError, setFyError] = useState<string | null>(null);
  const [fySuccess, setFySuccess] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [creatingFy, setCreatingFy] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFY, setNewFY] = useState({ label: "", start_date: "", end_date: "" });

  const isAdminOrAccountant = user?.role === "admin" || user?.role === "super_admin" || user?.role === "accountant";
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Data Loading
  const loadCategories = async () => {
    setCatsLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setCatsLoading(false);
    }
  };

  const loadSources = async () => {
    setSourcesLoading(true);
    try {
      const data = await api.listCashSources();
      setSources(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setSourcesLoading(false);
    }
  };

  const loadFiscalYears = async () => {
    setFyLoading(true);
    setFyError(null);
    try {
      const data = await api.getFiscalYears() as FiscalYear[];
      setFiscalYears(data);
    } catch (err: any) {
      setFyError(err?.message || "Impossible de charger les exercices.");
    } finally {
      setFyLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === "categories") loadCategories();
    else if (activeTab === "sources") loadSources();
    else if (activeTab === "fiscal_years") loadFiscalYears();
  }, [activeTab, user]);

  // Categories Handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || creatingCategory) return;
    setCreatingCategory(true);
    setCatError(null);
    setCatSuccess(null);
    try {
      await api.addCategory({ name: newCatName, code: newCatCode || undefined });
      setNewCatName("");
      setNewCatCode("");
      setCatSuccess("Catégorie ajoutée avec succès.");
      await loadCategories();
    } catch (err: any) {
      setCatError(err.message || "Erreur lors de l'ajout.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleToggleCategory = async (cat: any) => {
    if (togglingCategoryId) return;
    setTogglingCategoryId(cat.id);
    setCatError(null);
    setCatSuccess(null);
    try {
      await api.updateCategory(cat.id, { is_active: !cat.is_active });
      setCatSuccess(`Catégorie mise à jour.`);
      await loadCategories();
    } catch (err: any) {
      setCatError(err.message || "Erreur lors de la modification.");
    } finally {
      setTogglingCategoryId(null);
    }
  };

  // Sources Handlers
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || creatingSource) return;
    setCreatingSource(true);
    setSourceError(null);
    setSourceSuccess(null);
    try {
      await api.createCashSource({ name: newSourceName, type: newSourceType });
      setNewSourceName("");
      setNewSourceType("BOTH");
      setSourceSuccess("Source ajoutée.");
      await loadSources();
    } catch (err: any) {
      setSourceError(err.message || "Erreur lors de l'ajout.");
    } finally {
      setCreatingSource(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (togglingSourceId) return;
    if (!confirm("Voulez-vous vraiment désactiver cette source ?")) return;
    setTogglingSourceId(sourceId);
    setSourceError(null);
    setSourceSuccess(null);
    try {
      await api.deleteCashSource(sourceId);
      setSourceSuccess("Source désactivée.");
      await loadSources();
    } catch (err: any) {
      setSourceError(err.message || "Erreur lors de la désactivation.");
    } finally {
      setTogglingSourceId(null);
    }
  };

  // Fiscal Years Handlers
  const handleCreateFY = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingFy(true);
    setFyError(null);
    try {
      await api.createFiscalYear(newFY);
      setFySuccess("Exercice créé !");
      setShowCreateModal(false);
      setNewFY({ label: "", start_date: "", end_date: "" });
      await loadFiscalYears();
    } catch (err: any) {
      setFyError(err?.message || "Erreur lors de la création.");
    } finally {
      setCreatingFy(false);
    }
  };

  const handleCloseFY = async (fy: FiscalYear) => {
    if (!window.confirm(`Sûr de vouloir clôturer l'exercice "${fy.label}" ?`)) return;
    setClosingId(fy.id);
    setFyError(null);
    try {
      await api.closeFiscalYear(fy.id);
      setFySuccess(`Exercice "${fy.label}" clôturé.`);
      await loadFiscalYears();
    } catch (err: any) {
      setFyError(err?.message || "Erreur lors de la clôture.");
    } finally {
      setClosingId(null);
    }
  };

  const suggestNextYear = () => {
    const currentYear = new Date().getFullYear();
    const latestYear = fiscalYears.length > 0 ? Math.max(...fiscalYears.map(fy => parseInt(fy.label) || currentYear)) : currentYear - 1;
    const nextYear = latestYear + 1;
    setNewFY({ label: String(nextYear), start_date: `${nextYear}-01-01`, end_date: `${nextYear}-12-31` });
    setShowCreateModal(true);
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900"><p>Chargement...</p></div>;

  if (!isAdminOrAccountant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Accès refusé</h1>
          <p className="mt-4 text-slate-600">Vous devez être Administrateur ou Comptable pour voir cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            ← Tableau de bord
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Paramètres Comptables</h1>
            <p className="mt-2 text-slate-500 text-sm max-w-xl">
              Gérez le plan comptable, les sources de trésorerie et les exercices annuels de votre entreprise.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex border-b border-slate-200 overflow-x-auto">
          <Link
            href="/dashboard/accounting/plan"
            className="px-6 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap border-transparent text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
          >
            🗺️ Plan Comptable Unifié
            <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-md font-bold">NEW</span>
          </Link>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === "categories" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            🗂️ Catégories
          </button>
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === "sources" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            🏦 Sources de Trésorerie
          </button>
          <button
            onClick={() => setActiveTab("fiscal_years")}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeTab === "fiscal_years" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            📅 Exercices Comptables
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Ajouter une catégorie</h2>
              <p className="text-sm text-slate-600 mb-6">Ajoutez un nouveau compte au plan comptable pour catégoriser vos notes de frais.</p>
              {catError && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-4">{catError}</div>}
              {catSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-4">{catSuccess}</div>}
              <form onSubmit={handleAddCategory} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="block flex-1">
                  <span className="text-sm font-medium text-slate-700">Libellé du compte</span>
                  <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="ex: Frais d'impression" className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500" required />
                </label>
                <label className="block sm:w-48">
                  <span className="text-sm font-medium text-slate-700">Numéro de compte</span>
                  <input type="text" value={newCatCode} onChange={(e) => setNewCatCode(e.target.value)} placeholder="ex: 605" className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500" />
                </label>
                <button type="submit" disabled={creatingCategory || !newCatName.trim()} className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50">
                  {creatingCategory ? "Ajout..." : "Ajouter"}
                </button>
              </form>
            </div>
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Plan Comptable Actuel</h2>
              {catsLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600"></div></div>
              ) : categories.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucune catégorie disponible.</p>
              ) : (
                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Compte</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Libellé</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {categories.map((cat) => (
                        <tr key={cat.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-900">{cat.code || "—"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{cat.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cat.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                              {cat.is_active ? "Actif" : "Désactivé"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button onClick={() => handleToggleCategory(cat)} disabled={!!togglingCategoryId} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border disabled:opacity-50 ${cat.is_active ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100" : "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"}`}>
                              {togglingCategoryId === cat.id ? "..." : cat.is_active ? "Désactiver" : "Activer"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "sources" && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Ajouter une banque / source de trésorerie</h2>
              <p className="text-sm text-slate-600 mb-6">Configurez les comptes bancaires ou coffres qui alimenteront la caisse physique.</p>
              {sourceError && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-4">{sourceError}</div>}
              {sourceSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-4">{sourceSuccess}</div>}
              <form onSubmit={handleAddSource} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="block flex-1">
                  <span className="text-sm font-medium text-slate-700">Nom (ex: Banque Ecobank, Coffre principal)</span>
                  <input type="text" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-indigo-500" required />
                </label>
                <label className="block sm:w-64">
                  <span className="text-sm font-medium text-slate-700">Type d'opération autorisé</span>
                  <select value={newSourceType} onChange={(e) => setNewSourceType(e.target.value)} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-indigo-500">
                    <option value="BOTH">Les deux (Entrées & Sorties)</option>
                    <option value="ENTRY">Entrée uniquement</option>
                    <option value="EXIT">Sortie uniquement</option>
                  </select>
                </label>
                <button type="submit" disabled={creatingSource || !newSourceName.trim()} className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {creatingSource ? "Ajout..." : "Ajouter"}
                </button>
              </form>
            </div>
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Sources enregistrées</h2>
              {sourcesLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600"></div></div>
              ) : sources.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucune source disponible.</p>
              ) : (
                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Nom</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {sources.map((s) => (
                        <tr key={s.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{s.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s.type === "BOTH" ? "bg-amber-100 text-amber-800" : s.type === "ENTRY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                              {s.type === "BOTH" ? "Les deux" : s.type === "ENTRY" ? "Entrée" : "Sortie"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button onClick={() => handleDeleteSource(s.id)} disabled={!!togglingSourceId} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50">
                              Désactiver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "fiscal_years" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Périodes comptables</h2>
              {isAdmin && (
                <button onClick={suggestNextYear} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  ➕ Nouvel exercice
                </button>
              )}
            </div>
            
            {fyError && <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">⚠️ {fyError}</div>}
            {fySuccess && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-sm text-emerald-700">✅ {fySuccess}</div>}

            {fyLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin h-10 w-10 rounded-full border-b-2 border-indigo-600" /></div>
            ) : fiscalYears.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <span className="text-5xl mb-4 block">📅</span>
                <p className="text-slate-500 text-sm">Aucun exercice comptable configuré.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fiscalYears.map((fy) => (
                  <div key={fy.id} className={`rounded-3xl border bg-white p-6 shadow-sm transition-all ${fy.status === "open" ? "border-emerald-200 ring-1 ring-emerald-100" : "border-slate-200 opacity-80"}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${fy.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
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

                      <div className="flex gap-6 flex-wrap text-center">
                        <div><p className="text-xs text-slate-400 font-medium">Bons</p><p className="text-lg font-bold text-slate-800">{fy.total_expenses}</p></div>
                        <div><p className="text-xs text-slate-400 font-medium">Payé</p><p className="text-lg font-bold text-emerald-600">{fy.total_paid.toLocaleString()}</p></div>
                      </div>

                      {isAdmin && fy.status === "open" && (
                        <button onClick={() => handleCloseFY(fy)} disabled={closingId === fy.id} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                          {closingId === fy.id ? "Clôture..." : "🔒 Clôturer"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Création Exercice */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              <h2 className="text-xl font-bold text-slate-900 mb-6">📅 Nouvel exercice</h2>
              <form onSubmit={handleCreateFY} className="space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Année (Libellé)</span>
                  <input type="text" required value={newFY.label} onChange={(e) => setNewFY((p) => ({ ...p, label: e.target.value }))} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus:border-indigo-500 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Début</span>
                    <input type="date" required value={newFY.start_date} onChange={(e) => setNewFY((p) => ({ ...p, start_date: e.target.value }))} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Fin</span>
                    <input type="date" required value={newFY.end_date} onChange={(e) => setNewFY((p) => ({ ...p, end_date: e.target.value }))} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50">Annuler</button>
                  <button type="submit" disabled={creatingFy} className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50">{creatingFy ? "..." : "Créer"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

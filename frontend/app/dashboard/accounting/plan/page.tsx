"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";

type PlanItem = {
  account_id: string;
  account_code: string;
  account_name: string;
  category_id: string | null;
  category_name: string | null;
  is_active: boolean;
};

export default function AccountingPlanPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    category_name: "",
    category_description: "",
  });

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAccountingPlan();
      setItems(data as PlanItem[]);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement du plan comptable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createAccountingPlanItem(formData);
      setShowModal(false);
      setFormData({ account_code: "", account_name: "", category_name: "", category_description: "" });
      fetchPlan();
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (categoryId: string) => {
    if (!confirm("Voulez-vous supprimer le lien entre cette catégorie et ce compte ?")) return;
    setActionLoadingId(categoryId);
    try {
      await api.deletePlanItemMapping(categoryId);
      fetchPlan();
    } catch (err: any) {
      alert(err.message || "Impossible de supprimer le mapping.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if ((user as any)?.role !== "accountant" && (user as any)?.role !== "admin" && (user as any)?.role !== "super_admin") {
    return (
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="mx-auto max-w-3xl text-center p-12">
          <span className="text-5xl">🔒</span>
          <h2 className="text-xl font-bold text-slate-800 mt-4">Accès refusé</h2>
          <p className="text-sm text-slate-500 mt-1">Cette page est réservée aux comptables et administrateurs.</p>
          <Link href="/dashboard" className="mt-6 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800">
            ← Retour au tableau de bord
          </Link>
        </div>
      </main>
    );
  }

  const filtered = items.filter(
    (i) =>
      i.account_code.toLowerCase().includes(search.toLowerCase()) ||
      i.account_name.toLowerCase().includes(search.toLowerCase()) ||
      (i.category_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const mappedCount = items.filter((i) => i.category_name).length;
  const unmappedCount = items.filter((i) => !i.category_name).length;

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nouveau Compte Comptable</h3>
                <p className="text-xs text-slate-500 mt-0.5">Crée le compte, la catégorie et le lien en même temps.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section comptable */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Structure Comptable</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                    <input
                      type="text"
                      name="account_code"
                      required
                      placeholder="625100"
                      value={formData.account_code}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Libellé comptable *</label>
                    <input
                      type="text"
                      name="account_name"
                      required
                      placeholder="Frais de déplacement"
                      value={formData.account_name}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Flèche de liaison */}
              <div className="flex items-center gap-3 text-slate-300">
                <div className="flex-1 border-t border-dashed border-slate-200"></div>
                <span className="text-lg">↕</span>
                <div className="flex-1 border-t border-dashed border-slate-200"></div>
              </div>

              {/* Section catégorie */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">2</span>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Vue Collaborateur</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie visible *</label>
                  <input
                    type="text"
                    name="category_name"
                    required
                    placeholder="Transport"
                    value={formData.category_name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">C'est ce que vos collaborateurs verront. Gardez un langage simple.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {saving ? "Création..." : "✓ Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-slate-500 hover:text-indigo-600 transition-colors">Tableau de bord</Link>
          <span className="text-slate-300">/</span>
          <Link href="/dashboard/accounting" className="text-slate-500 hover:text-indigo-600 transition-colors">Comptabilité</Link>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-700">Plan Comptable Unifié</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Plan Comptable & Catégories</h1>
            <p className="mt-1 text-slate-500 text-sm">Le pont entre le langage de vos collaborateurs et votre comptabilité.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span> Nouveau Compte
          </button>
        </div>

        {/* Workflow explainer */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center">
            <div className="text-2xl mb-2">👤</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Collaborateur choisit</p>
            <p className="text-base font-bold text-slate-800">Transport</p>
            <p className="text-xs text-slate-400 mt-1">Langage simple</p>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 text-center flex flex-col items-center justify-center">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-1">FlowBon traduit</p>
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-indigo-700">
              <span>Transport</span>
              <span className="text-indigo-400">→</span>
              <span>625100</span>
            </div>
            <p className="text-xs text-indigo-400 mt-1">Automatiquement</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center">
            <div className="text-2xl mb-2">📒</div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Comptabilité obtient</p>
            <p className="text-base font-bold text-slate-800 font-mono">625100</p>
            <p className="text-xs text-slate-400 mt-1">Écriture propre</p>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && items.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {items.length} comptes
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {mappedCount} liés à une catégorie
            </span>
            {unmappedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                {unmappedCount} sans catégorie
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 mb-6 border border-red-100">⚠ {error}</div>
        )}

        {/* Search */}
        {!loading && items.length > 0 && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Rechercher par code, libellé ou catégorie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Main table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
              <p className="text-sm text-slate-500">Chargement du plan comptable...</p>
            </div>
          ) : filtered.length === 0 && items.length === 0 ? (
            <div className="p-16 text-center">
              <span className="text-5xl">🗂️</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Aucun compte configuré</h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
                Commencez par créer votre premier compte comptable et sa catégorie associée.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                + Nouveau Compte
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Aucun résultat pour "{search}".</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider w-32">Code</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Libellé Comptable</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        Catégorie Utilisateur
                        <span className="ml-1 text-slate-300">→ ce que voit l'employé</span>
                      </span>
                    </th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center w-24">Statut</th>
                    <th className="px-6 py-4 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item, idx) => (
                    <tr key={`${item.account_id}-${item.category_id || idx}`} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold text-sm">
                          {item.account_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 text-sm">{item.account_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {item.category_name ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">
                            🏷️ {item.category_name}
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 border border-dashed border-amber-300 rounded-full px-3 py-1 hover:bg-amber-50 transition-colors"
                          >
                            + Lier une catégorie
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${item.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                          {item.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.category_id && (
                          <button
                            onClick={() => handleUnlink(item.category_id!)}
                            disabled={actionLoadingId === item.category_id}
                            title="Dissocier la catégorie"
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            {actionLoadingId === item.category_id ? (
                              <span className="inline-block w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></span>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656-5.656" />
                              </svg>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

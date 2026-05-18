"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

export default function CompanyPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "categories">("general");
  const [company, setCompany] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    max_users: 10,
    currency: "XOF",
  });

  // Category State
  const [categories, setCategories] = useState<any[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [catError, setCatError] = useState<string | null>(null);
  const [catSuccess, setCatSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    api.getCompany()
      .then((data) => {
        setCompany(data as Record<string, unknown>);
        const companyData = data as Record<string, unknown>;
        setFormData({
          name: (companyData.name as string) || "",
          email: (companyData.email as string) || "",
          phone: (companyData.phone as string) || "",
          country: (companyData.country as string) || "",
          city: (companyData.city as string) || "",
          max_users: (companyData.max_users as number) || 10,
          currency: (companyData.currency as string) || "XOF",
        });
      })
      .catch(() => {
        setError("Impossible de charger les informations de l'entreprise.");
      })
      .finally(() => setLoading(false));
  }, [user]);

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

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    }
  }, [activeTab]);

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const updated = await api.updateCompany(formData);
      setCompany(updated as Record<string, unknown>);
      setMessage("Les informations de l'entreprise ont été mises à jour.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de mettre à jour l'entreprise.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatError(null);
    setCatSuccess(null);
    try {
      await api.addCategory({ name: newCatName, code: newCatCode || undefined });
      setNewCatName("");
      setNewCatCode("");
      setCatSuccess("Catégorie ajoutée avec succès.");
      await loadCategories();
    } catch (err: any) {
      setCatError(err.message || "Erreur lors de l'ajout de la catégorie.");
    }
  };

  const handleToggleCategory = async (cat: any) => {
    setCatError(null);
    setCatSuccess(null);
    try {
      await api.updateCategory(cat.id, { is_active: !cat.is_active });
      setCatSuccess(`La catégorie "${cat.name}" a été mise à jour.`);
      await loadCategories();
    } catch (err: any) {
      setCatError(err.message || "Erreur lors de la modification.");
    }
  };

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
          <p className="mt-4 text-slate-600">Vous devez être administrateur de l'entreprise pour voir cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            ← Retour au Tableau de bord
          </Link>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "general"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Informations générales
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "categories"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Catégories de dépenses
          </button>
        </div>

        {activeTab === "general" ? (
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900">Informations de l'entreprise</h1>
              <p className="mt-2 text-slate-600">Mettez à jour vos coordonnées et votre plan SaaS.</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSave}>
                {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>}
                {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">{message}</div>}

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Nom de l'entreprise</span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </label>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Pays</span>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleChange("country", e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Ville</span>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </label>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Téléphone</span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Utilisateurs max</span>
                    <input
                      type="number"
                      value={formData.max_users}
                      min={1}
                      onChange={(e) => handleChange("max_users", Number(e.target.value))}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Devise par défaut de l'entreprise</span>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                      className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    >
                      <option value="XOF">Franc CFA d'Afrique de l'Ouest (XOF)</option>
                      <option value="XAF">Franc CFA d'Afrique Centrale (XAF)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dollar Américain ($)</option>
                      <option value="CAD">Dollar Canadien (CAD)</option>
                      <option value="GBP">Livre Sterling (GBP)</option>
                    </select>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add Category Card */}
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Ajouter une catégorie</h2>
              <p className="text-sm text-slate-600 mb-6">Créez une nouvelle catégorie pour les notes de frais de vos employés.</p>

              {catError && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-4">{catError}</div>}
              {catSuccess && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-4">{catSuccess}</div>}

              <form onSubmit={handleAddCategory} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="block flex-1">
                  <span className="text-sm font-medium text-slate-700">Nom de la catégorie</span>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="ex: Frais d'impression"
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                  />
                </label>

                <label className="block sm:w-48">
                  <span className="text-sm font-medium text-slate-700">Code (Optionnel)</span>
                  <input
                    type="text"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                    placeholder="ex: PRINT"
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  />
                </label>

                <button
                  type="submit"
                  className="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Ajouter
                </button>
              </form>
            </div>

            {/* List Categories Card */}
            <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Catégories existantes</h2>

              {catsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600"></div>
                </div>
              ) : categories.length === 0 ? (
                <p className="text-slate-500 text-sm">Aucune catégorie disponible.</p>
              ) : (
                <div className="overflow-hidden border border-slate-200 rounded-2xl">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nom</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {categories.map((cat) => (
                        <tr key={cat.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{cat.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{cat.code || "—"}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                cat.is_active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {cat.is_active ? "Active" : "Désactivée"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleToggleCategory(cat)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                cat.is_active
                                  ? "border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                                  : "border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                              }`}
                            >
                              {cat.is_active ? "Désactiver" : "Activer"}
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
      </div>
    </main>
  );
}

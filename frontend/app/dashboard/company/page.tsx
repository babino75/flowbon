"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api, setToken } from "../../lib/api";

export default function CompanyPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("general");
  const [myCompanies, setMyCompanies] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [clientFormData, setClientFormData] = useState({ name: "", currency: "XOF" });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    max_users: 10,
    currency: "XOF",
    has_separate_cashier: false,
  });

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
          has_separate_cashier: (companyData.has_separate_cashier as boolean) || false,
        });
      })
      .catch(() => {
        setError("Impossible de charger les informations de l'entreprise.");
      })
      .finally(() => setLoading(false));

    setLoadingWorkspaces(true);
    api.getMyCompanies()
      .then((data) => setMyCompanies(data as any[]))
      .catch(() => {})
      .finally(() => setLoadingWorkspaces(false));
  }, [user]);

  const handleChange = (field: string, value: string | number | boolean) => {
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

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormData.name.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.createClientCompany({
        name: clientFormData.name,
        currency: clientFormData.currency,
        country: "Non défini",
        city: "Non défini",
        phone: "",
        email: user?.email || ""
      });
      setMessage(`L'espace client "${clientFormData.name}" a été créé avec succès.`);
      setShowCreateClientModal(false);
      setClientFormData({ name: "", currency: "XOF" });
      const comps = await api.getMyCompanies();
      setMyCompanies(comps as any[]);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de l'espace client.");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchCompany = async (companyId: string) => {
    setSaving(true);
    try {
      const res = await api.switchCompany(companyId) as any;
      if (res.access_token) {
        if (setToken) setToken(res.access_token);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      alert("Erreur lors du changement d'espace.");
    } finally {
      setSaving(false);
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

        <div className="mb-6 flex gap-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-2 py-3 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "general" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Informations générales
          </button>
          <button
            onClick={() => setActiveTab("workspaces")}
            className={`px-2 py-3 text-sm font-semibold transition-all border-b-2 ${
              activeTab === "workspaces" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            Mes Espaces Clients
          </button>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Informations de l'entreprise</h1>
            <p className="mt-2 text-slate-600">Mettez à jour vos coordonnées et votre plan SaaS.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-indigo-600"></div>
            </div>
          ) : activeTab === "general" ? (
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
                    type="type"
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
                  <span className="text-sm font-medium text-slate-700">
                    Utilisateurs max {user.role !== "super_admin" && "(Lecture seule)"}
                  </span>
                  <input
                    type="number"
                    value={formData.max_users}
                    min={1}
                    onChange={(e) => handleChange("max_users", Number(e.target.value))}
                    disabled={user.role !== "super_admin"}
                    className={`mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                      user.role !== "super_admin" ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50"
                    }`}
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

                <label className="block sm:col-span-2 flex items-center gap-3 mt-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.has_separate_cashier}
                    onChange={(e) => handleChange("has_separate_cashier", e.target.checked)}
                    className="w-5 h-5 rounded text-indigo-600 border-indigo-200 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="block text-sm font-semibold text-indigo-950">Séparation renforcée des rôles financiers (Comptable / Caissier)</span>
                    <span className="block text-xs text-indigo-700/80 mt-0.5">Si coché, les comptables valident la conformité des bons de dépenses et les caissiers procèdent aux décaissements physiques réels.</span>
                  </div>
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
          ) : (
            <div>
              {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">{error}</div>}
              {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-6">{message}</div>}

              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-slate-600">
                  Gérez vos différents espaces ou créez un nouvel espace client.
                </p>
                <button
                  onClick={() => setShowCreateClientModal(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  + Nouvel espace client
                </button>
              </div>

              {loadingWorkspaces ? (
                <div className="py-8 text-center text-slate-500 text-sm">Chargement de vos espaces...</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {myCompanies.map((c) => (
                    <div key={c.company.id} className={`p-5 rounded-2xl border ${c.company.id === company?.id ? "border-indigo-500 bg-indigo-50/30 shadow-sm" : "border-slate-200 bg-white"}`}>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-slate-900">{c.company.name}</h3>
                        {c.company.id === company?.id && (
                          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">Actif</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-1">Rôle: <span className="font-medium">{c.role}</span></p>
                      <p className="text-xs text-slate-500 mb-4">Abonnement: {c.company.subscription_plan} ({c.company.subscription_status})</p>
                      
                      {c.company.id !== company?.id && (
                        <button
                          onClick={() => handleSwitchCompany(c.company.id)}
                          disabled={saving}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                          Basculer vers cet espace
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Création Client */}
      {showCreateClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nouvel espace client</h3>
            <p className="text-sm text-slate-500 mb-6">Créez un nouvel espace de travail isolé pour gérer une autre entreprise.</p>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nom de l'entreprise</span>
                <input
                  type="text"
                  required
                  value={clientFormData.name}
                  onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="Ex: Client ABC"
                />
              </label>
              
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Devise principale</span>
                <select
                  value={clientFormData.currency}
                  onChange={(e) => setClientFormData({ ...clientFormData, currency: e.target.value })}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  <option value="XOF">XOF - Franc CFA</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollar</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreateClientModal(false)}
                  className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !clientFormData.name.trim()}
                  className="rounded-xl bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Création..." : "Créer l'espace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

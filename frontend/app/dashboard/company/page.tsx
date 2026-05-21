"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

export default function CompanyPage() {
  const { user } = useAuth();
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

        <div className="mb-6 flex border-b border-slate-200">
          <button
            className="px-6 py-3 text-sm font-semibold transition-all border-b-2 border-indigo-600 text-indigo-600"
          >
            Informations générales
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
          )}
        </div>
      </div>
    </main>
  );
}

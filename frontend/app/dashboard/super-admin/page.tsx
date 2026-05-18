"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api, setToken } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalStats {
  total_companies: number;
  total_users: number;
  total_active_users: number;
  total_expenses: number;
  total_expense_amount: number;
  total_advances_active: number;
  new_companies_this_month: number;
}

interface CompanyItem {
  id: string;
  name: string;
  email: string;
  country: string;
  subscription_plan: string;
  subscription_status: string;
  max_users: number;
  currency: string;
  user_count: number;
  created_at: string;
}

interface AuditLog {
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  detail: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_BADGES: Record<string, string> = {
  free: "bg-slate-100 text-slate-600 border-slate-200",
  premium: "bg-indigo-50 text-indigo-700 border-indigo-200",
  enterprise: "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_BADGES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
};

const ACTION_ICONS: Record<string, string> = {
  SUBSCRIPTION_UPDATE: "⚙️",
  IMPERSONATION_START: "👁️",
  COMPANY_PURGE: "🗑️",
  DEFAULT: "📋",
};

function formatNumber(n: number) {
  return n.toLocaleString("fr-FR");
}

function formatAmount(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

// ─── Subscription Edit Modal ──────────────────────────────────────────────────

function SubscriptionModal({
  company,
  onClose,
  onSave,
}: {
  company: CompanyItem;
  onClose: () => void;
  onSave: () => void;
}) {
  const [plan, setPlan] = useState(company.subscription_plan);
  const [subStatus, setSubStatus] = useState(company.subscription_status);
  const [maxUsers, setMaxUsers] = useState(company.max_users);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateCompanySubscription(company.id, {
        subscription_plan: plan,
        subscription_status: subStatus,
        max_users: maxUsers,
      });
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600">
          <h2 className="text-base font-bold text-white">⚙️ Modifier l'abonnement</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-bold">×</button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-slate-700 bg-slate-50 rounded-xl px-4 py-2">
            🏢 {company.name}
          </p>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan d'abonnement</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="free">🆓 Gratuit (Free)</option>
              <option value="premium">⭐ Premium</option>
              <option value="enterprise">🏆 Entreprise (Enterprise)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</label>
            <select
              value={subStatus}
              onChange={(e) => setSubStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">✅ Actif</option>
              <option value="trial">🕐 Période d'essai</option>
              <option value="suspended">🚫 Suspendu</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Limite de collaborateurs</label>
            <input
              type="number"
              min={1}
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value, 10))}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "💾 Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Impersonation state
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [impersonationBanner, setImpersonationBanner] = useState<{
    company: string;
    email: string;
    originalToken: string | null;
  } | null>(null);

  // Subscription modal
  const [editCompany, setEditCompany] = useState<CompanyItem | null>(null);

  // Purge modal states
  const [purgeCompanyItem, setPurgeCompanyItem] = useState<CompanyItem | null>(null);
  const [purgeConfirmName, setPurgeConfirmName] = useState("");
  const [purging, setPurging] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const handlePurge = async () => {
    if (!purgeCompanyItem) return;
    if (purgeConfirmName !== purgeCompanyItem.name) {
      setPurgeError("Le nom de l'entreprise saisi est incorrect.");
      return;
    }
    setPurging(true);
    setPurgeError(null);
    try {
      await api.purgeCompany(purgeCompanyItem.id);
      setPurgeCompanyItem(null);
      setPurgeConfirmName("");
      loadData();
    } catch (err: any) {
      setPurgeError(err.message || "Une erreur est survenue lors de la purge.");
    } finally {
      setPurging(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, a] = await Promise.all([
        api.getSuperAdminStats(),
        api.getSuperAdminCompanies(),
        api.getSuperAdminAuditLogs(),
      ]);
      setStats(s as GlobalStats);
      setCompanies(c as CompanyItem[]);
      setAuditLogs(a as AuditLog[]);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des données.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "super_admin") {
      router.replace("/dashboard");
      return;
    }
    loadData();
  }, [user, loadData, router]);

  const handleImpersonate = async (company: CompanyItem) => {
    setImpersonating(company.id);
    try {
      const res = await api.impersonateCompany(company.id) as any;
      // Store original token to restore later
      const { getToken } = await import("../../lib/api");
      const originalToken = getToken();

      // Set the impersonation token as the active token
      setToken(res.access_token);

      // Store context in sessionStorage for the banner
      sessionStorage.setItem("impersonation", JSON.stringify({
        active: true,
        companyName: res.target_company_name,
        adminEmail: res.target_admin_email,
        originalToken: originalToken,
        expiresIn: res.expires_in_minutes,
      }));

      // Reload to apply the new token context and show the banner
      router.push("/dashboard");
    } catch (err: any) {
      alert(`Erreur d'impersonation : ${err.message}`);
    } finally {
      setImpersonating(null);
    }
  };

  if (!user || user.role !== "super_admin") return null;

  const kpiCards = stats
    ? [
        {
          icon: "🏢",
          label: "Entreprises clientes",
          value: formatNumber(stats.total_companies),
          sub: `+${stats.new_companies_this_month} ce mois`,
          color: "from-indigo-500 to-violet-600",
        },
        {
          icon: "👥",
          label: "Utilisateurs actifs",
          value: formatNumber(stats.total_active_users),
          sub: `${formatNumber(stats.total_users)} inscrits au total`,
          color: "from-emerald-500 to-teal-600",
        },
        {
          icon: "📊",
          label: "Flux financier global",
          value: `${formatAmount(stats.total_expense_amount)} (multi-devises)`,
          sub: `${formatNumber(stats.total_expenses)} bons de dépenses`,
          color: "from-amber-500 to-orange-600",
        },
        {
          icon: "💰",
          label: "Avances de caisse actives",
          value: formatNumber(stats.total_advances_active),
          sub: "Approuvées ou en cours",
          color: "from-rose-500 to-pink-600",
        },
      ]
    : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/dashboard"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                ← Tableau de bord
              </Link>
            </div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white via-indigo-200 to-violet-300 bg-clip-text text-transparent">
              🛡️ Portail Super Admin
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Console de supervision globale de la plateforme FlowBon — Accès exclusif
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 transition-all"
          >
            🔄 Actualiser
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        {/* KPI Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <span className="text-sm text-slate-400">Chargement des données globales...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${card.color} shadow-lg`}
                >
                  <div className="absolute -top-4 -right-4 text-7xl opacity-10 select-none">{card.icon}</div>
                  <p className="text-2xl font-black text-white mb-1">{card.icon} {card.value}</p>
                  <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">{card.label}</p>
                  <p className="text-xs text-white/60 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Companies Table */}
            <div className="mb-10">
              <h2 className="text-xl font-bold text-white mb-4">🏢 Entreprises clientes ({companies.length})</h2>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Entreprise</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Statut</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Utilisateurs</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Devise</th>
                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Inscrite le</th>
                        <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {companies.map((company) => (
                        <tr key={company.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-5 py-4">
                            <p className="font-semibold text-white">{company.name}</p>
                            <p className="text-xs text-slate-400">{company.email}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${PLAN_BADGES[company.subscription_plan] || PLAN_BADGES.free}`}>
                              {company.subscription_plan === "free" && "🆓 Gratuit"}
                              {company.subscription_plan === "premium" && "⭐ Premium"}
                              {company.subscription_plan === "enterprise" && "🏆 Enterprise"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_BADGES[company.subscription_status] || STATUS_BADGES.active}`}>
                              {company.subscription_status === "active" && "✅ Actif"}
                              {company.subscription_status === "suspended" && "🚫 Suspendu"}
                              {company.subscription_status === "trial" && "🕐 Essai"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {company.user_count} / {company.max_users}
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded-lg text-slate-300">
                              {company.currency}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-400 text-xs">
                            {new Date(company.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditCompany(company)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 transition-all"
                              >
                                ⚙️ Abonnement
                              </button>
                              <button
                                onClick={() => handleImpersonate(company)}
                                disabled={impersonating === company.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 transition-all disabled:opacity-50"
                              >
                                {impersonating === company.id ? "..." : "👁️ Support"}
                              </button>
                              <button
                                onClick={() => setPurgeCompanyItem(company)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 transition-all"
                              >
                                🗑️ Purger
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {companies.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-16 text-center text-slate-500">
                            Aucune entreprise enregistrée sur la plateforme.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Audit Log */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4">📋 Journal d'audit global ({auditLogs.length} entrées)</h2>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    Aucune action enregistrée depuis le dernier redémarrage du serveur.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {auditLogs.map((log, i) => (
                      <div key={i} className="px-5 py-3 flex items-start gap-4 hover:bg-white/5 transition-colors">
                        <span className="text-xl mt-0.5">
                          {ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">
                              {log.action}
                            </span>
                            <span className="text-xs text-slate-400">
                              sur <strong className="text-slate-300">{log.target}</strong>
                            </span>
                            <span className="text-xs text-slate-500">
                              par {log.actor}
                            </span>
                          </div>
                          {log.detail && (
                            <p className="text-xs text-slate-500 mt-0.5">{log.detail}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-600 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subscription Edit Modal */}
      {editCompany && (
        <SubscriptionModal
          company={editCompany}
          onClose={() => setEditCompany(null)}
          onSave={loadData}
        />
      )}

      {/* Purge Confirmation Modal */}
      {purgeCompanyItem && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="px-6 py-4 border-b border-red-500/20 bg-gradient-to-r from-red-950/40 to-red-900/40 flex items-center justify-between">
              <h2 className="text-sm font-bold text-red-400">🚨 Purge complète et irréversible</h2>
              <button
                onClick={() => { setPurgeCompanyItem(null); setPurgeConfirmName(""); setPurgeError(null); }}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs text-red-200">
                ⚠️ <strong>ATTENTION :</strong> Cette action va supprimer <strong>définitivement</strong> :
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>L'entreprise <strong>{purgeCompanyItem.name}</strong></li>
                  <li>Tous ses utilisateurs associés</li>
                  <li>Toutes les notes de frais et justificatifs</li>
                  <li>Tous les fichiers d'images/factures physiques sur le disque</li>
                  <li>Tous les historiques d'approbation et avances</li>
                </ul>
              </div>

              {purgeError && (
                <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/20 rounded-xl px-4 py-2">
                  {purgeError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">
                  Pour valider, veuillez saisir le nom exact de l'entreprise :
                </label>
                <input
                  type="text"
                  placeholder={purgeCompanyItem.name}
                  value={purgeConfirmName}
                  onChange={(e) => setPurgeConfirmName(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex gap-2 justify-end">
              <button
                onClick={() => { setPurgeCompanyItem(null); setPurgeConfirmName(""); setPurgeError(null); }}
                disabled={purging}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-850 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handlePurge}
                disabled={purging || purgeConfirmName !== purgeCompanyItem.name}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {purging ? "Purge en cours..." : "🔥 Purger définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

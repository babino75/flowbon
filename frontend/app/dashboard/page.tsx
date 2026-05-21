"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { api, setToken } from "../lib/api";
import { CategoryPieChart, MonthlyTrendBarChart } from "./components/DashboardCharts";
import { translateStatus } from "../lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateRange(period: string) {
  const now = new Date();
  let fromDate = "", toDate = "";
  if (period === "month") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  } else if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    fromDate = new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0];
    toDate = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().split("T")[0];
  } else if (period === "year") {
    fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
    toDate = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
  }
  return fromDate && toDate ? `from_date=${fromDate}&to_date=${toDate}` : "";
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-100 hover:shadow-md transition-shadow duration-200">
      <div className="p-3.5 flex items-center gap-3">
        <div className={`flex-shrink-0 ${color} rounded-xl p-2.5 flex items-center justify-center`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-base font-black text-slate-800 mt-0.5 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActionLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <Link href={href} className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${color}`}>
      {label}
    </Link>
  );
}

function RecentExpensesTable({ expenses, showEmployee }: { expenses: any[]; showEmployee: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            {showEmployee && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employé</th>}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
            <th className="relative px-6 py-3"><span className="sr-only">Voir</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {expenses.length === 0 ? (
            <tr><td colSpan={showEmployee ? 6 : 5} className="px-6 py-8 text-center text-sm text-gray-500">Aucun bon récent.</td></tr>
          ) : expenses.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{e.expense_date}</td>
              {showEmployee && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {e.user ? <span title={e.user.email}>{e.user.name}</span> : <span className="italic text-gray-400">—</span>}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{e.amount} {e.currency}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{e.category}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  e.status === "paid" ? "bg-green-100 text-green-800" :
                  e.status === "approved" ? "bg-blue-100 text-blue-800" :
                  e.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  e.status === "rejected" ? "bg-red-100 text-red-800" :
                  e.status === "cancelled" ? "bg-gray-100 text-gray-500" :
                  "bg-slate-100 text-slate-600"
                }`}>{translateStatus(e.status)}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link href={`/dashboard/expenses/${e.id}`} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-full text-xs font-semibold">Voir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrialCountdownBanner({ trialExpiresAt }: { trialExpiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [progressPercent, setProgressPercent] = useState(100);

  useEffect(() => {
    const calculateTime = () => {
      const expiration = new Date(trialExpiresAt).getTime();
      const now = new Date().getTime();
      const difference = expiration - now;

      if (difference <= 0) {
        setTimeLeft("Expiré");
        setProgressPercent(0);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      // Calculate progress percentage assuming 7 days total (7 * 24 * 60 * 60 * 1000 ms)
      const totalTrialMs = 7 * 24 * 60 * 60 * 1000;
      const percent = Math.min(100, Math.max(0, (difference / totalTrialMs) * 100));
      setProgressPercent(percent);

      if (days > 0) {
        setTimeLeft(`${days} jour${days > 1 ? "s" : ""} et ${hours} heure${hours > 1 ? "s" : ""}`);
      } else {
        setTimeLeft(`${hours} heure${hours > 1 ? "s" : ""} et ${minutes} minute${minutes > 1 ? "s" : ""}`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000);
    return () => clearInterval(interval);
  }, [trialExpiresAt]);

  const isLowTime = progressPercent < 30; // Moins de 2 jours restants

  return (
    <div className="max-w-7xl mx-auto mt-6 px-4 sm:px-6 lg:px-8">
      <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-md shadow-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300 ${
        isLowTime 
          ? "bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10 border-red-500/30 text-red-900" 
          : "bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 border-indigo-500/30 text-indigo-900"
      }`}>
        {/* Glow effect */}
        <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isLowTime ? "bg-red-500" : "bg-indigo-500"}`}></div>

        <div className="flex items-center gap-4 z-10 w-full sm:w-auto">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
            isLowTime ? "bg-red-500 text-white animate-pulse" : "bg-indigo-600 text-white"
          }`}>
            ⏳
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-base leading-tight">
              {isLowTime ? "🚨 Votre période d'essai prend fin très bientôt !" : "🚀 Période d'essai gratuite active"}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Il vous reste <span className="font-semibold text-indigo-600 underline decoration-indigo-300 decoration-2">{timeLeft}</span> pour tester toutes les fonctionnalités de FlowBon.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 z-10 w-full sm:w-auto justify-between sm:justify-end">
          {/* Circular/Linear visual indicator */}
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isLowTime ? "bg-red-500" : "bg-indigo-600"}`} 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-semibold text-gray-500">Progression de l'essai</span>
          </div>

          <Link
            href="/dashboard/subscription-select"
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap ${
              isLowTime
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            Choisir mon forfait 💳
          </Link>
        </div>
      </div>
    </div>
  );
}


// ─── Role-specific dashboard sections ─────────────────────────────────────────

function EmployeeDashboard({ 
  summary, 
  recentExpenses, 
  loading, 
  currency,
  period,
  setPeriod,
  selectedStatus,
  setSelectedStatus,
  selectedCategory,
  setSelectedCategory,
  categories
}: any) {
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <QuickActionLink href="/dashboard/expenses/new" label="➕ Nouveau bon" color="bg-indigo-600 text-white hover:bg-indigo-700" />
        <QuickActionLink href="/dashboard/expenses" label="📋 Tous mes bons" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
        <QuickActionLink href="/dashboard/advances" label="💰 Avances de caisse" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
      </div>

      <DashboardFilterBar
        period={period}
        setPeriod={setPeriod}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        showEmployeeFilter={false}
      />

      {loading || !summary ? <LoadingSpinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard icon={<ClockIcon />} label="En attente" value={String(summary.pending_count)} color="bg-yellow-100 text-yellow-600 animate-fade-in" />
            <KpiCard icon={<CheckIcon />} label="Approuvés" value={String(summary.approved_count)} color="bg-blue-100 text-blue-600 animate-fade-in" />
            <KpiCard icon={<MoneyIcon />} label="Payés" value={String(summary.paid_count)} color="bg-green-100 text-green-600 animate-fade-in" />
            <KpiCard icon={<RejectedIcon />} label="Bon rejeté" value={String(summary.rejected_count || 0)} color="bg-red-100 text-red-600 animate-fade-in" />
          </div>
          <SectionCard title="Mes derniers bons" linkHref="/dashboard/expenses" linkLabel="Voir tout">
            <RecentExpensesTable expenses={recentExpenses} showEmployee={false} />
          </SectionCard>
        </>
      )}
    </>
  );
}

function ManagerDashboard({ 
  summary, 
  categoryData, 
  trendData, 
  recentExpenses, 
  loading, 
  isBackupAccountant, 
  onExportExcel, 
  onExportPdf, 
  exportingExcel, 
  exportingPdf, 
  currency,
  period,
  setPeriod,
  selectedStatus,
  setSelectedStatus,
  selectedCategory,
  setSelectedCategory,
  selectedEmployee,
  setSelectedEmployee,
  categories,
  employees
}: any) {
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <QuickActionLink href="/dashboard/expenses/new" label="➕ Nouveau bon" color="bg-indigo-600 text-white hover:bg-indigo-700" />
        <QuickActionLink href="/dashboard/expenses?status=pending" label="✅ Bons à valider" color="bg-yellow-500 text-white hover:bg-yellow-600" />
        {isBackupAccountant && (
          <>
            <QuickActionLink href="/dashboard/expenses?status=approved" label="💳 Bons à payer" color="bg-emerald-600 text-white hover:bg-emerald-700" />
            <button onClick={onExportExcel} disabled={exportingExcel} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {exportingExcel ? "Export Excel..." : "⬇ Exporter Excel"}
            </button>
            <button onClick={onExportPdf} disabled={exportingPdf} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
              {exportingPdf ? "Génération PDF..." : "📄 Rapport PDF"}
            </button>
          </>
        )}
        <QuickActionLink href="/dashboard/expenses" label="📋 Tous les bons" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
        <QuickActionLink href="/dashboard/advances" label="💰 Avances de caisse" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
        <QuickActionLink href="/dashboard/users" label="👥 Mon équipe" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
      </div>

      <DashboardFilterBar
        period={period}
        setPeriod={setPeriod}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedEmployee={selectedEmployee}
        setSelectedEmployee={setSelectedEmployee}
        categories={categories}
        employees={employees}
        showEmployeeFilter={true}
      />

      {loading || !summary ? <LoadingSpinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard icon={<ClockIcon />} label="En attente" value={String(summary.pending_count)} color="bg-yellow-100 text-yellow-600 animate-fade-in" />
            <KpiCard icon={<CheckIcon />} label="Approuvés" value={String(summary.approved_count)} color="bg-blue-100 text-blue-600 animate-fade-in" />
            <KpiCard icon={<RejectedIcon />} label="Bon Rejeté" value={String(summary.rejected_count || 0)} color="bg-red-100 text-red-600 animate-fade-in" />
            <KpiCard icon={<TotalIcon />} label="Total soumis" value={`${(summary.total_spent + summary.remaining_to_pay).toLocaleString()} ${currency}`} color="bg-gray-100 text-gray-600 animate-fade-in" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SectionCard title="Répartition par catégorie">
              <div className="p-4"><CategoryPieChart data={categoryData} /></div>
            </SectionCard>
            <SectionCard title="Évolution mensuelle">
              <div className="p-4"><MonthlyTrendBarChart data={trendData} /></div>
            </SectionCard>
          </div>
          <SectionCard title="Derniers bons de l'équipe" linkHref="/dashboard/expenses" linkLabel="Voir tout">
            <RecentExpensesTable expenses={recentExpenses} showEmployee={true} />
          </SectionCard>
        </>
      )}
    </>
  );
}

function ExportCenterCard({
  onExportPayrollExcel,
  onExportPayrollPdf,
  exportingPayrollExcel,
  exportingPayrollPdf,
  onExportRejectionsPdf,
  onExportAttachmentsZip,
  exportingRejectionsPdf,
  exportingAttachmentsZip
}: any) {
  const [activeTab, setActiveTab] = useState("paie"); // "paie" or "audit"

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between h-full hover:border-indigo-150 transition-colors">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>📊</span> Centre d'Exports
          </h3>
          <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] sm:text-xs">
            <button
              onClick={() => setActiveTab("paie")}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-semibold transition-all ${
                activeTab === "paie"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              👥 Paie (RH)
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-semibold transition-all ${
                activeTab === "audit"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🛡️ Audit
            </button>
          </div>
        </div>

        {activeTab === "paie" ? (
          <div>
            <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">
              Générez un état récapitulatif des remboursements de frais approuvés par employé pour la période et les filtres sélectionnés.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={onExportPayrollExcel}
                disabled={exportingPayrollExcel}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-semibold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {exportingPayrollExcel ? "Export..." : "⬇ Excel Paie"}
              </button>
              <button
                onClick={onExportPayrollPdf}
                disabled={exportingPayrollPdf}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-semibold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {exportingPayrollPdf ? "PDF..." : "📄 PDF Paie"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">
              Téléchargez en un clic tous les justificatifs (ZIP) et le registre des rejets motivés pour la période et les filtres sélectionnés.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={onExportRejectionsPdf}
                disabled={exportingRejectionsPdf}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-semibold shadow-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {exportingRejectionsPdf ? "PDF..." : "📄 Rejets PDF"}
              </button>
              <button
                onClick={onExportAttachmentsZip}
                disabled={exportingAttachmentsZip}
                className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-[11px] font-semibold shadow-sm bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {exportingAttachmentsZip ? "ZIP..." : "⬇ ZIP Reçus"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardFilterBar({
  period,
  setPeriod,
  selectedStatus,
  setSelectedStatus,
  selectedCategory,
  setSelectedCategory,
  selectedEmployee,
  setSelectedEmployee,
  categories,
  employees,
  showEmployeeFilter
}: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <span>🔍</span> Filtrer par :
        </span>

        {/* Date / Période */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="month">📅 Mois en cours</option>
          <option value="quarter">📅 Trimestre</option>
          <option value="year">📅 Année</option>
        </select>

        {/* Statut */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">🟢 Tous les statuts</option>
          <option value="pending">🟡 En attente</option>
          <option value="approved">🔵 Approuvés</option>
          <option value="paid">🟢 Payés</option>
          <option value="rejected">🔴 Rejetés</option>
        </select>

        {/* Catégorie */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">📂 Toutes les catégories</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              📂 {cat.name}
            </option>
          ))}
        </select>

        {/* Collaborateur (Admin / Comptable uniquement) */}
        {showEmployeeFilter && (
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[180px]"
          >
            <option value="">👥 Tous les collaborateurs</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                👤 {emp.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Bouton de réinitialisation si des filtres sont actifs */}
      {(selectedStatus || selectedCategory || selectedEmployee || period !== "month") && (
        <button
          onClick={() => {
            setSelectedStatus("");
            setSelectedCategory("");
            setSelectedEmployee("");
            setPeriod("month");
          }}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition duration-150 flex items-center gap-1 shadow-sm"
        >
          <span>🔄</span> Réinitialiser
        </button>
      )}
    </div>
  );
}

function CashierDashboard({
  summary,
  currency
}: any) {
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <QuickActionLink href="/dashboard/expenses?status=approved_accounting" label="💵 Bons à décaisser" color="bg-emerald-600 text-white hover:bg-emerald-700" />
          <QuickActionLink href="/dashboard/advances" label="💰 Avances de caisse" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/caisse" label="💵 Trésorerie & Caisses" color="bg-amber-500 text-white hover:bg-amber-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">Total Décaissé</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{summary?.total_paid?.toLocaleString() || 0} {currency}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">Bons visés par la comptabilité</p>
          <p className="text-3xl font-black text-amber-500 mt-2">{summary?.total_approved_accounting?.toLocaleString() || 0} bons</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-sm font-semibold text-slate-400">Avances actives (remises)</p>
          <p className="text-3xl font-black text-indigo-500 mt-2">{summary?.total_disbursed?.toLocaleString() || 0} avances</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">Derniers mouvements de caisse</h3>
        <p className="text-sm text-slate-500">Pour voir le détail de vos caisses physiques, allouer des fonds ou consulter l'historique complet des opérations, rendez-vous dans l'onglet <Link href="/dashboard/caisse" className="text-indigo-600 font-semibold underline">Trésorerie & Caisses</Link>.</p>
      </div>
    </>
  );
}

function AccountantDashboard({ 
  summary, 
  categoryData, 
  trendData, 
  recentExpenses, 
  loading, 
  onExportExcel, 
  onExportPdf, 
  exportingExcel, 
  exportingPdf, 
  isBackupManager, 
  currency,
  onExportPayrollExcel,
  onExportPayrollPdf,
  exportingPayrollExcel,
  exportingPayrollPdf,
  onExportRejectionsPdf,
  onExportAttachmentsZip,
  exportingRejectionsPdf,
  exportingAttachmentsZip,
  // filters props
  period,
  setPeriod,
  selectedStatus,
  setSelectedStatus,
  selectedCategory,
  setSelectedCategory,
  selectedEmployee,
  setSelectedEmployee,
  categories,
  employees
}: any) {
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <QuickActionLink href="/dashboard/expenses/new" label="➕ Nouveau bon" color="bg-indigo-600 text-white hover:bg-indigo-700" />
          {isBackupManager && (
            <QuickActionLink href="/dashboard/expenses?status=pending" label="✅ Bons à valider" color="bg-yellow-500 text-white hover:bg-yellow-600" />
          )}
          <QuickActionLink href="/dashboard/expenses?status=approved" label="💳 Bons à payer" color="bg-emerald-600 text-white hover:bg-emerald-700" />
          <QuickActionLink href="/dashboard/expenses" label="📋 Tous les bons" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/advances" label="💰 Avances de caisse" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/caisse" label="💵 Trésorerie & Caisses" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/accounting" label="⚙️ Param. Comptables" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
        </div>
        <div className="flex gap-2">
          <button onClick={onExportExcel} disabled={exportingExcel} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {exportingExcel ? "Excel..." : "⬇ Excel global"}
          </button>
          <button onClick={onExportPdf} disabled={exportingPdf} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
            {exportingPdf ? "PDF..." : "📄 Rapport PDF"}
          </button>
        </div>
      </div>

      <DashboardFilterBar
        period={period}
        setPeriod={setPeriod}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedEmployee={selectedEmployee}
        setSelectedEmployee={setSelectedEmployee}
        categories={categories}
        employees={employees}
        showEmployeeFilter={true}
      />

      {loading || !summary ? <LoadingSpinner /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={<MoneyIcon />} label="Total payé" value={`${summary.total_spent.toLocaleString()} ${currency}`} color="bg-green-100 text-green-600 animate-fade-in" />
              <KpiCard icon={<ClockIcon />} label="Restant à payer" value={`${summary.remaining_to_pay.toLocaleString()} ${currency}`} color="bg-orange-100 text-orange-600 animate-fade-in" />
              <KpiCard icon={<CheckIcon />} label="Bons approuvés" value={String(summary.approved_count)} color="bg-blue-100 text-blue-600 animate-fade-in" />
              <KpiCard icon={<TotalIcon />} label="Bons payés" value={String(summary.paid_count)} color="bg-emerald-100 text-emerald-600 animate-fade-in" />
            </div>
            <div className="md:col-span-1">
              <ExportCenterCard
                onExportPayrollExcel={onExportPayrollExcel}
                onExportPayrollPdf={onExportPayrollPdf}
                exportingPayrollExcel={exportingPayrollExcel}
                exportingPayrollPdf={exportingPayrollPdf}
                onExportRejectionsPdf={onExportRejectionsPdf}
                onExportAttachmentsZip={onExportAttachmentsZip}
                exportingRejectionsPdf={exportingRejectionsPdf}
                exportingAttachmentsZip={exportingAttachmentsZip}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SectionCard title="Répartition par catégorie">
              <div className="p-4"><CategoryPieChart data={categoryData} /></div>
            </SectionCard>
            <SectionCard title="Évolution mensuelle">
              <div className="p-4"><MonthlyTrendBarChart data={trendData} /></div>
            </SectionCard>
          </div>
          <SectionCard title="Derniers bons" linkHref="/dashboard/expenses" linkLabel="Voir tout">
            <RecentExpensesTable expenses={recentExpenses} showEmployee={true} />
          </SectionCard>
        </>
      )}
    </>
  );
}

function AdminDashboard({ 
  summary, 
  categoryData, 
  trendData, 
  recentExpenses, 
  loading, 
  onExportExcel, 
  onExportPdf, 
  exportingExcel, 
  exportingPdf, 
  currency,
  onExportPayrollExcel,
  onExportPayrollPdf,
  exportingPayrollExcel,
  exportingPayrollPdf,
  onExportRejectionsPdf,
  onExportAttachmentsZip,
  exportingRejectionsPdf,
  exportingAttachmentsZip,
  // filters props
  period,
  setPeriod,
  selectedStatus,
  setSelectedStatus,
  selectedCategory,
  setSelectedCategory,
  selectedEmployee,
  setSelectedEmployee,
  categories,
  employees
}: any) {
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <QuickActionLink href="/dashboard/expenses/new" label="➕ Nouveau bon" color="bg-indigo-600 text-white hover:bg-indigo-700" />
          <QuickActionLink href="/dashboard/expenses" label="📋 Tous les bons" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/advances" label="💰 Avances de caisse" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/caisse" label="💵 Trésorerie & Caisses" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/users" label="👥 Équipe" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/company" label="🏢 Société" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
          <QuickActionLink href="/dashboard/accounting" label="⚙️ Param. Comptables" color="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50" />
        </div>
        <div className="flex gap-2">
          <button onClick={onExportExcel} disabled={exportingExcel} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {exportingExcel ? "Excel..." : "⬇ Excel global"}
          </button>
          <button onClick={onExportPdf} disabled={exportingPdf} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
            {exportingPdf ? "PDF..." : "📄 Rapport PDF"}
          </button>
        </div>
      </div>

      <DashboardFilterBar
        period={period}
        setPeriod={setPeriod}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedEmployee={selectedEmployee}
        setSelectedEmployee={setSelectedEmployee}
        categories={categories}
        employees={employees}
        showEmployeeFilter={true}
      />

      {loading || !summary ? <LoadingSpinner /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={<TotalIcon />} label="Total dépensé" value={`${summary.total_spent.toLocaleString()} ${currency}`} color="bg-indigo-100 text-indigo-600 animate-fade-in" />
              <KpiCard icon={<MoneyIcon />} label="Restant à payer" value={`${summary.remaining_to_pay.toLocaleString()} ${currency}`} color="bg-orange-100 text-orange-600 animate-fade-in" />
              <KpiCard icon={<ClockIcon />} label="En attente" value={String(summary.pending_count)} color="bg-yellow-100 text-yellow-600 animate-fade-in" />
              <KpiCard icon={<ChartIcon />} label="Taux d'approbation" value={`${summary.approval_rate}%`} color="bg-emerald-100 text-emerald-600 animate-fade-in" />
            </div>
            <div className="md:col-span-1">
              <ExportCenterCard
                onExportPayrollExcel={onExportPayrollExcel}
                onExportPayrollPdf={onExportPayrollPdf}
                exportingPayrollExcel={exportingPayrollExcel}
                exportingPayrollPdf={exportingPayrollPdf}
                onExportRejectionsPdf={onExportRejectionsPdf}
                onExportAttachmentsZip={onExportAttachmentsZip}
                exportingRejectionsPdf={exportingRejectionsPdf}
                exportingAttachmentsZip={exportingAttachmentsZip}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SectionCard title="Répartition par catégorie">
              <div className="p-4"><CategoryPieChart data={categoryData} /></div>
            </SectionCard>
            <SectionCard title="Évolution mensuelle">
              <div className="p-4"><MonthlyTrendBarChart data={trendData} /></div>
            </SectionCard>
          </div>
          <SectionCard title="10 Derniers bons" linkHref="/dashboard/expenses" linkLabel="Voir tout">
            <RecentExpensesTable expenses={recentExpenses} showEmployee={true} />
          </SectionCard>
        </>
      )}
    </>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function LoadingSpinner() {
  return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
}

function SectionCard({ title, children, linkHref, linkLabel }: { title: string; children: React.ReactNode; linkHref?: string; linkLabel?: string }) {
  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {linkHref && <Link href={linkHref} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">{linkLabel}</Link>}
      </div>
      {children}
    </div>
  );
}

// SVG Icons
const ClockIcon = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckIcon = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const MoneyIcon = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TotalIcon = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ChartIcon = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const RejectedIcon = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

// ─── Main Page ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = { admin: "Administrateur", manager: "Manager", accountant: "Comptable", employee: "Employé" };
const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  accountant: "bg-emerald-100 text-emerald-800 border-emerald-200",
  employee: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState("month");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [summary, setSummary] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const [impersonation, setImpersonation] = useState<{
    active: boolean;
    companyName: string;
    adminEmail: string;
    originalToken: string | null;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const imp = sessionStorage.getItem("impersonation");
      if (imp) {
        setImpersonation(JSON.parse(imp));
      }
    }
  }, []);

  const handleExitImpersonation = () => {
    if (impersonation) {
      setToken(impersonation.originalToken);
      sessionStorage.removeItem("impersonation");
      router.push("/dashboard/super-admin");
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Poll notification count every 30 seconds
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const data = await api.getUnreadCount() as any;
        setUnreadCount(data.count || 0);
      } catch {}
    };
    const fetchRecent = async () => {
      try {
        const data = await api.getNotifications(1, 8) as any[];
        setRecentNotifs(data);
      } catch {}
    };
    fetchCount();
    fetchRecent();
    const interval = setInterval(() => { fetchCount(); fetchRecent(); }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const isEmployee = user?.role === "employee";
  const needsCharts = ["admin", "super_admin", "manager", "accountant"].includes(user?.role || "");
  const [companyCurrency, setCompanyCurrency] = useState("XOF");
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [company, setCompany] = useState<any>(null);



  // Load categories and employees on mount for filters
  useEffect(() => {
    if (!user) return;
    // Always load categories for everyone
    api.getCategories(true)
      .then(res => setCategories(res as any[]))
      .catch(err => console.error("Failed to load categories", err));

    // Load employees for roles that can filter employees
    if (["admin", "super_admin", "accountant", "manager"].includes(user.role) || user.is_backup_manager || user.is_backup_accountant) {
      api.getUsers()
        .then(res => setEmployees(res as any[]))
        .catch(err => console.error("Failed to load users", err));
    }
  }, [user]);

  // Construct dynamic filters query string (supports excluding status)
  const getFilterQueryString = (excludeStatus = false) => {
    // Les caissiers voient toujours l'historique complet pour ne rater aucun bon, peu importe la date
    let q = user?.role === "cashier" ? "" : buildDateRange(period);
    if (selectedStatus && !excludeStatus) {
      q += (q ? "&" : "") + `status=${selectedStatus}`;
    }
    if (selectedCategory) {
      q += (q ? "&" : "") + `category_id=${selectedCategory}`;
    }
    if (selectedEmployee) {
      q += (q ? "&" : "") + `user_id=${selectedEmployee}`;
    }
    return q;
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setDataLoading(true);
      setSubStatus(null);
      try {
        // Fetch company first to check subscription status (bypasses restriction)
        const compRes = await api.getCompany() as any;
        setCompany(compRes);
        setCompanyCurrency(compRes?.currency || "XOF");

        // Subscription guards for non-super-admins
        if (user.role !== "super_admin") {
          if (compRes?.subscription_status === "pending_selection") {
            if (user.role === "admin") {
              router.push("/dashboard/subscription-select");
              return;
            } else {
              setSubStatus("pending_selection");
              setDataLoading(false);
              return;
            }
          }

          if (compRes?.subscription_status === "suspended") {
            setSubStatus("suspended");
            setDataLoading(false);
            return;
          }

          if (compRes?.subscription_status === "trial") {
            const expiresAt = new Date(compRes.trial_expires_at);
            if (expiresAt < new Date()) {
              setSubStatus("trial_expired");
              setDataLoading(false);
              return;
            }
          }
        }

        // If active, load standard dashboard statistics
        const queryWithStatus = getFilterQueryString(false);
        const queryWithoutStatus = getFilterQueryString(true);

        // Recent expenses query should also include category & user filters!
        let recentQuery = queryWithStatus;
        if (!selectedStatus && user.role === "accountant") {
          recentQuery += "&status=approved";
        }

        const calls: Promise<any>[] = [
          api.getDashboardSummary(queryWithoutStatus),
          api.getDashboardRecentExpenses(recentQuery),
        ];
        if (needsCharts) {
          calls.push(api.getDashboardByCategory(queryWithStatus));
          calls.push(api.getDashboardMonthlyTrend(queryWithStatus));
        }
        const [sumRes, recentRes, catRes, trendRes] = await Promise.all(calls);
        setSummary(sumRes);
        setRecentExpenses(recentRes as any[]);
        if (needsCharts) {
          setCategoryData(catRes as any[]);
          setTrendData(trendRes as any[]);
        }
      } catch (err: any) {
        console.error("Dashboard load error", err);
        // Handle 402 responses directly from the backend
        if (err?.status === 402 || err?.message?.includes("trial_expired") || err?.message?.includes("pending_selection")) {
          if (err?.message?.includes("pending_selection")) {
            if (user.role === "admin") {
              router.push("/dashboard/subscription-select");
            } else {
              setSubStatus("pending_selection");
            }
          } else {
            setSubStatus("trial_expired");
          }
        }
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, [user, period, selectedStatus, selectedCategory, selectedEmployee, router]);

  if (!user) {
    return null;
  }

  if (subStatus) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>

          <div className="bg-slate-800/80 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-slate-700/50">
            <span className="text-4xl">⚠️</span>
          </div>

          {subStatus === "pending_selection" && (
            <>
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Configuration requise
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                L'abonnement de votre entreprise n'a pas encore été configuré. Veuillez contacter votre administrateur principal pour choisir une formule ou activer la période d'essai de 7 jours.
              </p>
            </>
          )}

          {subStatus === "trial_expired" && (
            <>
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                Période d'essai expirée
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                La période d'essai gratuite de 7 jours de votre entreprise (<strong>{company?.name}</strong>) a expiré.
                {user?.role === "admin"
                  ? " Pour continuer à gérer vos notes de frais et vos avances de caisse, veuillez souscrire à une formule supérieure."
                  : " Veuillez contacter votre administrateur principal pour régulariser l'abonnement."
                }
              </p>
              {user?.role === "admin" && (
                <Link
                  href="/dashboard/subscription-select"
                  className="block w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 transition duration-200 mb-4 text-center"
                >
                  Choisir un forfait 💳
                </Link>
              )}
            </>
          )}

          {subStatus === "suspended" && (
            <>
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Accès Suspendu
              </h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                L'abonnement de votre entreprise a été suspendu par l'administration FlowBon. Veuillez contacter le support technique ou votre administrateur principal pour réactiver l'accès.
              </p>
            </>
          )}

          <button
            onClick={logout}
            className="w-full py-3 px-6 rounded-xl border border-slate-805 hover:border-slate-700 text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-900/80 transition duration-200 text-sm font-semibold"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPayrollExcel, setExportingPayrollExcel] = useState(false);
  const [exportingPayrollPdf, setExportingPayrollPdf] = useState(false);
  const [exportingRejectionsPdf, setExportingRejectionsPdf] = useState(false);
  const [exportingAttachmentsZip, setExportingAttachmentsZip] = useState(false);

  const handleExportRejectionsPdf = async () => {
    setExportingRejectionsPdf(true);
    try {
      await api.exportRejectedExpensesPdf(buildDateRange(period));
    } catch {
      alert("Erreur lors de l'export du registre des rejets");
    } finally {
      setExportingRejectionsPdf(false);
    }
  };

  const handleExportAttachmentsZip = async () => {
    setExportingAttachmentsZip(true);
    try {
      await api.exportAttachmentsZip(buildDateRange(period));
    } catch {
      alert("Erreur lors de l'export des justificatifs");
    } finally {
      setExportingAttachmentsZip(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await api.exportExpensesExcel(buildDateRange(period));
    } catch {
      alert("Erreur lors de l'export Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await api.exportExpensesPdf(buildDateRange(period));
    } catch {
      alert("Erreur lors de l'export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportPayrollExcel = async () => {
    setExportingPayrollExcel(true);
    try {
      await api.exportPayrollExcel(buildDateRange(period));
    } catch {
      alert("Erreur lors de l'export Excel Paie");
    } finally {
      setExportingPayrollExcel(false);
    }
  };

  const handleExportPayrollPdf = async () => {
    setExportingPayrollPdf(true);
    try {
      await api.exportPayrollPdf(buildDateRange(period));
    } catch {
      alert("Erreur lors de l'export PDF Paie");
    } finally {
      setExportingPayrollPdf(false);
    }
  };

  const greetings: Record<string, string> = {
    employee: `Bonjour, ${user.name} 👋`,
    manager: `Tableau de bord Manager`,
    accountant: `Tableau de bord Comptabilité`,
    admin: `Vue d'ensemble — Administration`,
  };

  const dashboardProps = {
    summary,
    categoryData,
    trendData,
    recentExpenses,
    loading: dataLoading,
    onExportExcel: handleExportExcel,
    onExportPdf: handleExportPdf,
    exportingExcel,
    exportingPdf,
    onExportPayrollExcel: handleExportPayrollExcel,
    onExportPayrollPdf: handleExportPayrollPdf,
    exportingPayrollExcel,
    exportingPayrollPdf,
    onExportRejectionsPdf: handleExportRejectionsPdf,
    onExportAttachmentsZip: handleExportAttachmentsZip,
    exportingRejectionsPdf,
    exportingAttachmentsZip,
    period,
    setPeriod,
    selectedStatus,
    setSelectedStatus,
    selectedCategory,
    setSelectedCategory,
    selectedEmployee,
    setSelectedEmployee,
    categories,
    employees,
    isBackupAccountant: user.is_backup_accountant,
    isBackupManager: user.is_backup_manager,
    currency: companyCurrency,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Impersonation Banner */}
      {impersonation?.active && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-white shadow-sm flex items-center justify-between text-xs sm:text-sm font-semibold sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span>👁️</span>
            <span>
              <strong>Mode Support Actif</strong> — Vous êtes connecté sur l'espace client de{" "}
              <strong className="underline">{impersonation.companyName}</strong> ({impersonation.adminEmail})
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="px-3 py-1 rounded bg-white text-orange-700 font-bold hover:bg-orange-50 transition-colors shadow-sm whitespace-nowrap"
          >
            Quitter le support
          </button>
        </div>
      )}

      {/* Super Admin Announcement Banner */}
      {user.role === "super_admin" && !impersonation?.active && (
        <div className="bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-800 px-4 py-2 text-white shadow-sm flex items-center justify-between text-xs sm:text-sm font-medium sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span>
              <strong>Mode Super Administrateur détecté.</strong> Vous pouvez superviser l'ensemble de la plateforme.
            </span>
          </div>
          <Link
            href="/dashboard/super-admin"
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-all text-xs whitespace-nowrap"
          >
            Ouvrir la Console globale →
          </Link>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">FlowBon</span>
            </div>
            <div className="flex items-center space-x-3">
              {/* Bell notification */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); }}
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Notifications"
                >
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            await api.markAllNotificationsRead();
                            setUnreadCount(0);
                            setRecentNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Tout lire
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto py-1">
                      {recentNotifs.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-center text-gray-400">Aucune notification</p>
                      ) : (
                        recentNotifs.map((notif) => (
                          <Link
                            key={notif.id}
                            href={notif.link || "/dashboard/notifications"}
                            onClick={async () => {
                              setBellOpen(false);
                              if (!notif.read_at) {
                                await api.markNotificationRead(notif.id);
                                setUnreadCount((c) => Math.max(0, c - 1));
                              }
                            }}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${notif.read_at ? "opacity-60" : ""}`}
                          >
                            <span className="text-lg flex-shrink-0">
                              {notif.type === "expense_approved" ? "✅" : notif.type === "expense_rejected" ? "❌" : notif.type === "expense_paid" ? "💸" : "📝"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">{notif.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.message}</p>
                            </div>
                            {!notif.read_at && <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-indigo-500" />}
                          </Link>
                        ))
                      )}
                    </div>
                    <div className="border-t border-gray-100 py-2">
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setBellOpen(false)}
                        className="block px-4 py-2 text-xs text-center text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Voir toutes les notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-gray-100 transition-colors"
                >
                  {/* Avatar with initials */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${user.role === 'admin' ? 'bg-purple-500' : user.role === 'manager' ? 'bg-blue-500' : user.role === 'accountant' ? 'bg-emerald-500' : 'bg-gray-500'}`}>
                    {user.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    {/* Profile header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                      <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE[user.role] || ROLE_BADGE.employee}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </div>
                    {/* Menu items */}
                    <div className="py-1">
                      <Link
                        href="/dashboard/notifications"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        Notifications
                        {unreadCount > 0 && <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">{unreadCount}</span>}
                      </Link>
                      <Link
                        href="/dashboard/company"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        Ma société
                      </Link>
                      {["admin", "super_admin", "accountant"].includes(user?.role) && (
                        <Link
                          href="/dashboard/accounting"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Paramètres Comptables
                        </Link>
                      )}
                      <Link
                        href="/dashboard/suggestions"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Boîte de suggestions
                      </Link>
                      {["admin", "manager", "super_admin"].includes(user.role) && (
                        <Link
                          href="/dashboard/users"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Équipe
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={() => { setProfileOpen(false); logout(); }}
                        className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Trial Countdown Banner */}
      {user.role === "admin" && company?.subscription_status === "trial" && company?.trial_expires_at && (
        <TrialCountdownBanner trialExpiresAt={company.trial_expires_at} />
      )}

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{greetings[user.role] || `Bonjour, ${user.name}`}</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {user.role === "employee" && "Gérez vos bons de dépense et suivez leur statut."}
              {user.role === "manager" && "Validez les bons de votre équipe et suivez les dépenses."}
              {user.role === "accountant" && "Traitez les remboursements et exportez les données comptables."}
              {user.role === "admin" && "Supervision complète des dépenses et de l'organisation."}
            </p>
          </div>
        </div>

        {/* Role-specific content */}
        {user.role === "employee" && <EmployeeDashboard {...dashboardProps} />}
        {user.role === "manager" && <ManagerDashboard {...dashboardProps} />}
        {user.role === "accountant" && <AccountantDashboard {...dashboardProps} />}
        {user.role === "cashier" && <CashierDashboard {...dashboardProps} />}
        {(user.role === "admin" || user.role === "super_admin") && <AdminDashboard {...dashboardProps} />}
      </main>
    </div>
  );
}

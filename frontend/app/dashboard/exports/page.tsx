"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import DashboardFilterBar from "../components/DashboardFilterBar";

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

export default function ExportsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState("month");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCaisse, setSelectedCaisse] = useState("");
  
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [caisses, setCaisses] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "📄 Global / Général" },
    { id: "paie", label: "👥 Paie (RH)" },
    { id: "comptabilite", label: "📖 Comptabilité" },
    { id: "tresorerie", label: "💰 Trésorerie" },
    { id: "projets", label: "📈 Projets" },
    { id: "departements", label: "🏢 Depts" },
    { id: "audit", label: "🛡️ Audit" },
  ];

  // Load filters data
  useEffect(() => {
    if (!user) return;
    
    // Always load categories for everyone
    api.getCategories(true)
      .then((cats: any) => setCategories(cats))
      .catch(() => {});

    // Load employees, projects, departments and caisses for admin/accountant/manager
    if (user.role === "admin" || user.role === "accountant" || user.role === "manager") {
      api.getUsers()
        .then((data: any) => setEmployees(data.items || []))
        .catch(() => {});

      api.listProjects()
        .then((p: any) => setProjects(p || []))
        .catch(() => {});

      api.getDepartments()
        .then((d: any) => setDepartments(d || []))
        .catch(() => {});

      api.listCashSources()
        .then((c: any) => setCaisses(c || []))
        .catch(() => {});
    }
  }, [user]);

  // Export States
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPayrollExcel, setExportingPayrollExcel] = useState(false);
  const [exportingPayrollPdf, setExportingPayrollPdf] = useState(false);
  const [exportingRejectionsPdf, setExportingRejectionsPdf] = useState(false);
  const [exportingAttachmentsZip, setExportingAttachmentsZip] = useState(false);
  const [exportingLedgerExcel, setExportingLedgerExcel] = useState(false);
  const [exportingLedgerPdf, setExportingLedgerPdf] = useState(false);
  const [exportingTreasuryExcel, setExportingTreasuryExcel] = useState(false);
  const [exportingTreasuryPdf, setExportingTreasuryPdf] = useState(false);
  const [exportingProjectsExcel, setExportingProjectsExcel] = useState(false);
  const [exportingProjectsPdf, setExportingProjectsPdf] = useState(false);
  const [exportingDepartmentsExcel, setExportingDepartmentsExcel] = useState(false);
  const [exportingDepartmentsPdf, setExportingDepartmentsPdf] = useState(false);
  const [exportingAuditExcel, setExportingAuditExcel] = useState(false);
  const [exportingAuditPdf, setExportingAuditPdf] = useState(false);

  const buildExportQuery = (): string => {
    const params = new URLSearchParams(buildDateRange(period));
    if (selectedStatus) params.append("status", selectedStatus);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedEmployee) params.append("employee_id", selectedEmployee);
    if (selectedProject) params.append("project_id", selectedProject);
    if (selectedDepartment) params.append("department_id", selectedDepartment);
    if (selectedCaisse) params.append("caisse_id", selectedCaisse);
    return params.toString();
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await api.exportExpensesExcel(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Excel global");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await api.exportExpensesPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export PDF global");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportRejectionsPdf = async () => {
    setExportingRejectionsPdf(true);
    try {
      await api.exportRejectedExpensesPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export du registre des rejets");
    } finally {
      setExportingRejectionsPdf(false);
    }
  };

  const handleExportAttachmentsZip = async () => {
    setExportingAttachmentsZip(true);
    try {
      await api.exportAttachmentsZip(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export des justificatifs");
    } finally {
      setExportingAttachmentsZip(false);
    }
  };

  const handleExportPayrollExcel = async () => {
    setExportingPayrollExcel(true);
    try {
      await api.exportPayrollExcel(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Excel Paie");
    } finally {
      setExportingPayrollExcel(false);
    }
  };

  const handleExportPayrollPdf = async () => {
    setExportingPayrollPdf(true);
    try {
      await api.exportPayrollPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export PDF Paie");
    } finally {
      setExportingPayrollPdf(false);
    }
  };

  const handleExportLedgerExcel = async () => {
    setExportingLedgerExcel(true);
    try {
      await api.exportLedgerExcel(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Grand Livre Excel");
    } finally {
      setExportingLedgerExcel(false);
    }
  };

  const handleExportLedgerPdf = async () => {
    setExportingLedgerPdf(true);
    try {
      await api.exportLedgerPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Grand Livre PDF");
    } finally {
      setExportingLedgerPdf(false);
    }
  };

  const handleExportTreasuryExcel = async () => {
    setExportingTreasuryExcel(true);
    try {
      await api.exportTreasuryExcel(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Trésorerie Excel");
    } finally {
      setExportingTreasuryExcel(false);
    }
  };

  const handleExportTreasuryPdf = async () => {
    setExportingTreasuryPdf(true);
    try {
      await api.exportTreasuryPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Trésorerie PDF");
    } finally {
      setExportingTreasuryPdf(false);
    }
  };

  const handleExportProjectsExcel = async () => {
    setExportingProjectsExcel(true);
    try {
      await api.exportProjectsExcel(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Projets Excel");
    } finally {
      setExportingProjectsExcel(false);
    }
  };

  const handleExportProjectsPdf = async () => {
    setExportingProjectsPdf(true);
    try {
      await api.exportProjectsPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Projets PDF");
    } finally {
      setExportingProjectsPdf(false);
    }
  };

  const handleExportDepartmentsExcel = async () => {
    setExportingDepartmentsExcel(true);
    try {
      await api.exportDepartmentsExcel(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Départements Excel");
    } finally {
      setExportingDepartmentsExcel(false);
    }
  };

  const handleExportDepartmentsPdf = async () => {
    setExportingDepartmentsPdf(true);
    try {
      await api.exportDepartmentsPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Départements PDF");
    } finally {
      setExportingDepartmentsPdf(false);
    }
  };

  const handleExportAuditExcel = async () => {
    setExportingAuditExcel(true);
    try {
      await api.exportAuditExcel(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Audit Excel");
    } finally {
      setExportingAuditExcel(false);
    }
  };

  const handleExportAuditPdf = async () => {
    setExportingAuditPdf(true);
    try {
      await api.exportAuditPdf(buildExportQuery());
    } catch {
      alert("Erreur lors de l'export Audit PDF");
    } finally {
      setExportingAuditPdf(false);
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "accountant" && user.role !== "manager")) {
    return <div className="p-8 text-center text-slate-500">Accès non autorisé au Centre d'Exportation.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centre d'Exportation 📁</h1>
            <p className="text-sm text-slate-500 mt-1">Générez et téléchargez des rapports avancés selon vos filtres.</p>
          </div>
          <button 
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition shadow-sm text-sm"
          >
            Retour au Dashboard
          </button>
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
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          selectedCaisse={selectedCaisse}
          setSelectedCaisse={setSelectedCaisse}
          categories={categories}
          employees={employees}
          projects={projects}
          departments={departments}
          caisses={caisses}
          showEmployeeFilter={true}
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          
          <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-100 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[200px]">
            {activeTab === "general" && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Export Global des Bons de Dépenses</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-2xl">
                  Téléchargez une liste complète de tous les bons de dépenses (notes de frais, factures, avances) correspondant aux filtres actifs ci-dessus.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleExportExcel}
                    disabled={exportingExcel}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {exportingExcel ? "Génération en cours..." : "⬇ Télécharger Excel Global"}
                  </button>
                  <button
                    onClick={handleExportPdf}
                    disabled={exportingPdf}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  >
                    {exportingPdf ? "Génération en cours..." : "📄 Rapport PDF Global"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "paie" && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Export Paie (Ressources Humaines)</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-2xl">
                  Générez un état récapitulatif des remboursements de frais approuvés par employé.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportPayrollExcel} disabled={exportingPayrollExcel} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {exportingPayrollExcel ? "Export..." : "⬇ Excel Paie"}
                  </button>
                  <button onClick={handleExportPayrollPdf} disabled={exportingPayrollPdf} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {exportingPayrollPdf ? "PDF..." : "📄 PDF Paie"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "comptabilite" && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Grand Livre Comptable</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-2xl">
                  Exportez le grand livre comptable avec toutes les écritures pour la période sélectionnée.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportLedgerExcel} disabled={exportingLedgerExcel} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {exportingLedgerExcel ? "Export..." : "⬇ Excel Grand Livre"}
                  </button>
                  <button onClick={handleExportLedgerPdf} disabled={exportingLedgerPdf} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {exportingLedgerPdf ? "PDF..." : "📄 PDF Grand Livre"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "tresorerie" && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Mouvements de Trésorerie</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-2xl">
                  Exportez tous les mouvements de trésorerie (caisse, banque, mobile money) pour suivi et rapprochement.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportTreasuryExcel} disabled={exportingTreasuryExcel} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {exportingTreasuryExcel ? "Export..." : "⬇ Excel Trésorerie"}
                  </button>
                  <button onClick={handleExportTreasuryPdf} disabled={exportingTreasuryPdf} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {exportingTreasuryPdf ? "PDF..." : "📄 PDF Trésorerie"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "projets" && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Analyse par Projets</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-2xl">
                  Exportez l'analyse financière par projet : totaux dépenses, nombre de bons, comptes utilisés.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportProjectsExcel} disabled={exportingProjectsExcel} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {exportingProjectsExcel ? "Export..." : "⬇ Excel Projets"}
                  </button>
                  <button onClick={handleExportProjectsPdf} disabled={exportingProjectsPdf} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {exportingProjectsPdf ? "PDF..." : "📄 PDF Projets"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "departements" && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Analyse par Départements</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-2xl">
                  Exportez l'analyse financière par département : montants, catégories, comptes associés.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportDepartmentsExcel} disabled={exportingDepartmentsExcel} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {exportingDepartmentsExcel ? "Export..." : "⬇ Excel Départements"}
                  </button>
                  <button onClick={handleExportDepartmentsPdf} disabled={exportingDepartmentsPdf} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {exportingDepartmentsPdf ? "PDF..." : "📄 PDF Départements"}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "audit" && (
              <div className="animate-fade-in">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Traçabilité & Rejets (Audit)</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-2xl">
                  Téléchargez la traçabilité complète des validations, rejets et paiements, ou téléchargez tous les justificatifs (ZIP).
                </p>
                <div className="flex flex-wrap gap-4 mb-4">
                  <button onClick={handleExportRejectionsPdf} disabled={exportingRejectionsPdf} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
                    {exportingRejectionsPdf ? "PDF..." : "📄 Rejets PDF"}
                  </button>
                  <button onClick={handleExportAttachmentsZip} disabled={exportingAttachmentsZip} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors">
                    {exportingAttachmentsZip ? "ZIP..." : "⬇ ZIP Reçus"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button onClick={handleExportAuditExcel} disabled={exportingAuditExcel} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    {exportingAuditExcel ? "Export..." : "⬇ Audit complet Excel"}
                  </button>
                  <button onClick={handleExportAuditPdf} disabled={exportingAuditPdf} className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {exportingAuditPdf ? "PDF..." : "📄 Audit complet PDF"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

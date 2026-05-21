"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CashRegister {
  id: string;
  name: string;
  currency: string;
  current_balance: number;
  created_at: string;
  cashiers?: any[];
}

interface CashTransaction {
  id: string;
  cash_register_id: string;
  type: "ENTRY" | "EXIT";
  amount: number;
  source: string;
  description: string | null;
  reference_id: string | null;
  created_by: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

interface CashSource {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  replenishment: "Alimentation de caisse",
  refund: "Restitution de reliquat",
  expense: "Paiement note de frais",
  advance_payout: "Décaissement avance",
  adjustment: "Ajustement / Correction",
};

export default function CaissePage() {
  const { user, loading: authLoading } = useAuth();
  const [caisses, setCaisses] = useState<CashRegister[]>([]);
  const [selectedCaisse, setSelectedCaisse] = useState<CashRegister | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [sources, setSources] = useState<CashSource[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReplenishModal, setShowReplenishModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Forms state
  const [newCaisseName, setNewCaisseName] = useState("");
  const [txAmount, setTxAmount] = useState("");
  
  // Cashier Assignment state
  const [cashierUsers, setCashierUsers] = useState<any[]>([]);
  const [selectedCashierIds, setSelectedCashierIds] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [caisseToAssign, setCaisseToAssign] = useState<CashRegister | null>(null);
  const [txDesc, setTxDesc] = useState("");
  const [txSource, setTxSource] = useState("");
  const [saving, setSaving] = useState(false);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canManage = isAdmin || user?.role === "accountant" || user?.role === "cashier";

  const [activeFiscalYear, setActiveFiscalYear] = useState<any>(null);

  useEffect(() => {
    if (!canManage) return;
    initData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initData() {
    setLoading(true);
    const promises: Promise<any>[] = [fetchCaisses(), fetchSources(), fetchActiveFiscalYear()];
    if (isAdmin) {
      promises.push(fetchCashiers());
    }
    await Promise.all(promises);
    setLoading(false);
  }

  async function fetchCashiers() {
    try {
      const data = await api.getUsers() as any[];
      const cashiers = data.filter((u: any) => u.role === "cashier" && u.is_active);
      setCashierUsers(cashiers);
    } catch {
      console.error("Impossible de charger les caissiers.");
    }
  }

  async function fetchActiveFiscalYear() {
    try {
      const activeFY = await api.getActiveFiscalYear();
      if (activeFY) {
        setActiveFiscalYear(activeFY);
      }
    } catch {
      setActiveFiscalYear(null);
    }
  }

  async function fetchCaisses() {
    try {
      const data = await api.listCaisses() as CashRegister[];
      setCaisses(data);
      if (data.length > 0) {
        setSelectedCaisse(data[0]);
        fetchTransactions(data[0].id);
      }
    } catch {
      setError("Impossible de charger les caisses.");
    }
  }

  async function fetchTransactions(caisseId: string) {
    setTxLoading(true);
    try {
      const data = await api.getCaisseTransactions(caisseId) as CashTransaction[];
      setTransactions(data);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }

  async function fetchSources() {
    setSourcesLoading(true);
    try {
      const data = await api.listCashSources() as CashSource[];
      setSources(data);
      if (data.length > 0 && !txSource) {
        setTxSource(data[0].name);
      }
    } catch {
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  }

  // Handle files upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingFile(true);
    setUploadError(null);

    try {
      const result = await api.uploadCashJustificatif(file) as { file_url: string; file_name: string };
      setAttachmentUrl(result.file_url);
      setAttachmentName(result.file_name);
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors du téléversement.");
      setAttachmentUrl(null);
      setAttachmentName(null);
    } finally {
      setUploadingFile(false);
    }
  }

  const resetUploadState = () => {
    setAttachmentUrl(null);
    setAttachmentName(null);
    setUploadError(null);
    setUploadingFile(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function handleAssignCashiers() {
    if (!caisseToAssign) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.assignCashiersToCaisse(caisseToAssign.id, selectedCashierIds) as CashRegister;
      setCaisses((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      if (selectedCaisse?.id === updated.id) {
        setSelectedCaisse(updated);
      }
      setShowAssignModal(false);
      setCaisseToAssign(null);
      setSelectedCashierIds([]);
      setSuccessMsg("Caissiers assignés avec succès !");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'assignation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCaisse() {
    if (!newCaisseName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createCaisse({ 
        name: newCaisseName,
        cashier_ids: selectedCashierIds
      }) as CashRegister;
      setCaisses((prev) => [created, ...prev]);
      setSelectedCaisse(created);
      setTransactions([]);
      setNewCaisseName("");
      setSelectedCashierIds([]);
      setShowCreateModal(false);
      setSuccessMsg("Caisse créée avec succès !");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReplenish() {
    if (!selectedCaisse || !txAmount || !attachmentUrl) return;
    setSaving(true);
    setError(null);
    try {
      await api.replenishCaisse(selectedCaisse.id, {
        amount: parseFloat(txAmount),
        description: txDesc || undefined,
        source: txSource,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName || "justificatif.bin"
      });
      
      const updated = await api.listCaisses() as CashRegister[];
      setCaisses(updated);
      const found = updated.find((c) => c.id === selectedCaisse.id);
      if (found) setSelectedCaisse(found);
      fetchTransactions(selectedCaisse.id);
      
      setTxAmount(""); setTxDesc(""); 
      if (sources.length > 0) setTxSource(sources[0].name);
      resetUploadState();
      setShowReplenishModal(false);
      setSuccessMsg("Alimentation enregistrée avec succès !");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'alimentation.");
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw() {
    if (!selectedCaisse || !txAmount || !attachmentUrl) return;
    setSaving(true);
    setError(null);
    try {
      await api.withdrawCaisse(selectedCaisse.id, {
        amount: parseFloat(txAmount),
        description: txDesc || undefined,
        source: txSource,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName || "justificatif.bin"
      });
      
      const updated = await api.listCaisses() as CashRegister[];
      setCaisses(updated);
      const found = updated.find((c) => c.id === selectedCaisse.id);
      if (found) setSelectedCaisse(found);
      fetchTransactions(selectedCaisse.id);
      
      setTxAmount(""); setTxDesc("");
      if (sources.length > 0) setTxSource(sources[0].name);
      resetUploadState();
      setShowWithdrawModal(false);
      setSuccessMsg("Retrait enregistré avec succès !");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors du retrait.");
    } finally {
      setSaving(false);
    }
  }


  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <p className="text-5xl mb-3">🔒</p>
          <p className="text-slate-600 font-semibold text-lg">Accès réservé aux Comptables et Administrateurs.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 transition-colors font-medium text-sm">← Retour au tableau de bord</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors text-sm font-semibold">← Dashboard</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-2xl">💵</span> Trésorerie & Caisse
          </h1>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95">
            + Nouvelle caisse
          </button>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-center justify-between animate-shake">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="font-bold text-red-500 hover:text-red-700 ml-4 text-lg">×</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-sm flex items-center justify-between animate-fade-in">
            <span>✅ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-600 hover:text-emerald-800 ml-4 text-lg">×</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600" />
          </div>
        ) : caisses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto">
            <p className="text-6xl mb-4">🏦</p>
            <h2 className="text-2xl font-black text-slate-700 mb-2">Aucune caisse configurée</h2>
            <p className="text-slate-500 mb-6 text-sm px-8">Créez votre première caisse sécurisée pour commencer à enregistrer les entrées et sorties de trésorerie.</p>
            {isAdmin && (
              <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95">
                + Créer une caisse
              </button>
            )}
          </div>
        ) : (
          <>
            {/* KPI Cards — Caisses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {caisses.map((c) => (
                <button key={c.id} onClick={() => { setSelectedCaisse(c); fetchTransactions(c.id); }}
                  className={`rounded-2xl border-2 p-5 text-left transition-all shadow-sm hover:shadow-md ${selectedCaisse?.id === c.id ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">💼 {c.name}</p>
                  <p className={`text-2xl font-black ${Number(c.current_balance) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {Number(c.current_balance).toLocaleString("fr-FR")} <span className="text-base font-semibold">{c.currency}</span>
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400">Solde actuel en caisse</p>
                    {isAdmin && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCaisseToAssign(c); setSelectedCashierIds((c.cashiers || []).map((u: any) => u.id)); setShowAssignModal(true); }}
                        className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                      >
                        👥 Gérer caissiers
                      </button>
                    )}
                  </div>
                  {c.cashiers && c.cashiers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex -space-x-2 overflow-hidden">
                      {c.cashiers.map((cashier: any) => (
                        <div key={cashier.id} title={cashier.name} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {cashier.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Banner: Missing Active Fiscal Year */}
            {!activeFiscalYear && selectedCaisse && !loading && (
              <div className="mb-6 rounded-2xl bg-rose-50/70 border border-rose-100 p-5 backdrop-blur-sm shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 animate-fade-in">
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full text-rose-500 shadow-sm border border-rose-100 flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18"></path></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-800 mb-1">Aucun exercice comptable actif</h3>
                    <p className="text-xs font-medium text-rose-600/80 leading-relaxed">
                      Il est impossible d'effectuer une transaction manuelle sur la caisse sans un exercice comptable ouvert.
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

            {/* Action buttons */}
            {selectedCaisse && user?.role !== "accountant" && (
              <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={() => { resetUploadState(); if(sources.length > 0) setTxSource(sources[0].name); setShowReplenishModal(true); }}
                  disabled={!activeFiscalYear}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeFiscalYear
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-95"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}>
                  <span>📥</span> Bon d&apos;Entrée (Alimenter)
                </button>
                <button onClick={() => { resetUploadState(); if(sources.length > 0) setTxSource(sources[0].name); setShowWithdrawModal(true); }}
                  disabled={!activeFiscalYear}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeFiscalYear
                      ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-95"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}>
                  <span>📤</span> Retrait / Ajustement
                </button>
              </div>
            )}

            {/* Journal de Caisse */}
            {selectedCaisse && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    📒 Journal de Caisse — <span className="text-indigo-600">{selectedCaisse.name}</span>
                  </h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-bold">{transactions.length} écriture(s)</span>
                </div>

                {txLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <p className="text-4xl mb-3">📋</p>
                    <p className="text-sm font-medium">Aucune écriture dans le journal pour le moment.</p>
                    <p className="text-xs mt-1">Commencez par alimenter la caisse via un Bon d&apos;Entrée.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Heure</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                          <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                          <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Justificatif</th>
                          <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${tx.type === "ENTRY" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                {tx.type === "ENTRY" ? "▲ Entrée" : "▼ Sortie"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 whitespace-nowrap font-medium">
                              {SOURCE_LABELS[tx.source] || tx.source}
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-500 max-w-xs truncate">
                              {tx.description || <span className="italic text-slate-300">—</span>}
                            </td>
                            <td className="px-5 py-4 text-xs text-center whitespace-nowrap">
                              {tx.attachment_url ? (
                                <a href={`${API_URL}${tx.attachment_url}`} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-semibold bg-indigo-50 px-2 py-1 rounded-lg">
                                  📎 Reçu
                                </a>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">Auto (lié)</span>
                              )}
                            </td>
                            <td className={`px-5 py-4 text-sm font-bold text-right whitespace-nowrap ${tx.type === "ENTRY" ? "text-emerald-600" : "text-rose-600"}`}>
                              {tx.type === "ENTRY" ? "+" : "-"}{Number(tx.amount).toLocaleString("fr-FR")} {selectedCaisse.currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal: Créer une caisse */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-scale-up">
            <h2 className="text-lg font-bold text-slate-800 mb-4">🏦 Nouvelle Caisse</h2>
            <input type="text" placeholder="Nom de la caisse (ex: Caisse Principale)" value={newCaisseName} onChange={(e) => setNewCaisseName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none mb-4" />
            
            {isAdmin && cashierUsers.length > 0 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2">Assigner des caissiers</label>
                <div className="space-y-2 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {cashierUsers.map((cashier) => (
                    <label key={cashier.id} className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                        checked={selectedCashierIds.includes(cashier.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCashierIds([...selectedCashierIds, cashier.id]);
                          } else {
                            setSelectedCashierIds(selectedCashierIds.filter(id => id !== cashier.id));
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">{cashier.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleCreateCaisse} disabled={saving || !newCaisseName.trim()} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Création..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bon d'Entrée */}
      {showReplenishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-scale-up">
            <h2 className="text-lg font-bold text-emerald-700 mb-1">📥 Bon d&apos;Entrée de Caisse</h2>
            <p className="text-xs text-slate-500 mb-5">Alimentation de <strong>{selectedCaisse?.name}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Montant ({selectedCaisse?.currency})</label>
                <input type="number" min="1" placeholder="0" value={txAmount} onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Source d&apos;Alimentation</label>
                {sources.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune source disponible. Ajoutez-en d&apos;abord.</p>
                ) : (
                  <select value={txSource} onChange={(e) => setTxSource(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                    {sources.filter(s => s.type === "ENTRY" || s.type === "BOTH").map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description / Notes</label>
                <input type="text" placeholder="Ex: Chèque n°451, retrait agence BNI..." value={txDesc} onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>

              {/* Justificatif Obligatoire Upload */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>📎 Justificatif (obligatoire)</span>
                  {attachmentUrl && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Prêt !</span>}
                </label>
                
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,image/*" className="hidden" />
                
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm">
                    {uploadingFile ? "📥 Téléversement..." : "📁 Choisir un fichier"}
                  </button>
                  {attachmentName && (
                    <div className="text-xs text-slate-500 flex items-center gap-1 max-w-[200px] truncate">
                      <span>📄 {attachmentName}</span>
                    </div>
                  )}
                </div>

                {uploadError && <p className="text-red-500 text-[11px] mt-1">⚠️ {uploadError}</p>}
                
                {!attachmentUrl && !uploadingFile && (
                  <p className="text-rose-500 font-medium text-[11px] mt-2 bg-rose-50 p-2 rounded-lg">
                    ⚠️ Veuillez téléverser une pièce justificative pour valider ce bon d&apos;entrée.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReplenishModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleReplenish} disabled={saving || !txAmount || !attachmentUrl || uploadingFile}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm">
                {saving ? "Enregistrement..." : "✅ Valider l'entrée"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Retrait */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-scale-up">
            <h2 className="text-lg font-bold text-rose-700 mb-1">📤 Retrait / Ajustement de Caisse</h2>
            <p className="text-xs text-slate-500 mb-5">Solde actuel : <strong>{Number(selectedCaisse?.current_balance).toLocaleString("fr-FR")} {selectedCaisse?.currency}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Montant à retirer ({selectedCaisse?.currency})</label>
                <input type="number" min="1" placeholder="0" value={txAmount} onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-rose-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motif / Source de sortie</label>
                {sources.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune source disponible. Ajoutez-en d&apos;abord.</p>
                ) : (
                  <select value={txSource} onChange={(e) => setTxSource(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-rose-500 outline-none">
                    {sources.filter(s => s.type === "EXIT" || s.type === "BOTH").map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motif / Description explicite</label>
                <input type="text" placeholder="Ex: Retrait pour petite caisse, correction d'erreur..." value={txDesc} onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:ring-2 focus:ring-rose-500 outline-none" />
              </div>

              {/* Justificatif Obligatoire Upload */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>📎 Justificatif de retrait (obligatoire)</span>
                  {attachmentUrl && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Prêt !</span>}
                </label>
                
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,image/*" className="hidden" />
                
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm">
                    {uploadingFile ? "📥 Téléversement..." : "📁 Choisir un fichier"}
                  </button>
                  {attachmentName && (
                    <div className="text-xs text-slate-500 flex items-center gap-1 max-w-[200px] truncate">
                      <span>📄 {attachmentName}</span>
                    </div>
                  )}
                </div>

                {uploadError && <p className="text-red-500 text-[11px] mt-1">⚠️ {uploadError}</p>}
                
                {!attachmentUrl && !uploadingFile && (
                  <p className="text-rose-500 font-medium text-[11px] mt-2 bg-rose-50 p-2 rounded-lg">
                    ⚠️ Veuillez téléverser une pièce justificative pour valider ce retrait.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowWithdrawModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Annuler</button>
              <button onClick={handleWithdraw} disabled={saving || !txAmount || !attachmentUrl || uploadingFile}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm">
                {saving ? "Enregistrement..." : "⚠️ Confirmer le retrait"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Cashiers Modal */}
      {showAssignModal && caisseToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Gérer les caissiers — {caisseToAssign.name}</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Sélectionnez les caissiers autorisés :</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cashierUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Aucun caissier trouvé dans l'entreprise.</p>
                ) : (
                  cashierUsers.map((cashier) => (
                    <label key={cashier.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                        checked={selectedCashierIds.includes(cashier.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCashierIds([...selectedCashierIds, cashier.id]);
                          } else {
                            setSelectedCashierIds(selectedCashierIds.filter(id => id !== cashier.id));
                          }
                        }}
                      />
                      <span className="text-sm font-semibold text-slate-700">{cashier.name}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Annuler
                </button>
                <button onClick={handleAssignCashiers} disabled={saving} className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                  {saving && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

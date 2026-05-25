"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/lib/api";
import { useAuth } from "@/app/contexts/AuthContext";
// Inline SVG icons (no external dependency needed)
const IconWallet = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1M3 6h18a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>;
const IconPlus = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const IconTransfer = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>;
const IconArrowUp = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>;
const IconArrowDown = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>;
const IconCheck = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconX = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconClock = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconBank = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h1v11H4V10zm7 0h1v11h-1V10zm7 0h1v11h-1V10z" /></svg>;
const IconActivity = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
const IconHistory = ({className=""}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M3.05 11a9 9 0 108.9-8.95V5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" /></svg>;

interface TreasuryAccount {
  id: string;
  name: string;
  user_label: string;
  type: string;
  currency: string;
  current_balance: number;
  is_active: boolean;
  accounting_account_id?: string;
}

interface TreasuryTransaction {
  id: string;
  reference?: string;
  type: string;
  source_type: string;
  amount: number;
  currency: string;
  treasury_account_id: string;
  status: string;
  created_by: string;
  created_at: string;
}

export default function TreasuryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"accounts" | "transactions">("accounts");

  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TreasuryTransaction | null>(null);

  // Forms states
  const [newAccount, setNewAccount] = useState({ name: "", user_label: "", type: "BANK", currency: "XOF", opening_balance: 0 });
  const [newTransaction, setNewTransaction] = useState({ 
    treasury_account_id: "", type: "IN", amount: 0, currency: "XOF", source_type: "MANUAL_ADJUSTMENT", description: "",
    from_treasury_account_id: "", to_treasury_account_id: ""
  });
  const [validationData, setValidationData] = useState<{status: "VALIDATED"|"REJECTED", description: string}>({ status: "VALIDATED", description: "" });

  useEffect(() => {
    if (!authLoading && user) {
      if (!["admin", "super_admin", "accountant", "cashier"].includes(user.role)) {
        router.push("/dashboard");
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "accounts") {
        const res = await api.getTreasuryAccounts();
        setAccounts(res as TreasuryAccount[]);
      } else {
        const res = await api.getTreasuryTransactions({ limit: 100 });
        setTransactions(res as TreasuryTransaction[]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTreasuryAccount(newAccount);
      setIsAccountModalOpen(false);
      setNewAccount({ name: "", user_label: "", type: "BANK", currency: "XOF", opening_balance: 0 });
      fetchData();
    } catch (error) {
      console.error("Failed to create account", error);
      alert("Erreur lors de la création du compte.");
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTreasuryTransaction(newTransaction);
      setIsTransactionModalOpen(false);
      setNewTransaction({ 
        treasury_account_id: "", type: "IN", amount: 0, currency: "XOF", source_type: "MANUAL_ADJUSTMENT", description: "",
        from_treasury_account_id: "", to_treasury_account_id: ""
      });
      fetchData();
    } catch (error) {
      console.error("Failed to create transaction", error);
      alert("Erreur lors de la création de la transaction.");
    }
  };

  const handleValidateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    try {
      await api.validateTreasuryTransaction(selectedTransaction.id, validationData);
      setIsValidateModalOpen(false);
      setSelectedTransaction(null);
      setValidationData({ status: "VALIDATED", description: "" });
      fetchData();
    } catch (error) {
      console.error("Failed to validate transaction", error);
      alert("Erreur lors de la validation.");
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case "BANK": return <IconBank className="w-6 h-6 text-blue-500" />;
      case "MOBILE_MONEY": return <IconBank className="w-6 h-6 text-purple-500" />;
      case "SAFE": return <IconBank className="w-6 h-6 text-slate-700" />;
      case "CASH": return <IconWallet className="w-6 h-6 text-emerald-500" />;
      default: return <IconWallet className="w-6 h-6 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BANK: "Banque",
      CASH: "Caisse physique",
      MOBILE_MONEY: "Mobile Money",
      SAFE: "Coffre-fort",
      OTHER: "Autre",
    };
    return labels[type] || type;
  };

  const getTransactionIcon = (type: string) => {
    switch(type) {
      case "IN": return <div className="p-2 bg-emerald-100 rounded-full text-emerald-600"><IconArrowUp className="w-4 h-4" /></div>;
      case "OUT": return <div className="p-2 bg-rose-100 rounded-full text-rose-600"><IconArrowDown className="w-4 h-4" /></div>;
      case "TRANSFER": return <div className="p-2 bg-blue-100 rounded-full text-blue-600"><IconTransfer className="w-4 h-4" /></div>;
      default: return <div className="p-2 bg-gray-100 rounded-full text-gray-600"><IconActivity className="w-4 h-4" /></div>;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      IN: "Entrée",
      OUT: "Sortie",
      TRANSFER: "Transfert",
      ADJUSTMENT: "Ajustement",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><IconCheck className="w-3.5 h-3.5"/> Validé</span>;
      case "PENDING":
        return <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200"><IconClock className="w-3.5 h-3.5"/> En attente</span>;
      case "REJECTED":
        return <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200"><IconX className="w-3.5 h-3.5"/> Rejeté</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-900 p-8 rounded-3xl shadow-lg text-white">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Trésorerie</h1>
          <p className="text-indigo-200 font-medium">Gérez vos liquidités, comptes bancaires et flux de trésorerie en temps réel.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "accounts" && (
            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm"
            >
              <IconPlus className="w-5 h-5" /> Nouveau Compte
            </button>
          )}
          {activeTab === "transactions" && (
            <button
              onClick={() => {
                api.getTreasuryAccounts(true).then((acc) => {
                  setAccounts(acc as TreasuryAccount[]);
                  setIsTransactionModalOpen(true);
                });
              }}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm"
            >
              <IconPlus className="w-5 h-5" /> Créer une Transaction
            </button>
          )}
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex p-1 bg-gray-100/80 backdrop-blur-sm rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            activeTab === "accounts"
              ? "bg-white text-indigo-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          <IconWallet className="w-4 h-4" /> Comptes de Trésorerie
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            activeTab === "transactions"
              ? "bg-white text-indigo-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
          }`}
        >
          <IconHistory className="w-4 h-4" /> Mouvements & Historique
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* ACCOUNTS VIEW */}
          {activeTab === "accounts" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {accounts.map((account) => (
                <div key={account.id} className="group bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform group-hover:scale-150 transition-transform duration-700">
                    {getTypeIcon(account.type)}
                  </div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      {getTypeIcon(account.type)}
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${account.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {account.is_active ? "Actif" : "Désactivé"}
                    </span>
                  </div>
                  
                  <div className="mb-8 relative z-10">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1 mb-1" title={account.name}>{account.name}</h3>
                    <p className="text-sm font-medium text-gray-400">{getTypeLabel(account.type)}</p>
                  </div>
                  
                  <div className="mt-auto pt-5 border-t border-gray-100 relative z-10">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Solde disponible</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">
                      {account.current_balance.toLocaleString()} <span className="text-sm font-semibold text-gray-400 ml-1">{account.currency}</span>
                    </p>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-gray-300">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <IconWallet className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Aucun compte configuré</h3>
                  <p className="text-gray-500 mb-6 max-w-sm">Commencez par créer votre première caisse ou compte bancaire pour suivre vos flux.</p>
                  <button onClick={() => setIsAccountModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition">
                    Créer un compte
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TRANSACTIONS VIEW */}
          {activeTab === "transactions" && (
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Réf.</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((trx) => (
                      <tr key={trx.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900">{new Date(trx.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-gray-500 font-mono mt-0.5">{trx.reference || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(trx.type)}
                            <span className="text-sm font-medium text-gray-700">{getTransactionTypeLabel(trx.type)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                            {trx.source_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-bold ${trx.type === "OUT" ? "text-rose-600" : trx.type === "IN" ? "text-emerald-600" : "text-gray-900"}`}>
                            {trx.type === "OUT" ? "-" : (trx.type === "IN" ? "+" : "")} {trx.amount.toLocaleString()} {trx.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(trx.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {trx.status === "PENDING" && user?.role !== "cashier" ? (
                             <button
                               onClick={() => {
                                 setSelectedTransaction(trx);
                                 setIsValidateModalOpen(true);
                               }}
                               className="inline-flex items-center justify-center px-4 py-1.5 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition opacity-0 group-hover:opacity-100"
                             >
                               Valider
                             </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                              <IconActivity className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Aucune transaction</h3>
                            <p className="text-gray-500">Les flux financiers apparaîtront ici.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* CREATE ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAccountModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Nouveau compte</h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><IconX className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleCreateAccount} className="p-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nom interne</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ecobank Principal"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Type</label>
                  <select
                    value={newAccount.type}
                    onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-white"
                  >
                    <option value="BANK">Banque</option>
                    <option value="CASH">Caisse physique</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="SAFE">Coffre-fort</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Devise</label>
                  <select
                    value={newAccount.currency}
                    onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-white"
                  >
                    <option value="XOF">XOF (FCFA)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Libellé affiché</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Compte Courant"
                  value={newAccount.user_label}
                  onChange={(e) => setNewAccount({ ...newAccount, user_label: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Solde d'ouverture</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newAccount.opening_balance}
                    onChange={(e) => setNewAccount({ ...newAccount, opening_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none font-mono font-medium text-lg"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold">{newAccount.currency}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TRANSACTION MODAL */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTransactionModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10">
              <h3 className="text-xl font-bold text-gray-900">Nouvelle opération</h3>
              <button onClick={() => setIsTransactionModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><IconX className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleCreateTransaction} className="p-8 space-y-6">
              
              {/* Type Selection */}
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {["IN", "OUT", "TRANSFER", "ADJUSTMENT"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewTransaction({ ...newTransaction, type })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      newTransaction.type === type 
                        ? "bg-white shadow text-indigo-700" 
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {type === "IN" ? "Entrée" : type === "OUT" ? "Sortie" : type === "TRANSFER" ? "Transfert" : "Ajustement"}
                  </button>
                ))}
              </div>

              {newTransaction.type !== "TRANSFER" ? (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Compte concerné</label>
                  <select
                    required
                    value={newTransaction.treasury_account_id}
                    onChange={(e) => setNewTransaction({ ...newTransaction, treasury_account_id: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none bg-white"
                  >
                    <option value="">Sélectionner un compte...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} — ({acc.current_balance} {acc.currency})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-1.5">Depuis (Débit)</label>
                    <select
                      required
                      value={newTransaction.from_treasury_account_id}
                      onChange={(e) => setNewTransaction({ ...newTransaction, from_treasury_account_id: e.target.value })}
                      className="w-full rounded-xl border border-blue-200 px-4 py-3 text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                    >
                      <option value="">Compte source...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} — ({acc.current_balance} {acc.currency})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-center -my-3 relative z-10">
                    <div className="bg-white rounded-full p-2 shadow-sm border border-blue-100 text-blue-500">
                      <IconArrowDown className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-blue-900 mb-1.5">Vers (Crédit)</label>
                    <select
                      required
                      value={newTransaction.to_treasury_account_id}
                      onChange={(e) => setNewTransaction({ ...newTransaction, to_treasury_account_id: e.target.value })}
                      className="w-full rounded-xl border border-blue-200 px-4 py-3 text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                    >
                      <option value="">Compte destination...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} — ({acc.current_balance} {acc.currency})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Montant</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newTransaction.amount || ""}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-4 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none font-mono font-bold text-2xl"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-bold">{newTransaction.currency}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Description (Optionnel)</label>
                <textarea
                  rows={2}
                  placeholder="Motif de l'opération..."
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VALIDATE MODAL */}
      {isValidateModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsValidateModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Validation requise</h3>
              <p className="text-sm text-gray-500 mt-1">Valider ou rejeter cette opération.</p>
            </div>
            
            <form onSubmit={handleValidateTransaction} className="p-8 space-y-6">
              <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Référence</span>
                  <span className="font-mono font-bold text-indigo-900">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Type</span>
                  <span className="font-bold text-gray-900">{getTransactionTypeLabel(selectedTransaction.type)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-indigo-100/50 mt-2">
                  <span className="text-gray-500 font-medium">Montant</span>
                  <span className="font-black text-indigo-600">{selectedTransaction.amount.toLocaleString()} {selectedTransaction.currency}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Décision</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer rounded-xl border-2 p-3 flex items-center justify-center gap-2 transition-all ${validationData.status === 'VALIDATED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}>
                      <input type="radio" name="status" value="VALIDATED" className="sr-only" checked={validationData.status === 'VALIDATED'} onChange={() => setValidationData({...validationData, status: 'VALIDATED'})} />
                      <IconCheck className="w-5 h-5" /> <span className="font-bold text-sm">Valider</span>
                    </label>
                    <label className={`cursor-pointer rounded-xl border-2 p-3 flex items-center justify-center gap-2 transition-all ${validationData.status === 'REJECTED' ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}`}>
                      <input type="radio" name="status" value="REJECTED" className="sr-only" checked={validationData.status === 'REJECTED'} onChange={() => setValidationData({...validationData, status: 'REJECTED'})} />
                      <IconX className="w-5 h-5" /> <span className="font-bold text-sm">Rejeter</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Note (Optionnelle)</label>
                  <textarea
                    rows={2}
                    placeholder="Pourquoi cette décision ?"
                    value={validationData.description}
                    onChange={(e) => setValidationData({ ...validationData, description: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsValidateModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-md transition ${validationData.status === 'VALIDATED' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

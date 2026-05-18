"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { translateStatus } from "../../../lib/utils";
import { useAuth } from "../../../contexts/AuthContext";

export default function ExpenseDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [expense, setExpense] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    tax_amount: "",
    currency: "",
    category_id: "",
    description: "",
    expense_date: "",
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [newComment, setNewComment] = useState("");
  
  const router = useRouter();



  const loadExpense = async () => {
    if (!authUser) return; // Prevent unnecessary loading if not logged in
    setLoading(true);
    setError(null);
    try {
      const [expenseData, logsData, userData, categoriesData] = await Promise.all([
        api.getExpense(params.id),
        api.getExpenseLogs(params.id).catch(() => []),
        api.getMe().catch(() => null),
        api.getCategories(true).catch(() => [])
      ]);
      setExpense(expenseData);
      setLogs(logsData as any[]);
      setUser(userData);
      setCategories(categoriesData as any[]);
      setFormData({
        amount: String((expenseData as any).amount ?? ""),
        tax_amount: String((expenseData as any).tax_amount ?? "0.00"),
        currency: (expenseData as any).currency ?? "EUR",
        category_id: (expenseData as any).category_id ?? "",
        description: (expenseData as any).description ?? "",
        expense_date: (expenseData as any).expense_date ?? "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de charger la dépense.");
    } finally {
      setLoading(false);
      setCatsLoading(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      loadExpense();
    }
  }, [params.id, authUser]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!expense) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await api.updateExpense(params.id, {
        amount: Number(formData.amount),
        tax_amount: Number(formData.tax_amount) || 0,
        currency: formData.currency,
        category_id: formData.category_id,
        description: formData.description,
        expense_date: formData.expense_date,
      });
      setMessage("Bon de dépense mis à jour.");
      await loadExpense();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour la dépense.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!expense) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await api.submitExpense(params.id);
      setMessage("Bon de dépense soumis.");
      await loadExpense();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de soumettre la dépense.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!expense) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await api.cancelExpense(params.id);
      setMessage("Bon de dépense annulé.");
      await loadExpense();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'annuler la dépense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await api.deleteExpense(params.id);
      router.push("/dashboard/expenses");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer la dépense.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!expense) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await api.approveExpense(params.id);
      setMessage("Bon de dépense approuvé.");
      await loadExpense();
    } catch (err: any) { setError(err.message || "Erreur lors de l'approbation"); } finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setError("Le commentaire de refus est obligatoire.");
      return;
    }
    setSaving(true); setError(null); setMessage(null);
    try {
      await api.rejectExpense(params.id, { comment: rejectComment });
      setMessage("Bon de dépense refusé.");
      setShowRejectModal(false);
      setRejectComment("");
      await loadExpense();
    } catch (err: any) { setError(err.message || "Erreur lors du refus"); } finally { setSaving(false); }
  };

  const handleMarkPaid = async () => {
    if (!expense) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await api.payExpense(params.id);
      setMessage("Bon de dépense marqué comme payé.");
      await loadExpense();
    } catch (err: any) { setError(err.message || "Erreur lors du paiement"); } finally { setSaving(false); }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      await api.addExpenseComment(params.id, { comment: newComment });
      setNewComment("");
      await loadExpense();
    } catch (err: any) { setError(err.message || "Erreur lors de l'ajout du commentaire"); } finally { setSaving(false); }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setFiles(Array.from(event.target.files));
  };

  const handleUpload = async () => {
    if (!expense || files.length === 0) return;
    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      await api.uploadAttachments(params.id, files);
      setMessage("Justificatifs ajoutés.");
      setFiles([]);
      await loadExpense();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'uploader les justificatifs.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    if (!expense) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await api.deleteAttachment(params.id, attachmentId);
      setMessage("Justificatif supprimé.");
      await loadExpense();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le justificatif.");
    } finally {
      setSaving(false);
    }
  };

  const isOwner = user && expense && user.id === expense.user_id;
  const isAdmin = user?.role && ["admin", "super_admin"].includes(user.role);
  const updatable = expense && (
    isAdmin ||
    (isOwner && ["draft", "pending", "rejected"].includes(expense.status))
  );
  const canSubmit = expense && ["draft", "rejected"].includes(expense.status) && (isOwner || isAdmin);
  const canCancel = expense && expense.status === "pending" && (isOwner || isAdmin);
  const canApprove = expense?.status === "pending" && user?.role && ["manager", "admin", "super_admin"].includes(user.role) && user?.id !== expense.user_id;
  const canPay = expense?.status === "approved" && user?.role && ["accountant", "admin", "super_admin"].includes(user.role);

  const getActionIcon = (action: string) => {
    switch(action) {
      case "created": return "📝";
      case "submitted": return "📤";
      case "approved": return "✅";
      case "rejected": return "❌";
      case "paid": return "💳";
      case "cancelled": return "🚫";
      case "commented": return "💬";
      default: return "📌";
    }
  };

  if (loading && !expense) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!authUser) {
    return null; // Redirection en cours...
  }

  if (!expense) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm text-slate-700">
          <h1 className="text-2xl font-semibold">Dépense introuvable</h1>
          <p className="mt-4">Le bon de dépense demandé est introuvable ou n'est pas accessible.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Refuser le bon</h3>
            <p className="text-sm text-slate-600 mb-4">Veuillez indiquer la raison du refus (obligatoire).</p>
            <textarea
              rows={4}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Ex: La facture est illisible..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-red-500 focus:outline-none focus:ring-red-500 mb-6"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)} className="rounded-xl px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">Annuler</button>
              <button onClick={handleReject} disabled={saving || !rejectComment.trim()} className="rounded-xl bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50">Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            Tableau de bord
          </Link>
          <span className="text-slate-300">/</span>
          <Link href="/dashboard/expenses" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            Dépenses
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-400">Détail ({expense.id.slice(0, 8)})</span>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Bon de dépense</h1>
              <p className="mt-2 text-slate-600">Détail et actions pour ce bon de dépense.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {expense.status === "draft" && (
                <button type="button" onClick={handleDelete} disabled={saving} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50">Supprimer</button>
              )}
              {canSubmit && (
                <button type="button" onClick={handleSubmit} disabled={saving} className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">{expense.status === "rejected" ? "Resoumettre" : "Soumettre"}</button>
              )}
              {canCancel && (
                <button type="button" onClick={handleCancel} disabled={saving} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50">Annuler</button>
              )}
              {canApprove && (
                <>
                  <button type="button" onClick={() => setShowRejectModal(true)} disabled={saving} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50">Refuser</button>
                  <button type="button" onClick={handleApprove} disabled={saving} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">Approuver</button>
                </>
              )}
              {canPay && (
                <button type="button" onClick={handleMarkPaid} disabled={saving} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50">Marquer comme payé</button>
              )}
            </div>
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-6">{message}</div>}

          {expense.advance_id && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex gap-3 items-center">
              <span className="text-xl">💰</span>
              <div>
                <h4 className="font-bold">Justificatif lié à une avance de caisse</h4>
                <p className="text-xs mt-0.5">Ce bon de dépense sert à justifier des fonds déjà avancés à l'employé. Aucun remboursement direct n'est requis.</p>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Résumé</h2>
              <div className="space-y-3 text-sm text-slate-700">
                <p><span className="font-semibold">Statut :</span> <span className="capitalize font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded-md">{translateStatus(expense.status)}</span></p>
                <p><span className="font-semibold">Montant Total (TTC) :</span> {parseFloat(expense.amount).toLocaleString()} {expense.currency}</p>
                {parseFloat(expense.tax_amount) > 0 && (
                  <>
                    <p><span className="font-semibold">Montant TVA :</span> {parseFloat(expense.tax_amount).toLocaleString()} {expense.currency}</p>
                    <p><span className="font-semibold">Montant Hors Taxe (HT) :</span> {(parseFloat(expense.amount) - parseFloat(expense.tax_amount)).toLocaleString()} {expense.currency}</p>
                  </>
                )}
                <p><span className="font-semibold">Catégorie :</span> {expense.category}</p>
                <p><span className="font-semibold">Date :</span> {expense.expense_date}</p>
                <p><span className="font-semibold">Soumis le :</span> {expense.submitted_at ? new Date(expense.submitted_at).toLocaleDateString() : "—"}</p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSave}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Montant Total (TTC)</span>
                  <input type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => handleChange("amount", e.target.value)} disabled={!updatable} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Devise</span>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    disabled={!updatable}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100"
                  >
                    <option value="XOF">XOF - Franc CFA (BCEAO)</option>
                    <option value="XAF">XAF - Franc CFA (BEAC)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="USD">USD - Dollar US ($)</option>
                    <option value="CAD">CAD - Dollar Canadien ($)</option>
                    <option value="GBP">GBP - Livre Sterling (£)</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Montant de la TVA (Facultatif)</span>
                  <input type="number" step="0.01" min="0" value={formData.tax_amount} onChange={(e) => handleChange("tax_amount", e.target.value)} disabled={!updatable} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100" />
                </label>
                <div className="hidden sm:block"></div>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Catégorie</span>
                {catsLoading ? (
                  <div className="mt-2 text-slate-500 text-sm">Chargement...</div>
                ) : (
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleChange("category_id", e.target.value)}
                    disabled={!updatable}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date de dépense</span>
                <input type="date" value={formData.expense_date} onChange={(e) => handleChange("expense_date", e.target.value)} disabled={!updatable} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea value={formData.description} onChange={(e) => handleChange("description", e.target.value)} disabled={!updatable} rows={4} className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100" />
              </label>
              {updatable && (
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
                  {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Timeline (Historique) */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Historique du bon</h2>
          <div className="space-y-6">
            <div className="border-l-2 border-slate-200 ml-4 pl-6 space-y-6 relative">
              {logs.map((log) => (
                <div key={log.id} className="relative">
                  <span className="absolute -left-10 bg-white text-xl p-1 rounded-full shadow-sm border border-slate-200">
                    {getActionIcon(log.action)}
                  </span>
                  <div>
                    <p className="text-sm text-slate-900">
                      <span className="font-semibold">{log.user_name || "Un utilisateur"}</span> a <span className="font-medium text-indigo-600 capitalize">{log.action}</span> le bon
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(log.created_at).toLocaleString()}</p>
                    {log.comment && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700">
                        💬 "{log.comment}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-slate-500 text-sm">Aucun historique disponible.</p>}
            </div>

            <form onSubmit={handleAddComment} className="mt-8 flex gap-3">
              <input 
                type="text" 
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)} 
                placeholder="Ajouter un commentaire..." 
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500" 
              />
              <button type="submit" disabled={saving || !newComment.trim()} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50">Commenter</button>
            </form>
          </div>
        </div>

        {/* Justificatifs */}
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Justificatifs</h2>
              <p className="mt-2 text-slate-600">Pièces jointes relatives à la dépense.</p>
            </div>
          </div>
          <div className="space-y-4">
            {updatable && (
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <input type="file" multiple onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700" />
                <button type="button" onClick={handleUpload} disabled={uploading || files.length === 0} className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {uploading ? "Upload..." : "Uploader"}
                </button>
              </div>
            )}
            {files.length > 0 && <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{files.length} fichier(s) prêts à être uploadés.</div>}
            
            {expense.attachments?.length ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Taille</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                      {updatable && <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {expense.attachments.map((attachment: any) => (
                      <tr key={attachment.id}>
                        <td className="px-6 py-4 text-sm text-slate-900"><a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${attachment.file_url}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{attachment.file_name}</a></td>
                        <td className="px-6 py-4 text-sm text-slate-900">{Math.round(attachment.file_size / 1024)} KB</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{attachment.file_type}</td>
                        {updatable && (
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <button type="button" onClick={() => handleRemoveAttachment(attachment.id)} disabled={saving} className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">Supprimer</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">Aucun justificatif disponible.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

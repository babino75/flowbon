"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

export default function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const [expense, setExpense] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: "",
    currency: "",
    category: "",
    description: "",
    expense_date: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const router = useRouter();

  const loadExpense = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getExpense(params.id);
      setExpense(data);
      setFormData({
        amount: String((data as any).amount ?? ""),
        currency: (data as any).currency ?? "EUR",
        category: (data as any).category ?? "",
        description: (data as any).description ?? "",
        expense_date: (data as any).expense_date ?? "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de charger la dépense.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpense();
  }, [params.id]);

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
        currency: formData.currency,
        category: formData.category,
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

  const updatable = expense && ["draft", "pending"].includes(expense.status);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
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
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Bon de dépense</h1>
              <p className="mt-2 text-slate-600">Détail et actions pour ce bon de dépense.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {expense.status === "draft" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Supprimer
                </button>
              )}
              {updatable && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Soumettre
                </button>
              )}
              {updatable && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 mb-6">{error}</div>}
          {message && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 mb-6">{message}</div>}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Résumé</h2>
              <div className="space-y-3 text-sm text-slate-700">
                <p><span className="font-semibold">Statut :</span> {expense.status}</p>
                <p><span className="font-semibold">Montant :</span> {expense.amount} {expense.currency}</p>
                <p><span className="font-semibold">Catégorie :</span> {expense.category}</p>
                <p><span className="font-semibold">Date :</span> {expense.expense_date}</p>
                <p><span className="font-semibold">Soumis le :</span> {expense.submitted_at ?? "—"}</p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSave}>
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Montant</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleChange("amount", e.target.value)}
                    disabled={!updatable}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Devise</span>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => handleChange("currency", e.target.value)}
                    disabled={!updatable}
                    className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Catégorie</span>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  disabled={!updatable}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Date de dépense</span>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => handleChange("expense_date", e.target.value)}
                  disabled={!updatable}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  disabled={!updatable}
                  rows={4}
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 disabled:bg-slate-100"
                />
              </label>

              {updatable && (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Justificatifs</h2>
              <p className="mt-2 text-slate-600">Ajoutez ou supprimez des pièces jointes pour ce bon.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-700"
              />
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Upload..." : "Uploader"}
              </button>
            </div>

            {files.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {files.length} fichier(s) prêts à être uploadés.
              </div>
            )}

            {expense.attachments?.length ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Taille</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {expense.attachments.map((attachment: any) => (
                      <tr key={attachment.id}>
                        <td className="px-6 py-4 text-sm text-slate-900">{attachment.file_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{attachment.file_size} octets</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{attachment.file_type}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            disabled={saving}
                            className="rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Aucun justificatif disponible pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

type Suggestion = {
  id: string;
  company_id?: string;
  user_id?: string;
  user_name?: string;
  title: string;
  content: string;
  category: string;
  status: string;
  is_anonymous: boolean;
  admin_response?: string;
  created_at: string;
  updated_at: string;
};

const CATEGORIES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  suggestion: { label: "Amélioration", icon: "💡", color: "text-indigo-700 border-indigo-200", bg: "bg-indigo-50" },
  bug: { label: "Bogue / Erreur", icon: "🐛", color: "text-rose-700 border-rose-200", bg: "bg-rose-50" },
  question: { label: "Question", icon: "❓", color: "text-sky-700 border-sky-200", bg: "bg-sky-50" },
  other: { label: "Autre", icon: "📝", color: "text-slate-700 border-slate-200", bg: "bg-slate-50" },
};

const STATUSES: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "Reçu", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  under_review: { label: "À l'étude", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  planned: { label: "Planifié", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
  completed: { label: "Résolu", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejeté", color: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};

export default function SuggestionsPage() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("suggestion");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Moderation states
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [modStatus, setModStatus] = useState("");
  const [modResponse, setModResponse] = useState("");
  const [savingMod, setSavingMod] = useState(false);

  // Active Tab for Admins
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "resolved">("all");

  useEffect(() => {
    refreshSuggestions();
  }, []);

  const refreshSuggestions = async () => {
    setLoading(true);
    try {
      const data = await api.getSuggestions();
      setSuggestions(data as Suggestion[]);
    } catch {
      setError("Impossible de charger les suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setSubmitting(true);
    setError(null);
    setActionMessage(null);

    try {
      await api.createSuggestion({
        title,
        content,
        category,
        is_anonymous: isAnonymous,
      });
      setTitle("");
      setContent("");
      setIsAnonymous(false);
      setActionMessage("Merci ! Votre suggestion a été soumise avec succès.");
      await refreshSuggestions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de la suggestion.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModeration = (suggestion: Suggestion) => {
    setModeratingId(suggestion.id);
    setModStatus(suggestion.status);
    setModResponse(suggestion.admin_response || "");
  };

  const handleSaveModeration = async (id: string) => {
    setSavingMod(true);
    setError(null);
    try {
      await api.updateSuggestion(id, {
        status: modStatus,
        admin_response: modResponse,
      });
      setActionMessage("Modération enregistrée avec succès.");
      setModeratingId(null);
      await refreshSuggestions();
    } catch {
      setError("Impossible d'enregistrer la modération.");
    } finally {
      setSavingMod(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette suggestion ?")) return;
    try {
      await api.deleteSuggestion(id);
      setActionMessage("Suggestion supprimée.");
      await refreshSuggestions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer la suggestion.");
    }
  };

  if (!user) return null;

  const isModerator = ["admin", "super_admin"].includes(user.role);

  // Filtered suggestions for admin view
  const filteredSuggestions = suggestions.filter((s) => {
    if (activeTab === "pending") return s.status === "pending";
    if (activeTab === "resolved") return ["completed", "rejected"].includes(s.status);
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
            ← Retour au Tableau de bord
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <span>💡</span> Boîte de Suggestions
          </h1>
          <p className="mt-2 text-slate-600">
            Aidez-nous à faire évoluer FlowBon selon vos besoins réels. Soumettez vos idées ou signalez des bogues.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm font-medium text-rose-700 animate-fade-in">
            ⚠️ {error}
          </div>
        )}
        {actionMessage && (
          <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-700 animate-fade-in">
            🎉 {actionMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT SIDE: Submit form (Only for users, or admins who want to submit) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Soumettre une suggestion</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    Titre
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Exporter les notes de frais au format CSV"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
                  >
                    <option className="text-slate-900 bg-white" value="suggestion">💡 Amélioration / Idée</option>
                    <option className="text-slate-900 bg-white" value="bug">🐛 Signalement de Bogue</option>
                    <option className="text-slate-900 bg-white" value="question">❓ Question technique</option>
                    <option className="text-slate-900 bg-white" value="other">📝 Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 tracking-wider mb-2">
                    Description détaillée
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Expliquez-nous en quoi cela vous aiderait au quotidien..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 py-2 border-t border-b border-slate-50">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="anonymous" className="text-xs text-slate-600 cursor-pointer select-none">
                    <strong>Soumettre anonymement</strong>
                    <span className="block text-[10px] text-slate-400">
                      Votre nom sera caché aux administrateurs de votre société.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {submitting ? "Envoi en cours..." : "Soumettre la suggestion"}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT SIDE: List & Moderation */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header / Tabs for moderators */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
              <h2 className="text-xl font-bold text-slate-900">
                {isModerator ? "Gestion des Suggestions" : "Mes suggestions soumises"}
              </h2>

              {isModerator && (
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Toutes
                  </button>
                  <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    En attente
                  </button>
                  <button
                    onClick={() => setActiveTab("resolved")}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "resolved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Traitées
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                <span className="text-4xl block mb-3">📬</span>
                <h3 className="text-base font-bold text-slate-900">Aucune suggestion trouvée</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {isModerator ? "Aucune suggestion ne correspond à ce filtre." : "Vous n'avez pas encore soumis de suggestion."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSuggestions.map((s) => {
                  const cat = CATEGORIES[s.category] || CATEGORIES.other;
                  const stat = STATUSES[s.status] || STATUSES.pending;
                  const isModeratingThis = moderatingId === s.id;

                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Meta header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cat.color} ${cat.bg}`}>
                            <span>{cat.icon}</span> {cat.label}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stat.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                            {stat.label}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(s.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-4">
                        {s.content}
                      </p>

                      {/* Author Info */}
                      <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-xs">
                        <span className="text-slate-400">
                          Par :{" "}
                          <strong className={s.is_anonymous ? "text-slate-500 italic font-medium" : "text-slate-700 font-bold"}>
                            {s.user_name}
                          </strong>
                        </span>

                        {/* Actions for users (delete pending) */}
                        {!isModerator && s.status === "pending" && (
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold hover:underline"
                          >
                            Supprimer
                          </button>
                        )}

                        {/* Actions for moderators */}
                        {isModerator && !isModeratingThis && (
                          <button
                            onClick={() => handleOpenModeration(s)}
                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            ⚙️ Répondre / Modérer
                          </button>
                        )}
                      </div>

                      {/* Admin Response Card */}
                      {s.admin_response && !isModeratingThis && (
                        <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-100 animate-fade-in">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            Réponse de l'administration :
                          </span>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap italic">
                            {s.admin_response}
                          </p>
                        </div>
                      )}

                      {/* Moderation Form (Inline edit) */}
                      {isModeratingThis && (
                        <div className="mt-6 bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 space-y-4 animate-slide-down">
                          <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                            ⚙️ Moderation : {s.title}
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Statut de la suggestion
                              </label>
                              <select
                                value={modStatus}
                                onChange={(e) => setModStatus(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none"
                              >
                                <option className="text-slate-900 bg-white" value="pending">Reçu (En attente)</option>
                                <option className="text-slate-900 bg-white" value="under_review">À l'étude (En cours)</option>
                                <option className="text-slate-900 bg-white" value="planned">Planifié</option>
                                <option className="text-slate-900 bg-white" value="completed">Résolu</option>
                                <option className="text-slate-900 bg-white" value="rejected">Rejeté</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Réponse officielle
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Écrivez votre réponse officielle..."
                              value={modResponse}
                              onChange={(e) => setModResponse(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 bg-white focus:outline-none resize-none"
                            />
                          </div>

                          <div className="flex items-center gap-3 pt-2 justify-end">
                            <button
                              onClick={() => setModeratingId(null)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 bg-white hover:bg-slate-50"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleSaveModeration(s.id)}
                              disabled={savingMod}
                              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {savingMod ? "Enregistrement..." : "Enregistrer la réponse"}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}

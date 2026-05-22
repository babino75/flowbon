"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

interface Project {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Edit modal
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (!user) return;
    fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const data = await api.listProjects(true) as Project[];
      setProjects(data);
    } catch {
      setError("Impossible de charger les projets.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.createProject({ name: newName, code: newCode || undefined, description: newDesc || undefined });
      setSuccess("Projet créé avec succès !");
      setNewName(""); setNewCode(""); setNewDesc("");
      setShowForm(false);
      await fetchProjects();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(project: Project) {
    setEditProject(project);
    setEditName(project.name);
    setEditCode(project.code || "");
    setEditDesc(project.description || "");
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProject || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateProject(editProject.id, {
        name: editName,
        code: editCode || undefined,
        description: editDesc || undefined,
      });
      setSuccess("Projet mis à jour !");
      setEditProject(null);
      await fetchProjects();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(project: Project) {
    setSaving(true);
    setError(null);
    try {
      await api.updateProject(project.id, { is_active: !project.is_active });
      setSuccess(project.is_active ? "Projet désactivé." : "Projet réactivé.");
      await fetchProjects();
    } catch (e: any) {
      setError(e.message || "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm font-semibold transition-colors">← Tableau de bord</Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-2xl">🗂️</span> Gestion des Projets
          </h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
          >
            ➕ Nouveau projet
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between items-center">
            ⚠️ {error}
            <button onClick={() => setError(null)} className="font-bold text-red-500 ml-4 text-lg">×</button>
          </div>
        )}
        {success && (
          <div className="mb-5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-sm flex justify-between items-center">
            ✅ {success}
            <button onClick={() => setSuccess(null)} className="font-bold text-emerald-500 ml-4 text-lg">×</button>
          </div>
        )}

        {/* Description */}
        <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
          <p className="text-sm text-indigo-800 font-medium">
            Les <strong>Projets</strong> permettent d&apos;organiser les dépenses, d&apos;assigner des validateurs spécifiques et d&apos;isoler les reportings financiers par périmètre.
            Un Manager assigné à un projet ne voit et ne valide que les bons liés à ce projet.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-6xl mb-4">🗂️</p>
            <h2 className="text-2xl font-black text-slate-700 mb-2">Aucun projet</h2>
            <p className="text-slate-500 text-sm mb-6">Créez un premier projet pour commencer à organiser vos dépenses.</p>
            {isAdmin && (
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all">
                ➕ Créer un projet
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center justify-between gap-4 transition-all ${
                  project.is_active ? "border-slate-200" : "border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${
                    project.is_active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-800">{project.name}</span>
                      {project.code && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                          {project.code}
                        </span>
                      )}
                      {!project.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Désactivé</span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">
                      Créé le {new Date(project.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(project)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleToggle(project)}
                      disabled={saving}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:opacity-50 ${
                        project.is_active
                          ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {project.is_active ? "Désactiver" : "Réactiver"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-black text-slate-800 mb-6">🗂️ Nouveau projet</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nom du projet *</label>
                <input
                  type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="ex: Projet Développement RH"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Code (optionnel)</label>
                <input
                  type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)}
                  placeholder="ex: PRJ-001"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description (optionnel)</label>
                <textarea
                  value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Décrivez l'objectif de ce projet..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={saving || !newName.trim()} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {saving ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-black text-slate-800 mb-6">✏️ Modifier le projet</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nom du projet *</label>
                <input
                  type="text" required value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Code</label>
                <input
                  type="text" value={editCode} onChange={(e) => setEditCode(e.target.value)}
                  placeholder="ex: PRJ-001"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditProject(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

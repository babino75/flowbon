"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";
import { useRouter } from "next/navigation";

type Department = { id: string; name: string; description?: string; is_active: boolean };
type Project = { id: string; name: string; code?: string; description?: string; status: string; is_active: boolean; start_date?: string; end_date?: string };
type UserDeptLink = { department_id: string; is_primary: boolean; department?: { name: string } };
type UserItem = { 
  id: string; name: string; email: string; role: string; 
  scope_type: string; scope_id?: string; is_active: boolean;
  is_backup_manager: boolean; is_backup_accountant: boolean; is_backup_cashier?: boolean;
  department_links?: UserDeptLink[];
};
type ProjectMember = { id: string; user_id: string; role: string };
type TreasuryAccount = { id: string; name: string; type: string };

const TABS = [
  { id: "departments", label: "🏢 Départements" },
  { id: "projects", label: "📁 Projets" },
  { id: "users", label: "👥 Droits & Permissions" },
];

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "🌍 Global",
  DEPARTMENT: "🏢 Département",
  PROJECT: "📁 Projet",
  TREASURY: "💰 Trésorerie",
};

export default function AdminOrganisationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("departments");

  // ─── Departments ──────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [deptLoading, setDeptLoading] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // ─── Projects ─────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [projForm, setProjForm] = useState({ name: "", code: "", description: "", status: "active", start_date: "", end_date: "" });
  const [projLoading, setProjLoading] = useState(false);
  const [editingProj, setEditingProj] = useState<Project | null>(null);
  const [selectedProj, setSelectedProj] = useState<Project | null>(null);
  const [projMembers, setProjMembers] = useState<ProjectMember[]>([]);

  // ─── Users & Treasuries ───────────────────────────────────────
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userModal, setUserModal] = useState<UserItem | null>(null);
  const [userModalTab, setUserModalTab] = useState("role");
  const [userForm, setUserForm] = useState<{
    role: string; is_backup_manager: boolean; is_backup_accountant: boolean; is_backup_cashier: boolean;
    scope_type: string; scope_id: string;
    department_ids: string[];
  }>({
    role: "employee", is_backup_manager: false, is_backup_accountant: false, is_backup_cashier: false,
    scope_type: "GLOBAL", scope_id: "",
    department_ids: []
  });

  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const flash = (type: "ok" | "err", text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  useEffect(() => {
    if (!user || !["admin", "super_admin"].includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const loadDepts = useCallback(async () => {
    setDeptLoading(true);
    try { setDepartments((await api.getDepartments() as any) || []); }
    catch { flash("err", "Erreur chargement départements"); }
    finally { setDeptLoading(false); }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjLoading(true);
    try { setProjects((await api.listProjects(true) as any) || []); }
    catch { flash("err", "Erreur chargement projets"); }
    finally { setProjLoading(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    try { setUsers((await api.getUsers() as any) || []); }
    catch { flash("err", "Erreur chargement utilisateurs"); }
  }, []);

  const loadTreasuryAccounts = useCallback(async () => {
    try { setTreasuryAccounts((await api.getTreasuryAccounts() as any) || []); }
    catch { console.error("Erreur chargement comptes trésorerie"); }
  }, []);

  useEffect(() => {
    if (tab === "departments") loadDepts();
    else if (tab === "projects") loadProjects();
    else if (tab === "users") { loadUsers(); loadDepts(); loadProjects(); loadTreasuryAccounts(); }
  }, [tab, loadDepts, loadProjects, loadUsers, loadTreasuryAccounts]);

  // ─── Dept Actions ─────────────────────────────────────────────
  async function saveDept() {
    if (!deptForm.name.trim()) return;
    try {
      if (editingDept) {
        await api.updateDepartment(editingDept.id, deptForm);
        flash("ok", "Département mis à jour");
      } else {
        await api.createDepartment(deptForm);
        flash("ok", "Département créé");
      }
      setDeptForm({ name: "", description: "" }); setEditingDept(null); loadDepts();
    } catch { flash("err", "Erreur sauvegarde département"); }
  }

  // ─── Project Actions ───────────────────────────────────────────
  async function saveProj() {
    if (!projForm.name.trim()) return;
    try {
      if (editingProj) {
        await api.updateProject(editingProj.id, projForm);
        flash("ok", "Projet mis à jour");
      } else {
        await api.createProject(projForm);
        flash("ok", "Projet créé");
      }
      setProjForm({ name: "", code: "", description: "", status: "active", start_date: "", end_date: "" });
      setEditingProj(null); loadProjects();
    } catch { flash("err", "Erreur sauvegarde projet"); }
  }

  async function loadProjMembers(proj: Project) {
    setSelectedProj(proj);
    try { setProjMembers((await api.listProjectMembers(proj.id) as any) || []); }
    catch { flash("err", "Erreur chargement membres"); }
  }

  // ─── User Management Actions ───────────────────────────────────
  function openUserModal(u: UserItem) {
    setUserModal(u);
    setUserModalTab("role");
    setUserForm({
      role: u.role || "employee",
      is_backup_manager: u.is_backup_manager || false,
      is_backup_accountant: u.is_backup_accountant || false,
      is_backup_cashier: u.is_backup_cashier || false,
      scope_type: u.scope_type || "GLOBAL",
      scope_id: u.scope_id || "",
      department_ids: (u.department_links || []).map(l => l.department_id)
    });
  }

  async function saveUserPermissions() {
    if (!userModal) return;
    try {
      // 1. Update Role and Backups
      await api.updateUserRole(userModal.id, {
        role: userForm.role,
        is_backup_manager: userForm.is_backup_manager,
        is_backup_accountant: userForm.is_backup_accountant,
        is_backup_cashier: userForm.is_backup_cashier,
      });

      // 2. Update Scope
      await api.updateUserScope(userModal.id, {
        scope_type: userForm.scope_type,
        scope_id: userForm.scope_id || null,
      });

      // 3. Update Departments
      await api.updateUserDepartments(userModal.id, userForm.department_ids);

      flash("ok", "Permissions de l'utilisateur mises à jour !");
      setUserModal(null);
      loadUsers();
    } catch { 
      flash("err", "Erreur lors de la mise à jour des permissions."); 
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-6">
      {/* Header */}
      <div className="mb-8 relative">
        <button onClick={() => router.push("/dashboard/users")} className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors mb-4">
          ← Retour à l'Annuaire de l'Équipe
        </button>
        <h1 className="text-3xl font-bold text-white">⚙️ Administration — Organisation</h1>
        <p className="text-slate-400 mt-1">Tour de contrôle des départements, projets et droits d'accès.</p>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`mb-4 rounded-xl px-5 py-3 text-sm font-medium ${msg.type === "ok" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"}`}>
          {msg.type === "ok" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB DÉPARTEMENTS ───────────────────────────────────── */}
      {tab === "departments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-4">{editingDept ? "✏️ Modifier" : "➕ Nouveau département"}</h2>
            <div className="space-y-3">
              <input placeholder="Nom *" value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <textarea placeholder="Description" value={deptForm.description} onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))}
                rows={3} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex gap-2">
                <button onClick={saveDept} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all">
                  {editingDept ? "Mettre à jour" : "Créer"}
                </button>
                {editingDept && (
                  <button onClick={() => { setEditingDept(null); setDeptForm({ name: "", description: "" }); }}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">✕</button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {deptLoading ? (
              <div className="text-slate-400 text-center py-12">Chargement...</div>
            ) : departments.length === 0 ? (
              <div className="text-slate-400 text-center py-12 bg-white/5 rounded-2xl">Aucun département créé.</div>
            ) : departments.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-white/10 backdrop-blur rounded-xl px-5 py-4 border border-white/10 hover:border-indigo-500/40 transition-all">
                <div>
                  <p className="text-white font-semibold">{d.name}</p>
                  {d.description && <p className="text-slate-400 text-sm mt-0.5">{d.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                    {d.is_active ? "Actif" : "Inactif"}
                  </span>
                  <button onClick={() => { setEditingDept(d); setDeptForm({ name: d.name, description: d.description || "" }); }}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">Modifier</button>
                  <button onClick={async () => { await api.updateDepartment(d.id, { is_active: !d.is_active }); loadDepts(); }}
                    className="text-slate-400 hover:text-white text-sm transition-colors">{d.is_active ? "Désactiver" : "Activer"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB PROJETS ────────────────────────────────────────── */}
      {tab === "projects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-4">{editingProj ? "✏️ Modifier" : "➕ Nouveau projet"}</h2>
            <div className="space-y-3">
              <input placeholder="Nom *" value={projForm.name} onChange={e => setProjForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input placeholder="Code (ex: PRJ-001)" value={projForm.code} onChange={e => setProjForm(p => ({ ...p, code: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <textarea placeholder="Description" value={projForm.description} onChange={e => setProjForm(p => ({ ...p, description: e.target.value }))}
                rows={2} className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <select value={projForm.status} onChange={e => setProjForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="active">Actif</option>
                <option value="on_hold">En attente</option>
                <option value="closed">Clôturé</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-slate-400">Début</label>
                  <input type="date" value={projForm.start_date} onChange={e => setProjForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
                <div><label className="text-xs text-slate-400">Fin</label>
                  <input type="date" value={projForm.end_date} onChange={e => setProjForm(p => ({ ...p, end_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveProj} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all">
                  {editingProj ? "Mettre à jour" : "Créer"}
                </button>
                {editingProj && (
                  <button onClick={() => { setEditingProj(null); setProjForm({ name: "", code: "", description: "", status: "active", start_date: "", end_date: "" }); }}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">✕</button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {projLoading ? (
              <div className="text-slate-400 text-center py-12">Chargement...</div>
            ) : projects.length === 0 ? (
              <div className="text-slate-400 text-center py-12 bg-white/5 rounded-2xl">Aucun projet créé.</div>
            ) : projects.map(p => (
              <div key={p.id} className="bg-white/10 backdrop-blur rounded-xl border border-white/10 hover:border-indigo-500/40 transition-all overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{p.name}</p>
                      {p.code && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{p.code}</span>}
                    </div>
                    {p.description && <p className="text-slate-400 text-sm mt-0.5">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === "active" ? "bg-emerald-500/20 text-emerald-300" : p.status === "on_hold" ? "bg-amber-500/20 text-amber-300" : "bg-slate-500/20 text-slate-400"}`}>
                      {p.status === "active" ? "Actif" : p.status === "on_hold" ? "En attente" : "Clôturé"}
                    </span>
                    <button onClick={() => { setEditingProj(p); setProjForm({ name: p.name, code: p.code || "", description: p.description || "", status: p.status, start_date: p.start_date?.split("T")[0] || "", end_date: p.end_date?.split("T")[0] || "" }); setTab("projects"); }}
                      className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">Modifier</button>
                    <button onClick={() => selectedProj?.id === p.id ? setSelectedProj(null) : loadProjMembers(p)}
                      className="text-slate-400 hover:text-white text-sm">
                      {selectedProj?.id === p.id ? "▲ Fermer" : "👥 Membres"}
                    </button>
                  </div>
                </div>
                {selectedProj?.id === p.id && (
                  <div className="border-t border-white/10 px-5 py-4 bg-black/20">
                    <p className="text-sm font-semibold text-slate-300 mb-3">Membres du projet</p>
                    {projMembers.length === 0 ? (
                      <p className="text-slate-500 text-sm">Aucun membre assigné.</p>
                    ) : (
                      <div className="space-y-1">
                        {projMembers.map(m => (
                          <div key={m.id} className="flex justify-between text-sm text-slate-300 bg-white/5 rounded-lg px-3 py-2">
                            <span>{m.user_id}</span>
                            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{m.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB DROITS & PERMISSIONS ────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-3">
          {users.length === 0 ? (
            <div className="text-slate-400 text-center py-12 bg-white/5 rounded-2xl">Aucun utilisateur.</div>
          ) : users.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-white/10 backdrop-blur rounded-xl px-5 py-4 border border-white/10 hover:border-indigo-500/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold">{u.name}</p>
                  <p className="text-slate-400 text-sm">{u.email} · <span className="text-indigo-300">{u.role}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm px-3 py-1.5 rounded-xl bg-white/10 text-slate-300 font-medium">
                  {SCOPE_LABELS[u.scope_type] || u.scope_type}
                </span>
                <button onClick={() => openUserModal(u)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl font-medium transition-all">
                  Gérer les droits
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── USER PERMISSIONS MODAL ────────────────────────────── */}
      {userModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Permissions de l'utilisateur</h3>
              <p className="text-slate-400 text-sm">{userModal.name} ({userModal.email})</p>
            </div>

            <div className="flex gap-2 border-b border-white/10 mb-6">
              {[{id:"role", label:"Rôle principal"}, {id:"scope", label:"Périmètre"}, {id:"depts", label:"Départements"}].map(t => (
                <button key={t.id} onClick={() => setUserModalTab(t.id)}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-all ${userModalTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-300"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {userModalTab === "role" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Rôle principal</label>
                    <select value={userForm.role} onChange={e => setUserForm(p => ({...p, role: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="employee">Employé (Basique)</option>
                      <option value="manager">Manager</option>
                      <option value="accountant">Comptable</option>
                      <option value="cashier">Caissier</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Droits Suppléants (Backups)</label>
                    <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/10">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={userForm.is_backup_manager} onChange={e => setUserForm(p => ({...p, is_backup_manager: e.target.checked}))}
                          className="w-5 h-5 rounded border-white/20 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm text-white">Manager Suppléant</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={userForm.is_backup_accountant} onChange={e => setUserForm(p => ({...p, is_backup_accountant: e.target.checked}))}
                          className="w-5 h-5 rounded border-white/20 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm text-white">Comptable Suppléant</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={userForm.is_backup_cashier} onChange={e => setUserForm(p => ({...p, is_backup_cashier: e.target.checked}))}
                          className="w-5 h-5 rounded border-white/20 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm text-white">Caissier Suppléant</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {userModalTab === "scope" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-3 block">Type de périmètre</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(SCOPE_LABELS).map(([val, label]) => (
                        <button key={val} onClick={() => setUserForm(p => ({ ...p, scope_type: val, scope_id: "" }))}
                          className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left ${userForm.scope_type === val ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25" : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {userForm.scope_type === "DEPARTMENT" && (
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Cibler le Département</label>
                      <select value={userForm.scope_id} onChange={e => setUserForm(p => ({ ...p, scope_id: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">-- Sélectionner --</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}

                  {userForm.scope_type === "PROJECT" && (
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Cibler le Projet</label>
                      <select value={userForm.scope_id} onChange={e => setUserForm(p => ({ ...p, scope_id: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">-- Sélectionner --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}

                  {userForm.scope_type === "TREASURY" && (
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">Cibler le Compte de Trésorerie</label>
                      <select value={userForm.scope_id} onChange={e => setUserForm(p => ({ ...p, scope_id: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">-- Sélectionner --</option>
                        {treasuryAccounts.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {userModalTab === "depts" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-sm font-medium text-slate-300 block">Appartenance aux départements</label>
                  <p className="text-xs text-slate-400 -mt-2 mb-4">Sélectionnez les départements dans lesquels cet utilisateur travaille.</p>
                  
                  {departments.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Aucun département disponible.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {departments.map(d => {
                        const checked = userForm.department_ids.includes(d.id);
                        return (
                          <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${checked ? "bg-indigo-600/20 border-indigo-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                            <input type="checkbox" checked={checked}
                              onChange={(e) => {
                                const newIds = e.target.checked 
                                  ? [...userForm.department_ids, d.id] 
                                  : userForm.department_ids.filter(id => id !== d.id);
                                setUserForm(p => ({...p, department_ids: newIds}));
                              }}
                              className="w-5 h-5 rounded border-white/20 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-white">{d.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button onClick={() => setUserModal(null)} className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-all">
                Annuler
              </button>
              <button onClick={saveUserPermissions} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const NOTIF_ICONS: Record<string, string> = {
  expense_created: "📝",
  expense_approved: "✅",
  expense_rejected: "❌",
  expense_paid: "💸",
  reminder: "⏰",
};

const NOTIF_COLORS: Record<string, string> = {
  expense_created: "bg-blue-50 border-blue-100",
  expense_approved: "bg-emerald-50 border-emerald-100",
  expense_rejected: "bg-red-50 border-red-100",
  expense_paid: "bg-purple-50 border-purple-100",
  reminder: "bg-yellow-50 border-yellow-100",
};

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86400)}j`;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [prefs, setPrefs] = useState<any>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "prefs">("list");



  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(1, 50) as any[];
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrefs = async () => {
    try {
      const data = await api.getNotifPreferences() as any;
      setPrefs(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadPrefs();
    }
  }, [user]);

  const handleMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.read_at) await handleMarkRead(notif.id);
    if (notif.link) router.push(notif.link);
  };

  const handlePrefsChange = (key: string, val: boolean) => {
    setPrefs((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    setPrefsMsg(null);
    try {
      await api.updateNotifPreferences(prefs);
      setPrefsMsg("Préférences enregistrées ✅");
    } catch {
      setPrefsMsg("Erreur lors de l'enregistrement");
    } finally {
      setSavingPrefs(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                FlowBon
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium text-gray-600">Notifications</span>
            </div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              ← Tableau de bord
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              🔔 Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Toutes vos notifications et préférences de réception.</p>
          </div>
          {activeTab === "list" && unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
            >
              {markingAll ? "En cours..." : "Tout marquer comme lu"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 flex">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "list"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Toutes les notifications
          </button>
          <button
            onClick={() => setActiveTab("prefs")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === "prefs"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Préférences
          </button>
        </div>

        {activeTab === "list" ? (
          <div className="space-y-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-gray-500 font-medium">Vous êtes à jour !</p>
                <p className="text-gray-400 text-sm mt-1">Aucune notification pour le moment.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-sm ${
                    NOTIF_COLORS[notif.type] || "bg-white border-gray-100"
                  } ${notif.read_at ? "opacity-60" : "shadow-sm"}`}
                >
                  <span className="text-2xl flex-shrink-0 mt-0.5">{NOTIF_ICONS[notif.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{notif.title}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notif.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                    {!notif.read_at && (
                      <span className="inline-block mt-1.5 w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Préférences de notification</h2>
            <p className="text-sm text-gray-500 mb-6">Choisissez comment et quand vous souhaitez être notifié.</p>

            {prefsMsg && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${prefsMsg.includes("✅") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {prefsMsg}
              </div>
            )}

            {!prefs ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Canal */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Canaux de notification</h3>
                  <div className="space-y-3">
                    {[
                      { key: "notify_in_app", label: "Notifications in-app", desc: "Icône cloche dans le tableau de bord" },
                      { key: "notify_email", label: "Notifications par email", desc: "Emails envoyés automatiquement" },
                    ].map(({ key, label, desc }) => (
                      <label key={key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefs[key] ?? true}
                          onChange={(e) => handlePrefsChange(key, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Types d'événements */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Événements à notifier</h3>
                  <div className="space-y-3">
                    {[
                      { key: "notify_on_created", label: "Nouveau bon soumis", icon: "📝" },
                      { key: "notify_on_approved", label: "Bon approuvé", icon: "✅" },
                      { key: "notify_on_rejected", label: "Bon refusé", icon: "❌" },
                      { key: "notify_on_paid", label: "Bon payé / remboursé", icon: "💸" },
                    ].map(({ key, label, icon }) => (
                      <label key={key} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{icon}</span>
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={prefs[key] ?? true}
                          onChange={(e) => handlePrefsChange(key, e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSavePrefs}
                  disabled={savingPrefs}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {savingPrefs ? "Enregistrement..." : "Enregistrer les préférences"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

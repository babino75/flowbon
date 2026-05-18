"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

export default function SubscriptionSelectPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    if (!user) return;

    api.getCompany()
      .then((data) => {
        setCompany(data);
        // If they already have an active premium subscription, redirect them to dashboard
        if (data && (data as any).subscription_status === "active") {
          router.push("/dashboard");
        }
      })
      .catch((err) => {
        console.error("Failed to load company:", err);
        setError("Impossible de charger les informations de votre entreprise.");
      })
      .finally(() => setLoading(false));
  }, [user, router]);

  const handleActivateTrial = async () => {
    if (!user || user.role !== "admin") return;
    setActivating(true);
    setError(null);
    try {
      await api.activateTrial();
      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Failed to activate trial:", err);
      setError(err?.message || "Une erreur est survenue lors de l'activation de la période d'essai.");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <span className="text-2xl font-black tracking-wider text-white">FB</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">FlowBon</span>
        </div>
        {company?.subscription_status === "pending_selection" ? (
          <button
            onClick={logout}
            className="text-sm font-semibold text-slate-400 hover:text-white transition duration-200 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-lg bg-slate-900/50"
          >
            Se déconnecter
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition duration-200 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 shadow-md shadow-black/20"
          >
            <span>✕</span>
            <span>Retour au tableau de bord</span>
          </Link>
        )}
      </div>

      {/* Main Pricing Section */}
      <div className="max-w-5xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Activez votre espace FlowBon
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            Bienvenue chez FlowBon, {user?.name} ! Configurez votre forfait pour commencer à gérer vos notes de frais et avances de caisse.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 bg-red-950/50 border border-red-500/30 text-red-200 p-4 rounded-xl text-center text-sm shadow-lg shadow-red-500/5">
            ⚠️ {error}
          </div>
        )}

        {!isAdmin && (
          <div className="max-w-2xl mx-auto mb-8 bg-amber-950/40 border border-amber-500/30 text-amber-200 p-4 rounded-xl text-center text-sm">
            💡 <strong>Note :</strong> Votre entreprise <strong>{company?.name}</strong> est en cours d'activation. Seul l'administrateur créateur du compte peut activer la période d'essai ou choisir un forfait. Veuillez le contacter pour démarrer.
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Trial */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-indigo-500/30 rounded-3xl p-8 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-indigo-500/60 transition duration-300">
            <div className="absolute top-0 right-0 bg-indigo-600 text-white font-semibold text-xs tracking-wider uppercase px-4 py-1.5 rounded-bl-2xl">
              Populaire
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-200 mb-2">Essai Gratuit</h3>
              <p className="text-sm text-slate-400 mb-6">Découvrez FlowBon en conditions réelles sans engagement.</p>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black text-white">0 {company?.currency || "FCFA"}</span>
                <span className="text-sm text-slate-400 ml-2">/ 7 jours</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Jusqu'à {company?.max_users || 10} collaborateurs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Demandes de notes de frais
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Avances de caisse & Justificatifs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Tableau de bord standard
                </li>
              </ul>
            </div>
            <button
              onClick={handleActivateTrial}
              disabled={activating || !isAdmin || company?.subscription_status === "trial"}
              className={`w-full py-4 px-6 rounded-2xl font-semibold transition duration-200 shadow-lg ${
                company?.subscription_status === "trial"
                  ? "bg-slate-800 text-indigo-400 border border-indigo-500/20 cursor-default"
                  : isAdmin
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/20 active:scale-95"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              {activating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Activation...
                </span>
              ) : company?.subscription_status === "trial" ? (
                "✓ Votre forfait actuel"
              ) : isAdmin ? (
                "Activer l'essai de 7 jours 🚀"
              ) : (
                "Admin requis"
              )}
            </button>
          </div>

          {/* Card 2: Premium */}
          <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-lg opacity-85 hover:opacity-100 transition duration-300 hover:border-slate-700">
            <div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">Premium</h3>
              <p className="text-sm text-slate-400 mb-6">Pour les PME désireuses d'optimiser leur gestion financière.</p>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black text-white">10 000 {company?.currency || "FCFA"}</span>
                <span className="text-sm text-slate-400 ml-2">/ mois</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Jusqu'à 50 collaborateurs
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Gestion des rôles & suppléants
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Archivage illimité
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> Rapprochement de caisse premium
                </li>
              </ul>
            </div>
            <button
              onClick={() => {
                if (isAdmin) setShowPremiumModal(true);
              }}
              disabled={!isAdmin}
              className={`w-full py-4 px-6 rounded-2xl font-semibold transition duration-200 border shadow-lg ${
                isAdmin
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20 active:scale-95 border-transparent"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700/50"
              }`}
            >
              {isAdmin ? "Devenir Premium ⭐" : "Admin requis"}
            </button>
          </div>

          {/* Card 3: Enterprise */}
          <div className="bg-slate-900/20 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-lg opacity-85 hover:opacity-100 transition duration-300 hover:border-slate-700">
            <div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">Sur Mesure</h3>
              <p className="text-sm text-slate-400 mb-6">Pour les grandes structures ayant des besoins spécifiques.</p>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-black text-white">Contactez-nous</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Collaborateurs illimités
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Support dédié 24/7 & SLA
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Intégrations ERP & API sur mesure
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span> Hébergement dédié possible
                </li>
              </ul>
            </div>
            <a
              href="mailto:tcharesamoudine@gmail.com?subject=Demande de forfait Entreprise FlowBon"
              className="w-full py-4 px-6 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700/50 font-semibold text-center transition duration-200"
            >
              Nous contacter 📞
            </a>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full text-center mt-12">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} FlowBon. Tous droits réservés. Gestion sécurisée de vos frais de déplacement.
        </p>
      </div>

      {/* Premium Manual Payment Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowPremiumModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl transition-colors"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-4xl inline-block mb-3">⭐</span>
              <h3 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Activer FlowBon Premium
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Forfait : 10 000 FCFA / mois
              </p>
            </div>

            <div className="space-y-5 text-sm text-slate-300">
              <p className="leading-relaxed text-slate-400 text-center">
                Le paiement en ligne direct est en cours d'intégration. En attendant, nous activons votre compte manuellement de façon ultra-rapide.
              </p>
              
              <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-4 space-y-3">
                <p className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Instructions simples :</p>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>
                    Contactez-nous directement via l'un de nos canaux ci-dessous.
                  </li>
                  <li>
                    Effectuez le paiement de <strong className="text-white">10 000 FCFA</strong> (par T-Money, Flooz, Wave ou virement).
                  </li>
                  <li>
                    Fournissez le nom de votre entreprise (<strong className="text-indigo-400">{company?.name || "votre entreprise"}</strong>).
                  </li>
                </ol>
              </div>

              <div className="text-xs text-slate-400 text-center italic">
                Votre espace de travail sera activé et débloqué en moins de 10 minutes après confirmation ! ⚡
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <a
                  href={`https://wa.me/22893864678?text=Bonjour,%20je%20souhaite%20activer%20l'abonnement%20Premium%20de%20mon%20entreprise%20sur%20FlowBon.%0A%0A-%20Entreprise%20:%20${encodeURIComponent(company?.name || "")}%0A-%20Email%20Admin%20:%20${encodeURIComponent(user?.email || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition duration-200 shadow-md shadow-emerald-600/10 text-xs text-center"
                >
                  💬 WhatsApp (+228 93864678)
                </a>
                <a
                  href="tel:+22893864678"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition duration-200 border border-slate-700/50 text-xs text-center"
                >
                  📞 Appeler (+228 93864678)
                </a>
              </div>

              <a
                href={`mailto:tcharesamoudine@gmail.com?subject=Activation%20Premium%20FlowBon&body=Bonjour%20Samoudine,%0A%0AJe%20souhaite%20activer%20l'abonnement%20Premium%20pour%20mon%20entreprise%20sur%20FlowBon.%0A%0A-%20Nom%20de%20l'entreprise%20:%20${encodeURIComponent(company?.name || "")}%0A-%20Email%20Administrateur%20:%20${encodeURIComponent(user?.email || "")}`}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition duration-200 text-xs text-center w-full shadow-md shadow-indigo-600/10"
              >
                ✉️ Contacter par Email (tcharesamoudine@gmail.com)
              </a>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPremiumModal(false)}
                className="px-5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition duration-200 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

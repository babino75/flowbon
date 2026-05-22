"use client";

import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { register } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<"profit" | "non_profit">("profit");
  // Rôle forcé à 'admin' en production pour créer une entreprise
  const role = "admin"; 
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    
    if (!companyName.trim()) {
      setError("Le nom de l'entreprise est obligatoire");
      return;
    }
    
    setLoading(true);
    try {
      await register({ name, email, password, role, company_name: companyName, company_type: companyType });
      // Le contexte register gère la redirection vers /dashboard
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Une erreur est survenue lors de l'inscription");
      } else {
        setError("Une erreur est survenue lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-black via-slate-900 to-indigo-900 text-white p-4">
      <div className="max-w-md w-full space-y-8 backdrop-blur-xl bg-white/10 p-10 rounded-3xl shadow-2xl border border-white/10">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-white">
            Créer un compte
          </h2>
          <p className="mt-2 text-center text-sm text-indigo-300">
            Rejoignez FlowBon pour gérer vos dépenses
          </p>
        </div>
        <form className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="name">
                Nom complet
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-600 bg-gray-800/50 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Jean Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-600 bg-gray-800/50 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="vous@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">
                Mot de passe (min 8 caractères)
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-4 py-3 pr-12 border border-gray-600 bg-gray-800/50 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="companyName">
                Nom de l'entreprise
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-600 bg-gray-800/50 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Nom de votre entreprise"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            
            {role === "admin" && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Statut Juridique
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setCompanyType("profit")}
                    className={`px-4 py-3 border rounded-xl flex flex-col items-center justify-center transition-all ${
                      companyType === "profit" 
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" 
                        : "border-gray-600 bg-gray-800/50 text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    <span className="font-medium mb-1">À but lucratif</span>
                    <span className="text-xs text-center opacity-80">Sociétés, Startups (SYSCOHADA)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyType("non_profit")}
                    className={`px-4 py-3 border rounded-xl flex flex-col items-center justify-center transition-all ${
                      companyType === "non_profit" 
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300" 
                        : "border-gray-600 bg-gray-800/50 text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    <span className="font-medium mb-1">À but non lucratif</span>
                    <span className="text-xs text-center opacity-80">ONG, Associations (SYCEBNL)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Inscription..." : "S'inscrire"}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

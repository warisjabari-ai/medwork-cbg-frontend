import { useState } from "react";

type Props = {
  onLogin: (matricule: string, password: string) => Promise<void>;
  users?: { matricule: string; name: string; roleId: number; active: boolean }[];
};

export default function LoginPage({ onLogin }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [matricule, setMatricule]       = useState("");
  const [password, setPassword]         = useState("");
  const [remember, setRemember]         = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!matricule.trim()) { setError("Veuillez saisir votre identifiant."); return; }
    if (!password.trim())  { setError("Veuillez saisir votre mot de passe."); return; }
    setLoading(true);
    try {
      await onLogin(matricule, password);
    } catch (err: any) {
      setError(err.message || "Identifiant ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">

      {/* ── Panneau gauche — Logo CBG ── */}
      <div className="relative hidden lg:flex lg:flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #00aadd 0%, #0099cc 50%, #0077aa 100%)" }}>
        {/* Image de fond pleine page */}
        <img
          src="/cbg-logo.jpg"
          alt="CBG"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      {/* ── Panneau droit — Formulaire ── */}
      <div className="flex flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">

          {/* En-tête mobile uniquement */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-medwork-cyan shadow-lg">
              <span className="text-2xl font-black text-white">M</span>
            </div>
            <p className="text-xl font-bold text-medwork-navy">MédWork CBG</p>
          </div>

          {/* Titre */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-medwork-navy">Connexion</h1>
            <p className="mt-1 text-sm text-slate-400">Accédez à votre espace de santé au travail.</p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="shrink-0 text-red-500">⚠️</span>
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Identifiant */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Identifiant
              </label>
              <input
                type="text"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                placeholder="Ex : icamara"
                autoFocus
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-medwork-cyan focus:ring-2 focus:ring-medwork-cyan/20"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-medwork-cyan focus:ring-2 focus:ring-medwork-cyan/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Se souvenir de moi */}
            <label className="flex cursor-pointer items-center gap-2.5">
              <div
                onClick={() => setRemember((v) => !v)}
                className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border-2 transition ${remember ? "border-medwork-cyan bg-medwork-cyan" : "border-slate-300 bg-white"}`}
              >
                {remember && <span className="text-[10px] font-bold text-white">✓</span>}
              </div>
              <span className="text-sm text-slate-600">Se souvenir de moi</span>
            </label>

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-medwork-cyan py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Connexion en cours…
                </span>
              ) : "Se connecter"}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-slate-400">
            MédWork CBG · Santé au travail · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
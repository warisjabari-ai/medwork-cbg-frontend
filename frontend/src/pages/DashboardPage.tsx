import { useMemo } from "react";
import { Sidebar, AppHeader } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";
import type { Worker } from "./WorkersPage";
import type { WorkerVisit } from "../types/visit";
import type { Decision } from "./DecisionsPage";

type Props = {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  searchData?: import("../components/Navigation").SearchableData;
  onOpenWorker?: (id: number) => void;
  onOpenVisit?: (visitId: number, workerId: number) => void;
  workers?: Worker[];
  allVisits?: WorkerVisit[];
  decisions?: Decision[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDMY(s: string): Date | null {
  if (!s) return null;
  const [d, m, y] = s.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function todayStr() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2,"0")}/${String(t.getMonth()+1).padStart(2,"0")}/${t.getFullYear()}`;
}

const MOIS_FR = ["Jan","Fév","Mar","Avr","Mai","Jun","Juil","Aoû","Sep","Oct","Nov","Déc"];

// ─── Graphique barres ─────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; current?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-32 w-full">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] text-slate-500 font-semibold">{d.value > 0 ? d.value : ""}</span>
            <div className="w-full relative flex items-end" style={{ height: "88px" }}>
              <div
                className={`w-full rounded-t-lg transition-all ${d.current ? "bg-medwork-cyan" : "bg-medwork-navy/20 hover:bg-medwork-navy/40"}`}
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className={`text-[9px] font-semibold ${d.current ? "text-medwork-cyan" : "text-slate-400"}`}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Carte stat ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, onClick }: {
  label: string; value: string | number; sub?: string;
  color: string; icon: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white p-5 shadow-sm border border-slate-100 ${onClick ? "cursor-pointer hover:shadow-md transition" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage({
  currentPage, onNavigate, onLogout, userName, userRole, userPhoto, isSuperAdmin,
  permissions = [], searchData, onOpenWorker, onOpenVisit,
  workers = [], allVisits = [], decisions = [],
}: Props) {
  const today = todayStr();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // ── Statistiques ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const visitsToday = allVisits.filter(v => v.date === today).length;
    const visitsThisMonth = allVisits.filter(v => {
      const d = parseDMY(v.date);
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Aptitudes expirées : nextVisit < aujourd'hui
    const expired = allVisits.filter(v => {
      if (v.closed || !v.nextVisit) return false;
      const d = parseDMY(v.nextVisit);
      return d && d < new Date();
    }).length;

    // Travailleurs actifs
    const actifs = workers.filter(w => w.contractStatus === "actif").length;

    // Répartition des aptitudes ce mois
    const aptitudes: Record<string, number> = {};
    allVisits.filter(v => {
      const d = parseDMY(v.date);
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).forEach(v => {
      if (v.aptitude) aptitudes[v.aptitude] = (aptitudes[v.aptitude] || 0) + 1;
    });

    return { visitsToday, visitsThisMonth, expired, actifs, aptitudes };
  }, [allVisits, workers, today, currentMonth, currentYear]);

  // ── Données graphique : 12 derniers mois ────────────────────────────────────
  const monthlyData = useMemo(() => {
    const months: { label: string; value: number; current: boolean }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const count = allVisits.filter(v => {
        const vd = parseDMY(v.date);
        return vd && vd.getMonth() === m && vd.getFullYear() === y;
      }).length;
      months.push({ label: MOIS_FR[m], value: count, current: i === 0 });
    }
    return months;
  }, [allVisits, currentMonth, currentYear]);

  // ── Dernières visites ────────────────────────────────────────────────────────
  const recentVisits = useMemo(() => {
    return [...allVisits]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  }, [allVisits]);

  const workerName = (id: number) => workers.find(w => w.id === id)?.name ?? "—";

  // ── Couleur aptitude ─────────────────────────────────────────────────────────
  const aptColor = (apt: string) => {
    const dec = decisions.find(d => d.label === apt);
    if (!dec) return "bg-slate-100 text-slate-600";
    const c = dec.color;
    if (c === "green")  return "bg-green-50 text-green-700 ring-green-200";
    if (c === "orange") return "bg-orange-50 text-orange-700 ring-orange-200";
    if (c === "red")    return "bg-red-50 text-red-700 ring-red-200";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout}
        userName={userName} userRole={userRole} userPhoto={userPhoto}
        isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Tableau de bord" onNavigate={onNavigate}
          searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin}
          onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Cartes statistiques ── */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Travailleurs actifs" value={stats.actifs}
              sub={`${workers.length} au total`}
              color="text-medwork-navy" icon="👷"
              onClick={() => onNavigate("workers")}
            />
            <StatCard
              label="Visites aujourd'hui" value={stats.visitsToday}
              sub={`${stats.visitsThisMonth} ce mois`}
              color="text-medwork-cyan" icon="🩺"
              onClick={() => onNavigate("visits")}
            />
            <StatCard
              label="Aptitudes expirées" value={stats.expired}
              sub="Renouvellements à planifier"
              color={stats.expired > 0 ? "text-red-600" : "text-slate-500"} icon="⚠️"
              onClick={() => onNavigate("visits")}
            />
            <StatCard
              label="Visites ce mois" value={stats.visitsThisMonth}
              sub={`${currentYear}`}
              color="text-medwork-navy" icon="📅"
            />
          </div>

          {/* ── Graphique évolution mensuelle ── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-medwork-navy">Évolution mensuelle des consultations</h2>
                <p className="text-xs text-slate-400 mt-0.5">12 derniers mois</p>
              </div>
              <span className="rounded-full bg-medwork-cyan/10 px-3 py-1 text-xs font-semibold text-medwork-cyan">
                {allVisits.length} visite{allVisits.length > 1 ? "s" : ""} au total
              </span>
            </div>
            {allVisits.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-slate-400">
                Aucune visite enregistrée
              </div>
            ) : (
              <BarChart data={monthlyData} />
            )}
          </div>

          {/* ── Deux colonnes : dernières visites + répartition aptitudes ── */}
          <div className="grid gap-5 md:grid-cols-2">

            {/* Dernières visites */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="mb-4 text-sm font-bold text-medwork-navy">Dernières visites</h2>
              {recentVisits.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune visite enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {recentVisits.map(v => (
                    <div key={v.id}
                      onClick={() => onNavigate("visits")}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50 cursor-pointer transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{workerName(v.workerId)}</p>
                        <p className="text-xs text-slate-400">{v.type} · {v.date}</p>
                      </div>
                      {v.aptitude && (
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${aptColor(v.aptitude)}`}>
                          {v.aptitude}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => onNavigate("visits")}
                className="mt-4 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition">
                Voir toutes les visites →
              </button>
            </div>

            {/* Répartition des aptitudes ce mois */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="mb-4 text-sm font-bold text-medwork-navy">
                Aptitudes — {MOIS_FR[currentMonth]} {currentYear}
              </h2>
              {Object.keys(stats.aptitudes).length === 0 ? (
                <p className="text-sm text-slate-400">Aucune aptitude saisie ce mois.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.aptitudes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, count]) => {
                      const total = Object.values(stats.aptitudes).reduce((s, n) => s + n, 0);
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-700">{label}</span>
                            <span className="text-xs text-slate-400">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-medwork-cyan transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
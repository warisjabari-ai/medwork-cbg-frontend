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
    <div className="flex items-end gap-1.5 w-full" style={{ height: 100 }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            {d.value > 0 && <span className="text-[9px] font-medium" style={{ color: d.current ? '#00aadd' : '#9ca3af' }}>{d.value}</span>}
            <div className="w-full flex items-end" style={{ flex: 1 }}>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(pct, d.value > 0 ? 6 : 0)}%`,
                  background: d.current ? '#00aadd' : '#e2e6ea',
                  borderRadius: '3px 3px 0 0',
                }}
              />
            </div>
            <span className="text-[9px] font-medium" style={{ color: d.current ? '#00aadd' : '#9ca3af' }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Carte stat ───────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, onClick, accent }: {
  label: string; value: string | number; sub?: string;
  icon: string; onClick?: () => void; accent?: string;
}) {
  return (
    <div
      onClick={onClick}
      className="rounded-xl bg-white border p-5 transition-all"
      style={{
        borderColor: '#e2e6ea',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        cursor: onClick ? 'pointer' : undefined,
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.borderColor='#c0c8d0'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform='translateY(-1px)'; } }}
      onMouseLeave={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.borderColor='#e2e6ea'; (e.currentTarget as HTMLDivElement).style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform='none'; } }}
    >
      <div className="flex items-start justify-between mb-3">
        <span style={{ fontSize: 20 }}>{icon}</span>
        {accent && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#e8f7fc', color: '#0077aa' }}>{accent}</span>}
      </div>
      <p className="text-2xl font-bold" style={{ color: '#0c1e30', lineHeight: 1 }}>{value}</p>
      <p className="text-xs font-medium mt-1.5" style={{ color: '#6b7280' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{sub}</p>}
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
    <div className="flex h-screen overflow-hidden" style={{ background: '#f4f6f8' }}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout}
        userName={userName} userRole={userRole} userPhoto={userPhoto}
        isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Tableau de bord" onNavigate={onNavigate}
          searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin}
          onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── Cartes statistiques ── */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Travailleurs actifs" value={stats.actifs}
              sub={`${workers.length} au total`} icon="👷"
              onClick={() => onNavigate("workers")} />
            <StatCard label="Visites aujourd'hui" value={stats.visitsToday}
              sub={`${stats.visitsThisMonth} ce mois`} icon="🩺"
              accent={stats.visitsToday > 0 ? "Actif" : undefined}
              onClick={() => onNavigate("visits")} />
            <StatCard label="Aptitudes expirées" value={stats.expired}
              sub="Renouvellements à planifier" icon="⚠️"
              onClick={() => onNavigate("visits")} />
            <StatCard label="Visites ce mois" value={stats.visitsThisMonth}
              sub={`${currentYear}`} icon="📅" />
          </div>

          {/* ── Graphique ── */}
          <div className="rounded-xl bg-white border p-5" style={{ borderColor: '#e2e6ea', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: '#1a2332' }}>Consultations médicales</h3>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>12 derniers mois</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: '#e8f7fc', color: '#0077aa' }}>
                {allVisits.length} visite{allVisits.length > 1 ? "s" : ""}
              </span>
            </div>
            {allVisits.length === 0 ? (
              <div className="flex items-center justify-center text-sm" style={{ height: 80, color: '#9ca3af' }}>
                Aucune visite enregistrée
              </div>
            ) : <BarChart data={monthlyData} />}
          </div>

          {/* ── Deux colonnes ── */}
          <div className="grid gap-4 md:grid-cols-2">

            {/* Dernières visites */}
            <div className="rounded-xl bg-white border p-5" style={{ borderColor: '#e2e6ea', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#1a2332' }}>Dernières visites</h3>
              {recentVisits.length === 0 ? (
                <p className="text-sm" style={{ color: '#9ca3af' }}>Aucune visite enregistrée.</p>
              ) : (
                <div className="space-y-1.5">
                  {recentVisits.map(v => (
                    <div key={v.id} onClick={() => onNavigate("visits")}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition"
                      style={{ border: '1px solid #edf0f3' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background='#f8fafc'; (e.currentTarget as HTMLDivElement).style.borderColor='#d0d8e0'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background='transparent'; (e.currentTarget as HTMLDivElement).style.borderColor='#edf0f3'; }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#1a2332' }}>{workerName(v.workerId)}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{v.type} · {v.date}</p>
                      </div>
                      {v.aptitude && (
                        <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: '#e8f7fc', color: '#0077aa' }}>
                          {v.aptitude}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => onNavigate("visits")}
                className="mt-3 w-full rounded-lg py-2 text-xs font-medium transition"
                style={{ border: '1px solid #e2e6ea', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#f8fafc'; (e.currentTarget as HTMLButtonElement).style.color='#1a2332'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='transparent'; (e.currentTarget as HTMLButtonElement).style.color='#6b7280'; }}
              >
                Voir toutes les visites →
              </button>
            </div>

            {/* Répartition des aptitudes */}
            <div className="rounded-xl bg-white border p-5" style={{ borderColor: '#e2e6ea', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#1a2332' }}>Aptitudes médicales</h3>
              <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>{MOIS_FR[currentMonth]} {currentYear}</p>
              {Object.keys(stats.aptitudes).length === 0 ? (
                <p className="text-sm" style={{ color: '#9ca3af' }}>Aucune aptitude saisie ce mois.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.aptitudes).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                    const total = Object.values(stats.aptitudes).reduce((s, n) => s + n, 0);
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium" style={{ color: '#374151' }}>{label}</span>
                          <span className="text-xs" style={{ color: '#9ca3af' }}>{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#00aadd' }} />
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
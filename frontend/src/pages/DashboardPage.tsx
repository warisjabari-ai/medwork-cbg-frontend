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
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, width: '100%' }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: d.value > 0 ? (d.current ? '#00aadd' : '#9aa3ae') : 'transparent' }}>{d.value}</span>
            <div style={{ width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', height: 80 }}>
              <div style={{
                width: '100%',
                borderRadius: '3px 3px 0 0',
                height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%`,
                background: d.current ? '#00aadd' : 'rgba(12,30,48,0.08)',
                transition: 'all 0.3s ease',
              }} />
            </div>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 9,
              fontWeight: d.current ? 500 : 300,
              color: d.current ? '#00aadd' : '#b8c0ca',
              letterSpacing: '0.02em',
            }}>{d.label}</span>
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
      style={{
        background: 'white',
        border: '1px solid #eef0f3',
        borderRadius: 10,
        padding: '20px 22px',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'all 0.18s ease',
        boxShadow: '0 1px 3px rgba(12,30,48,0.04)',
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,170,221,0.2)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(12,30,48,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.borderColor = '#eef0f3'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(12,30,48,0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9aa3ae', margin: '0 0 8px' }}>{label}</p>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, fontWeight: 400, color: '#0c1e30', lineHeight: 1, letterSpacing: '-0.02em', margin: 0 }}>{value}</p>
          {sub && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: '#9aa3ae', margin: '5px 0 0' }}>{sub}</p>}
        </div>
        <span style={{ fontSize: 20, opacity: 0.3 }}>{icon}</span>
      </div>
    </div>
  );
}
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
    <div className="flex h-screen overflow-hidden" style={{ background: '#f7f8fa' }}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout}
        userName={userName} userRole={userRole} userPhoto={userPhoto}
        isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Tableau de bord" onNavigate={onNavigate}
          searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin}
          onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto" style={{ padding: '28px 32px' }}>

          {/* ── Cartes statistiques ── */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" style={{ marginBottom: 20 }}>
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
          <div style={{ background: 'white', border: '1px solid #eef0f3', borderRadius: 10, padding: '22px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(12,30,48,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: '#0c1e30', margin: '0 0 3px', letterSpacing: '-0.01em' }}>
                  Évolution des consultations
                </h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 300, color: '#9aa3ae', margin: 0 }}>12 derniers mois</p>
              </div>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                fontWeight: 400,
                color: '#00aadd',
                background: 'rgba(0,170,221,0.08)',
                padding: '4px 10px',
                borderRadius: 20,
              }}>
                {allVisits.length} visite{allVisits.length > 1 ? "s" : ""}
              </span>
            </div>
            {allVisits.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#b8c0ca', fontWeight: 300 }}>
                Aucune visite enregistrée
              </div>
            ) : (
              <BarChart data={monthlyData} />
            )}
          </div>

          {/* ── Deux colonnes ── */}
          <div className="grid gap-4 md:grid-cols-2">

            {/* Dernières visites */}
            <div style={{ background: 'white', border: '1px solid #eef0f3', borderRadius: 10, padding: '22px 24px', boxShadow: '0 1px 3px rgba(12,30,48,0.04)' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: '#0c1e30', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                Dernières visites
              </h2>
              {recentVisits.length === 0 ? (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#b8c0ca', fontWeight: 300 }}>Aucune visite enregistrée.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentVisits.map(v => (
                    <div key={v.id}
                      onClick={() => onNavigate("visits")}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        borderRadius: 8,
                        border: '1px solid #f0f2f5',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: 'transparent',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,170,221,0.15)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,170,221,0.02)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#f0f2f5'; (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400, color: '#0c1e30', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workerName(v.workerId)}</p>
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: '#9aa3ae', margin: '2px 0 0' }}>{v.type} · {v.date}</p>
                      </div>
                      {v.aptitude && (
                        <span style={{
                          flexShrink: 0,
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 10,
                          fontWeight: 500,
                          padding: '3px 9px',
                          borderRadius: 20,
                          background: 'rgba(0,170,221,0.08)',
                          color: '#0077aa',
                          letterSpacing: '0.02em',
                        }}>
                          {v.aptitude}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => onNavigate("visits")}
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: '9px 0',
                  borderRadius: 8,
                  border: '1px solid #eef0f3',
                  background: 'transparent',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11.5,
                  fontWeight: 300,
                  color: '#9aa3ae',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00aadd'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,170,221,0.25)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9aa3ae'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#eef0f3'; }}
              >
                Voir toutes les visites →
              </button>
            </div>

            {/* Répartition des aptitudes ce mois */}
            <div style={{ background: 'white', border: '1px solid #eef0f3', borderRadius: 10, padding: '22px 24px', boxShadow: '0 1px 3px rgba(12,30,48,0.04)' }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 400, color: '#0c1e30', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                Aptitudes médicales
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, fontWeight: 300, color: '#9aa3ae', margin: '0 0 18px' }}>
                {MOIS_FR[currentMonth]} {currentYear}
              </p>
              {Object.keys(stats.aptitudes).length === 0 ? (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#b8c0ca', fontWeight: 300 }}>Aucune aptitude saisie ce mois.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {Object.entries(stats.aptitudes)
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, count]) => {
                      const total = Object.values(stats.aptitudes).reduce((s, n) => s + n, 0);
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={label}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, fontWeight: 300, color: '#0c1e30' }}>{label}</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: '#9aa3ae' }}>{count} <span style={{ opacity: 0.6 }}>({pct}%)</span></span>
                          </div>
                          <div style={{ height: 3, width: '100%', borderRadius: 2, background: '#f0f2f5', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 2, background: '#00aadd', width: `${pct}%`, transition: 'width 0.4s ease' }} />
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
import { useEffect, useRef, useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";
import type { WorkerVisit } from "../types/visit";
import type { Worker } from "./WorkersPage";

// ─── Export helpers ───────────────────────────────────────────────────────────
function exportCSV(rows: string[][], filename: string) {
  const bom = "\uFEFF";
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bom + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename + ".csv";
  a.click();
}

function ExportDropdown({ onPDF, onExcel }: { onPDF: () => void; onExcel: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
        <Icon d={icons.download} size={14} />
        Exporter
        <Icon d={icons.chevDown} size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <button onClick={() => { onPDF(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 transition">
            📄 Export PDF
          </button>
          <button onClick={() => { onExcel(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-green-50 hover:text-green-600 border-t border-slate-100 transition">
            📊 Export Excel
          </button>
        </div>
      )}
    </div>
  );
}

type Props = {
  allVisits: WorkerVisit[];
  workers: Worker[];
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  onNewVisitForWorker: (worker: Worker) => void;
  onSelectWorker: (worker: Worker) => void;
  onEditVisit: (visit: WorkerVisit, worker: Worker) => void;
  // Ouvrir directement une visite en lecture dans l'historique du travailleur
  onOpenVisit: (visit: WorkerVisit, worker: Worker) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDate(str: string): number {
  const parts = str.split("/");
  if (parts.length !== 3) return 0;
  return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
}

function getAptitudeBadge(aptitude: string) {
  const v = aptitude.trim().toLowerCase();
  if (v === "apte") return "bg-green-50 text-green-700 ring-green-200";
  if (v.includes("restriction")) return "bg-orange-50 text-orange-700 ring-orange-200";
  if (v.includes("surveiller") || v.includes("inapte")) return "bg-red-50 text-red-700 ring-red-200";
  return "bg-sky-50 text-sky-700 ring-sky-200";
}

function getAptitudeDot(aptitude: string) {
  const v = aptitude.trim().toLowerCase();
  if (v === "apte") return "bg-green-500";
  if (v.includes("restriction")) return "bg-orange-500";
  return "bg-red-500";
}

// ─── Modal sélection travailleur ──────────────────────────────────────────────
function WorkerSelectModal({
  workers,
  onSelect,
  onClose,
}: {
  workers: Worker[];
  onSelect: (w: Worker) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // Délai pour éviter que le click qui ouvre le modal ne le referme aussitôt
    const timer = setTimeout(() => document.addEventListener("mousedown", h), 100);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", h); };
  }, [onClose]);

  const filtered = workers.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    w.matricule.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div ref={ref} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-medwork-navy px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Nouvelle visite médicale</h2>
            <p className="mt-0.5 text-xs text-white/60">Sélectionnez le travailleur concerné</p>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 text-sm">✕</button>
        </div>

        {/* Recherche */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon d={icons.search} size={14} />
            </span>
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou matricule…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((w) => {
              const initials = w.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
              return (
                <button
                  key={w.id}
                  onClick={() => onSelect(w)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-medwork-navy text-xs font-bold text-white">
                    {initials}
                  </span>
                  <span className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{w.name}</p>
                    <p className="text-xs text-slate-400">{w.matricule} · {w.department}</p>
                  </span>
                  <span className="shrink-0">
                    <Icon d={icons.chevRight} size={14} />
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Aucun travailleur trouvé.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── VisitsPage ───────────────────────────────────────────────────────────────
export default function VisitsPage({
  allVisits,
  workers,
  currentPage,
  onNavigate,
  onLogout,
  onNewVisitForWorker,
  onSelectWorker,
  onEditVisit,
  onOpenVisit,
  userName,
  userRole,
  userPhoto,
  isSuperAdmin,
  permissions = [],
  searchData,
  onOpenWorker,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [visitSearch, setVisitSearch] = useState("");

  // Helper permission
  const can = (perm: string): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const parts = perm.split(".");
    for (let i = 1; i < parts.length; i++) {
      if (permissions.includes(parts.slice(0, i).join("."))) return true;
    }
    return permissions.some(p => p === perm || p.startsWith(perm + "."));
  };

  // Trier les visites du plus récent au plus ancien (par date, puis par id)
  const sorted = [...allVisits].sort((a, b) => {
    const dateDiff = parseDate(b.date) - parseDate(a.date);
    return dateDiff !== 0 ? dateDiff : b.id - a.id;
  });

  // Retrouver le nom du travailleur depuis son id
  const workerName = (workerId: number) =>
    workers.find((w) => w.id === workerId)?.name ?? "Inconnu";

  const workerObj = (workerId: number) =>
    workers.find((w) => w.id === workerId) ?? null;

  // Filtrage par référence, nom de travailleur, médecin ou type de visite
  const filteredVisits = sorted.filter((v) => {
    if (!visitSearch.trim()) return true;
    const q = visitSearch.toLowerCase();
    return (
      (v.ref ?? "").toLowerCase().includes(q) ||
      workerName(v.workerId).toLowerCase().includes(q) ||
      (v.doctor ?? "").toLowerCase().includes(q) ||
      (v.type ?? "").toLowerCase().includes(q)
    );
  });

  // Export Excel
  const handleExcelExport = () => {
    const header = ["Référence", "Travailleur", "Matricule", "Date", "Type de visite", "Médecin", "Aptitude", "Prochaine visite", "Statut"];
    const rows = filteredVisits.map((v) => {
      const wk = workerObj(v.workerId);
      return [v.ref ?? "—", workerName(v.workerId), wk?.matricule ?? "—", v.date, v.type, v.doctor ?? "—", v.aptitude, v.nextVisit ?? "—", v.closed ? "Clôturé" : "En cours"];
    });
    exportCSV([header, ...rows], `visites_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}`);
  };

  // Export PDF
  const handlePDFExport = () => {
    const rows = filteredVisits.map((v) => {
      const wk = workerObj(v.workerId);
      return `<tr>
        <td>${v.ref ?? "—"}</td>
        <td>${workerName(v.workerId)}</td>
        <td>${wk?.matricule ?? "—"}</td>
        <td>${v.date}</td>
        <td>${v.type}</td>
        <td>${v.doctor ?? "—"}</td>
        <td>${v.aptitude}</td>
        <td>${v.nextVisit ?? "—"}</td>
        <td>${v.closed ? "Clôturé" : "En cours"}</td>
      </tr>`;
    }).join("");

    const html = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
        h1 { font-size: 16px; font-weight: 800; color: #0f2d5a; margin-bottom: 4px; }
        p { font-size: 11px; color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        @page { margin: 14mm 12mm; }
      </style>
      <h1>Liste des visites médicales</h1>
      <p>Exporté le ${new Date().toLocaleDateString("fr-FR")} · ${filteredVisits.length} visite(s)</p>
      <table>
        <thead><tr>
          <th>Référence</th><th>Travailleur</th><th>Matricule</th><th>Date</th>
          <th>Type</th><th>Médecin</th><th>Aptitude</th><th>Prochaine visite</th><th>Statut</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 500);
    }
  };

  return (
    <>
      {showModal && (
        <WorkerSelectModal
          workers={workers}
          onSelect={(w) => { setShowModal(false); onNewVisitForWorker(w); }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />

        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader title="Visites médicales" onNavigate={onNavigate} searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin} onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">

              {/* Barre d'outils */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
                {/* Recherche par référence / travailleur / médecin */}
                <div className="relative flex-1 min-w-[220px]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon d={icons.search} size={14} />
                  </span>
                  <input
                    type="text"
                    value={visitSearch}
                    onChange={(e) => setVisitSearch(e.target.value)}
                    placeholder="Rechercher par référence, travailleur, médecin…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20"
                  />
                  {visitSearch && (
                    <button onClick={() => setVisitSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                  )}
                </div>
                <p className="text-xs text-slate-400 whitespace-nowrap">
                  <span className="font-bold text-medwork-navy">{filteredVisits.length}</span>{" "}
                  visite{filteredVisits.length > 1 ? "s" : ""}
                  {visitSearch && ` sur ${sorted.length}`}
                </p>
                <ExportDropdown onPDF={handlePDFExport} onExcel={handleExcelExport} />
                {can("visits.create") && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="ml-auto flex items-center gap-2 rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90"
                  >
                    <Icon d={icons.plus} size={15} />
                    Nouvelle visite
                  </button>
                )}
              </div>

              {/* Tableau */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      {["Référence", "Travailleur", "Matricule", "Date", "Type de visite", "Médecin", "Aptitude", "Statut", "Actions"].map((h) => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVisits.length > 0 ? (
                      filteredVisits.map((visit) => {
                        const wk = workerObj(visit.workerId);
                        const dot = getAptitudeDot(visit.aptitude);
                        const badge = getAptitudeBadge(visit.aptitude);
                        return (
                          <tr
                            key={visit.id}
                            className="cursor-pointer text-sm transition hover:bg-cyan-50/40"
                            onClick={() => {
                              // Priorité 1 : worker trouvé → navigation directe vers la visite
                              if (wk) {
                                onOpenVisit(visit, wk);
                              } else {
                                // Priorité 2 : worker non chargé → App.tsx trouvera le worker via workerId
                                onOpenVisit({ ...visit } as WorkerVisit, { id: visit.workerId, name: "", matricule: "", department: "", position: "", company: "", residence: "", contractStatus: "actif", status: "", lastVisit: "" } as Worker);
                              }
                            }}
                          >
                            {/* Référence */}
                            <td className="px-5 py-3.5">
                              {visit.ref
                                ? <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono font-semibold text-slate-600 ring-1 ring-slate-200">{visit.ref}</span>
                                : <span className="text-[10px] text-slate-400">—</span>}
                            </td>
                            {/* Travailleur */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-medwork-navy text-[10px] font-bold text-white">
                                  {workerName(visit.workerId).split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                                </span>
                                <span className="font-semibold text-medwork-navy">
                                  {workerName(visit.workerId)}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                              {wk?.matricule ?? "—"}
                            </td>
                            <td className="px-5 py-3.5 text-slate-700 font-medium">{visit.date}</td>
                            <td className="px-5 py-3.5 text-slate-600">{visit.type}</td>
                            <td className="px-5 py-3.5 text-slate-600">{visit.doctor || "—"}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                                {visit.aptitude}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              {visit.closed ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                                  🔒 Clôturée
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-medwork-cyan ring-1 ring-inset ring-cyan-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-medwork-cyan" />
                                  Ouverte
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                {!visit.closed && can("visits.edit") && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const worker = wk ?? workers.find((w) => w.id === visit.workerId);
                                      if (worker) onEditVisit(visit, worker);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-500 hover:bg-amber-500 hover:text-white"
                                  >
                                    ✏️ Modifier
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-5 py-16 text-center">
                          <p className="text-3xl mb-2">📋</p>
                          <p className="font-semibold text-slate-600">Aucune visite enregistrée</p>
                          <p className="mt-1 text-sm text-slate-400">
                            Cliquez sur "Nouvelle visite" pour créer la première.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
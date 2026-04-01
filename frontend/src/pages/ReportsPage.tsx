import { useRef, useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";
import type { WorkerVisit } from "../types/visit";
import type { Worker } from "./WorkersPage";
import type { Decision } from "./DecisionsPage";
import DatePicker from "../components/DatePicker";

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  allVisits: WorkerVisit[];
  workers: Worker[];
  decisions: Decision[];
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function parseMonthYear(dateStr: string): { month: number; year: number } | null {
  // Format: DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return { month: parseInt(parts[1]), year: parseInt(parts[2]) };
}

// ─── Hook export PDF — ouvre un nouvel onglet avec HTML autonome ──────────────
function usePrintExport() {
  const ref = useRef<HTMLDivElement>(null);

  const exportPDF = (title: string) => {
    if (!ref.current) return;

    // Extraire les données du tableau depuis le DOM du ref
    const rows: string[][] = [];
    const table = ref.current.querySelector("table");

    if (table) {
      // Mode tableau : extraire les lignes th et td
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) => (th as HTMLElement).innerText.trim());
      const bodyRows = Array.from(table.querySelectorAll("tbody tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) => (td as HTMLElement).innerText.trim())
      );
      const headerRow = headers.length ? `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>` : "";
      const bodyHTML = bodyRows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");

      const html = `
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
          h1 { font-size: 15px; font-weight: 800; color: #0f2d5a; margin-bottom: 4px; }
          p { font-size: 11px; color: #64748b; margin-bottom: 14px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f1f5f9; text-align: left; padding: 7px 9px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
          td { padding: 6px 9px; border-bottom: 1px solid #f1f5f9; }
          tr:nth-child(even) td { background: #f8fafc; }
          @page { margin: 14mm 12mm; }
        </style>
        <h1>${title}</h1>
        <p>Exporté le ${new Date().toLocaleDateString("fr-FR")}</p>
        <table><thead>${headerRow}</thead><tbody>${bodyHTML}</tbody></table>`;

      const win = window.open("", "_blank");
      if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500); }
    } else {
      // Mode texte/barres : capture le texte brut
      const text = ref.current.innerText;
      const html = `
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; white-space: pre-wrap; }
          h1 { font-size: 15px; font-weight: 800; color: #0f2d5a; margin-bottom: 4px; }
          p { font-size: 11px; color: #64748b; margin-bottom: 14px; }
          @page { margin: 14mm 12mm; }
        </style>
        <h1>${title}</h1>
        <p>Exporté le ${new Date().toLocaleDateString("fr-FR")}</p>
        <pre>${text}</pre>`;

      const win = window.open("", "_blank");
      if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500); }
    }
  };

  return { ref, exportPDF };
}

// ─── Export Excel (CSV encodé UTF-8 BOM pour Excel) ───────────────────────────
function exportToExcel(rows: string[][], filename: string) {
  const bom = "\uFEFF";
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Composant carte de rapport ───────────────────────────────────────────────
function ReportCard({
  icon, title, description, color, onClick, active,
}: {
  icon: string; title: string; description: string;
  color: string; onClick: () => void; active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-start rounded-2xl border-2 p-6 text-left transition-all hover:shadow-lg
        ${active
          ? `${color} border-current shadow-md`
          : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${active ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200"} transition`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-sm font-bold ${active ? "text-current" : "text-medwork-navy"}`}>{title}</p>
      <p className={`mt-1 text-xs leading-relaxed ${active ? "text-current/70" : "text-slate-400"}`}>{description}</p>
      {active && (
        <span className="absolute top-3 right-3 rounded-full bg-white/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          Actif
        </span>
      )}
    </button>
  );
}

// ─── Bouton Export dropdown ───────────────────────────────────────────────────
function ExportButton({ onPDF, onExcel }: { onPDF: () => void; onExcel: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <Icon d={icons.download} size={15} />
        Exporter
        <Icon d={icons.chevDown} size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <button
            onClick={() => { onPDF(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-600"
          >
            <span className="text-base">📄</span> Export PDF
          </button>
          <button
            onClick={() => { onExcel(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-600 border-t border-slate-100"
          >
            <span className="text-base">📊</span> Export Excel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helper : parse date JJ/MM/AAAA → timestamp ─────────────────────────────
function parseDateStr(s: string): number {
  const p = s.split("/");
  if (p.length !== 3) return 0;
  return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
}

function inDateRange(dateStr: string, from: string, to: string): boolean {
  const d = parseDateStr(dateStr);
  const f = from ? parseDateStr(from) : 0;
  const t = to   ? parseDateStr(to)   : Infinity;
  return d >= f && d <= t;
}

// ─── Composant sélecteur d'intervalle de dates réutilisable ──────────────────
function DateRangeFilter({
  from, to, onFrom, onTo,
}: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Date début</label>
        <DatePicker value={from} onChange={onFrom} />
      </div>
      <div className="flex items-end pb-2 text-slate-400 text-sm font-medium">→</div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Date fin</label>
        <DatePicker value={to} onChange={onTo} />
      </div>
      {(from || to) && (
        <button onClick={() => { onFrom(""); onTo(""); }}
          className="mb-0.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 transition">
          Effacer
        </button>
      )}
    </div>
  );
}

// ─── Rapport : Prescriptions par médecin ─────────────────────────────────────
function PrescriptionsReport({
  allVisits, workers,
}: { allVisits: WorkerVisit[]; workers: Worker[] }) {
  const today = new Date();
  const defaultFrom = `01/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  const defaultTo   = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [drugFilter,  setDrugFilter]  = useState("");
  const [doctorFilter, setDoctorFilter] = useState("Tous");
  const { ref: printRef, exportPDF } = usePrintExport();

  const workerName      = (id: number) => workers.find((w) => w.id === id)?.name      ?? "—";
  const workerMatricule = (id: number) => workers.find((w) => w.id === id)?.matricule ?? "—";

  type PrescLine = {
    doctor: string; workerName: string; workerMatricule: string;
    molecule: string; quantity: string; posology: string;
    visitDate: string; visitType: string;
  };

  // Construire toutes les lignes (sans filtre date/drug pour compter les médecins dispo)
  const allLines: PrescLine[] = [];
  for (const visit of allVisits) {
    if (!visit.treatment || visit.treatment.length === 0) continue;
    for (const item of visit.treatment) {
      if (!item.molecule?.trim()) continue;
      allLines.push({
        doctor:          visit.doctor || "Non renseigné",
        workerName:      workerName(visit.workerId),
        workerMatricule: workerMatricule(visit.workerId),
        molecule:        item.molecule,
        quantity:        item.quantity  ?? "",
        posology:        item.posology  ?? "",
        visitDate:       visit.date,
        visitType:       visit.type,
      });
    }
  }

  // Appliquer les filtres
  const filtered = allLines.filter((l) => {
    const matchDate   = !dateFrom && !dateTo ? true : inDateRange(l.visitDate, dateFrom, dateTo);
    const matchDrug   = !drugFilter.trim() || l.molecule.toLowerCase().includes(drugFilter.toLowerCase());
    const matchDoctor = doctorFilter === "Tous" || l.doctor === doctorFilter;
    return matchDate && matchDrug && matchDoctor;
  });

  const doctors = ["Tous", ...Array.from(new Set(allLines.map((l) => l.doctor))).sort()];

  const byDoctor: Record<string, PrescLine[]> = {};
  for (const line of filtered) {
    if (!byDoctor[line.doctor]) byDoctor[line.doctor] = [];
    byDoctor[line.doctor].push(line);
  }

  const totalPrescriptions = filtered.length;
  const totalDoctors       = Object.keys(byDoctor).length;
  const totalWorkers       = new Set(filtered.map((l) => l.workerMatricule)).size;
  const topMolecule = (() => {
    const counts: Record<string, number> = {};
    filtered.forEach((l) => { counts[l.molecule] = (counts[l.molecule] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  })();

  const periodLabel = dateFrom || dateTo
    ? `${dateFrom || "…"} → ${dateTo || "…"}`
    : "Toute la période";

  const handleExcel = () => {
    const header = ["Médecin prescripteur", "Travailleur", "Matricule", "Médicament", "Quantité", "Posologie", "Date visite", "Type visite"];
    const rows   = filtered.map((l) => [l.doctor, l.workerName, l.workerMatricule, l.molecule, l.quantity, l.posology, l.visitDate, l.visitType]);
    exportToExcel([header, ...rows], `prescriptions_${(dateFrom || "debut").replace(/\//g, "-")}_${(dateTo || "fin").replace(/\//g, "-")}`);
  };

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Médicament</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon d={icons.search} size={14} />
            </span>
            <input type="text" value={drugFilter} onChange={(e) => setDrugFilter(e.target.value)}
              placeholder="Rechercher un médicament…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-medwork-cyan focus:ring-2 focus:ring-medwork-cyan/20" />
          </div>
        </div>
        <div className="min-w-[180px]">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Médecin</label>
          <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-medwork-cyan focus:ring-2 focus:ring-medwork-cyan/20">
            {doctors.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="ml-auto">
          <ExportButton
            onPDF={() => exportPDF(`Rapport — Prescriptions — ${periodLabel}`)}
            onExcel={handleExcel}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Prescriptions",           value: totalPrescriptions, color: "text-medwork-cyan",  icon: "💊" },
          { label: "Médecins prescripteurs",  value: totalDoctors,       color: "text-medwork-navy",  icon: "👨‍⚕️" },
          { label: "Travailleurs concernés",  value: totalWorkers,       color: "text-purple-600",    icon: "👷" },
          { label: "Médicament le + prescrit",value: topMolecule,        color: "text-orange-600",    icon: "🏆" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-xl mb-1">{icon}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div ref={printRef}>
        {allLines.length === 0 ? (
          <div className="rounded-2xl bg-white p-16 text-center border border-slate-100 shadow-sm">
            <p className="text-4xl mb-3">💊</p>
            <p className="font-semibold text-slate-600">Aucune prescription dans le système</p>
            <p className="mt-1 text-sm text-slate-400">Les prescriptions apparaissent dès qu'elles sont ajoutées dans une visite médicale.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-16 text-center border border-slate-100 shadow-sm">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-slate-600">Aucun résultat</p>
            <p className="mt-1 text-sm text-slate-400">
              Aucune prescription pour {periodLabel}
              {drugFilter ? ` contenant "${drugFilter}"` : ""}
              {doctorFilter !== "Tous" ? ` par ${doctorFilter}` : ""}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              <span className="font-bold text-medwork-navy">{filtered.length}</span> prescription{filtered.length > 1 ? "s" : ""} · {periodLabel}
              {drugFilter ? ` · filtre : "${drugFilter}"` : ""}
            </p>
            {Object.entries(byDoctor).map(([doctor, prescriptions]) => (
              <div key={doctor} className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
                <div className="flex items-center gap-4 border-b border-slate-100 bg-medwork-navy/5 px-6 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-medwork-navy text-xs font-bold text-white">
                    {doctor.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-medwork-navy">{doctor}</p>
                    <p className="text-xs text-slate-400">{prescriptions.length} prescription{prescriptions.length > 1 ? "s" : ""} · {new Set(prescriptions.map((p) => p.workerMatricule)).size} travailleur{new Set(prescriptions.map((p) => p.workerMatricule)).size > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      {["Travailleur", "Matricule", "Médecin prescripteur", "Médicament", "Qté", "Posologie", "Date", "Type de visite"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {prescriptions.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.workerName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.workerMatricule}</td>
                        <td className="px-4 py-3 text-sm text-medwork-navy font-medium">{p.doctor}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-medwork-cyan ring-1 ring-cyan-200">
                            💊 {p.molecule}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.quantity || "—"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{p.posology || "—"}</td>
                        <td className="px-4 py-3 text-slate-500 font-medium">{p.visitDate}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">{p.visitType}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rapport : Suivi des aptitudes ───────────────────────────────────────────
function AptitudesReport({ allVisits, workers, decisions }: { allVisits: WorkerVisit[]; workers: Worker[]; decisions: Decision[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [aptFilter, setAptFilter] = useState("Tous");
  const { ref: printRef, exportPDF } = usePrintExport();

  const workerName      = (id: number) => workers.find((w) => w.id === id)?.name      ?? "—";
  const workerMatricule = (id: number) => workers.find((w) => w.id === id)?.matricule ?? "—";
  const workerDept      = (id: number) => workers.find((w) => w.id === id)?.department ?? "—";
  const workerPos       = (id: number) => workers.find((w) => w.id === id)?.position  ?? "—";

  // Pour chaque travailleur, prendre sa DERNIÈRE visite dans la période
  type AptRow = {
    workerId: number; workerName: string; matricule: string;
    department: string; position: string;
    aptitude: string; doctor: string; date: string; nextVisit: string;
    expired: boolean;
  };

  const today = new Date();

  const latestByWorker: Record<number, WorkerVisit> = {};
  for (const v of allVisits) {
    if (dateFrom || dateTo) {
      if (!inDateRange(v.date, dateFrom, dateTo)) continue;
    }
    if (!latestByWorker[v.workerId] || v.id > latestByWorker[v.workerId].id) {
      latestByWorker[v.workerId] = v;
    }
  }

  const rows: AptRow[] = Object.values(latestByWorker).map((v) => {
    // Calcul expiration : parse nextVisit "MM/YYYY" ou "Mois YYYY"
    let expired = false;
    if (v.nextVisit) {
      const parts = v.nextVisit.split("/");
      if (parts.length === 2) {
        const [m, y] = parts.map(Number);
        const nextDate = new Date(y, m - 1, 1);
        expired = nextDate < today;
      } else {
        // Essai "Mois YYYY"
        const monthIdx = MONTHS.findIndex((mo) => v.nextVisit.toLowerCase().includes(mo.toLowerCase()));
        const yearMatch = v.nextVisit.match(/\d{4}/);
        if (monthIdx >= 0 && yearMatch) {
          const nextDate = new Date(Number(yearMatch[0]), monthIdx, 1);
          expired = nextDate < today;
        }
      }
    }
    return {
      workerId: v.workerId,
      workerName: workerName(v.workerId),
      matricule: workerMatricule(v.workerId),
      department: workerDept(v.workerId),
      position: workerPos(v.workerId),
      aptitude: v.aptitude || "—",
      doctor: v.doctor || "—",
      date: v.date,
      nextVisit: v.nextVisit || "—",
      expired,
    };
  });

  // Liste des aptitudes depuis les décisions du système (+ "Tous")
  const aptitudes = ["Tous", ...decisions.map((d) => d.label)];
  // Fallback si aucune décision configurée : extraire depuis les données de visites
  const aptitudeOptions = decisions.length > 0
    ? aptitudes
    : ["Tous", ...Array.from(new Set(rows.map((r) => r.aptitude))).filter((a) => a !== "—").sort()];
  const filtered = rows.filter((r) => aptFilter === "Tous" || r.aptitude === aptFilter);
  const expired = filtered.filter((r) => r.expired);

  const aptStats: Record<string, number> = {};
  filtered.forEach((r) => { aptStats[r.aptitude] = (aptStats[r.aptitude] || 0) + 1; });

  // Couleurs des badges d'aptitude depuis les décisions du système
  const aptBadge = (label: string) => {
    const dec = decisions.find((d) => d.label === label);
    if (!dec) return "bg-slate-100 text-slate-600 ring-slate-200";
    switch (dec.color) {
      case "green":  return "bg-green-50 text-green-700 ring-green-200";
      case "orange": return "bg-orange-50 text-orange-700 ring-orange-200";
      case "red":    return "bg-red-50 text-red-700 ring-red-200";
      case "blue":   return "bg-sky-50 text-sky-700 ring-sky-200";
      default:       return "bg-slate-100 text-slate-600 ring-slate-200";
    }
  };

  const handleExcel = () => {
    const header = ["Travailleur", "Matricule", "Département", "Poste", "Aptitude", "Médecin", "Date visite", "Prochaine visite", "Expirée"];
    const exRows = filtered.map((r) => [r.workerName, r.matricule, r.department, r.position, r.aptitude, r.doctor, r.date, r.nextVisit, r.expired ? "Oui" : "Non"]);
    const suffix = (dateFrom || dateTo) ? `${(dateFrom || "debut").replace(/\//g, "-")}_${(dateTo || "fin").replace(/\//g, "-")}` : "toute_periode";
    exportToExcel([header, ...exRows], `aptitudes_${suffix}`);
  };

  const periodLabel = dateFrom || dateTo ? `${dateFrom || "…"} → ${dateTo || "…"}` : "Toute la période";

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <div className="min-w-[200px]">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Aptitude</label>
          <select value={aptFilter} onChange={(e) => setAptFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-medwork-cyan focus:ring-2 focus:ring-medwork-cyan/20">
            {aptitudeOptions.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="ml-auto">
          <ExportButton onPDF={() => exportPDF(`Rapport — Aptitudes — ${periodLabel}`)} onExcel={handleExcel} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <p className="text-xl mb-1">👷</p>
          <p className="text-xl font-bold text-medwork-navy">{filtered.length}</p>
          <p className="text-xs text-slate-400">Travailleurs suivis</p>
        </div>
        <div className="rounded-2xl bg-green-50 p-4 shadow-sm border border-green-100">
          <p className="text-xl mb-1">✅</p>
          <p className="text-xl font-bold text-green-700">{aptStats["Apte"] ?? 0}</p>
          <p className="text-xs text-green-600">Aptes sans restriction</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4 shadow-sm border border-orange-100">
          <p className="text-xl mb-1">⚠️</p>
          <p className="text-xl font-bold text-orange-700">{(aptStats["Apte avec restriction"] ?? 0) + (aptStats["A surveiller"] ?? 0)}</p>
          <p className="text-xs text-orange-600">Avec restriction / À surveiller</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-4 shadow-sm border border-red-100">
          <p className="text-xl mb-1">🔴</p>
          <p className="text-xl font-bold text-red-600">{expired.length}</p>
          <p className="text-xs text-red-500">Aptitudes expirées</p>
        </div>
      </div>

      {/* Tableau */}
      <div ref={printRef}>
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-16 text-center border border-slate-100 shadow-sm">
            <p className="text-4xl mb-3">✅</p>
            <p className="font-semibold text-slate-600">Aucune donnée pour {periodLabel}</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
            {expired.length > 0 && (
              <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-6 py-3">
                <span className="text-red-500">⚠️</span>
                <p className="text-sm font-semibold text-red-700">{expired.length} aptitude{expired.length > 1 ? "s" : ""} expirée{expired.length > 1 ? "s" : ""} — convocation requise</p>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {["Travailleur", "Matricule", "Département", "Poste", "Aptitude", "Médecin", "Date visite", "Prochaine visite"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.sort((a, b) => Number(b.expired) - Number(a.expired)).map((r, i) => (
                  <tr key={i} className={`transition hover:bg-slate-50/60 ${r.expired ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.workerName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.matricule}</td>
                    <td className="px-4 py-3 text-slate-600">{r.department}</td>
                    <td className="px-4 py-3 text-slate-600">{r.position}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${aptBadge(r.aptitude)}`}>
                        {r.aptitude}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.doctor}</td>
                    <td className="px-4 py-3 text-slate-500">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${r.expired ? "bg-red-100 text-red-700 ring-1 ring-red-300" : "bg-slate-100 text-slate-600"}`}>
                        {r.expired && "⚠️ "}{r.nextVisit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rapport : Activité médicale ─────────────────────────────────────────────
function ActivityReport({ allVisits, workers }: { allVisits: WorkerVisit[]; workers: Worker[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [groupBy, setGroupBy] = useState<"month" | "type" | "doctor">("month");
  const { ref: printRef, exportPDF } = usePrintExport();

  const visitsOfYear = allVisits.filter((v) =>
    !dateFrom && !dateTo ? true : inDateRange(v.date, dateFrom, dateTo)
  );

  // Groupe par mois
  const byMonth: Record<number, WorkerVisit[]> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = [];
  visitsOfYear.forEach((v) => {
    const p = parseMonthYear(v.date);
    if (p) byMonth[p.month].push(v);
  });

  // Groupe par type
  const byType: Record<string, WorkerVisit[]> = {};
  visitsOfYear.forEach((v) => {
    if (!byType[v.type]) byType[v.type] = [];
    byType[v.type].push(v);
  });

  // Groupe par médecin
  const byDoctor: Record<string, WorkerVisit[]> = {};
  visitsOfYear.forEach((v) => {
    const d = v.doctor || "Non renseigné";
    if (!byDoctor[d]) byDoctor[d] = [];
    byDoctor[d].push(v);
  });

  const maxVal = groupBy === "month"
    ? Math.max(...Object.values(byMonth).map((v) => v.length), 1)
    : groupBy === "type"
    ? Math.max(...Object.values(byType).map((v) => v.length), 1)
    : Math.max(...Object.values(byDoctor).map((v) => v.length), 1);

  const actPeriod = (dateFrom || dateTo)
    ? `${(dateFrom || "debut").replace(/\//g, "-")}_${(dateTo || "fin").replace(/\//g, "-")}`
    : "toute_periode";

  const handleExcel = () => {
    if (groupBy === "month") {
      const header = ["Mois", "Nombre de visites", "Travailleurs distincts"];
      const rows = Object.entries(byMonth).map(([m, vs]) => [
        MONTHS[Number(m) - 1], String(vs.length), String(new Set(vs.map((v) => v.workerId)).size),
      ]);
      exportToExcel([header, ...rows], `activite_mensuelle_${actPeriod}`);
    } else if (groupBy === "type") {
      const header = ["Type de visite", "Nombre", "% du total"];
      const total = visitsOfYear.length;
      const rows = Object.entries(byType).sort((a, b) => b[1].length - a[1].length).map(([t, vs]) => [
        t, String(vs.length), total > 0 ? `${Math.round(vs.length / total * 100)}%` : "0%",
      ]);
      exportToExcel([header, ...rows], `activite_par_type_${actPeriod}`);
    } else {
      const header = ["Médecin", "Nombre de visites", "Travailleurs distincts"];
      const rows = Object.entries(byDoctor).sort((a, b) => b[1].length - a[1].length).map(([d, vs]) => [
        d, String(vs.length), String(new Set(vs.map((v) => v.workerId)).size),
      ]);
      exportToExcel([header, ...rows], `activite_par_medecin_${actPeriod}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filtres */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Grouper par</label>
          <div className="flex gap-1.5">
            {([["month", "Mois"], ["type", "Type de visite"], ["doctor", "Médecin"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setGroupBy(key)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition border ${groupBy === key ? "bg-medwork-cyan text-white border-medwork-cyan" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto">
          <ExportButton onPDF={() => exportPDF(`Rapport — Activité médicale — ${dateFrom || "…"} → ${dateTo || "…"}`)} onExcel={handleExcel} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total visites", value: visitsOfYear.length, icon: "📋", col: "text-medwork-navy" },
          { label: "Travailleurs vus", value: new Set(visitsOfYear.map((v) => v.workerId)).size, icon: "👷", col: "text-purple-600" },
          { label: "Types de visite", value: Object.keys(byType).length, icon: "🗂️", col: "text-medwork-cyan" },
          { label: "Médecins actifs", value: Object.keys(byDoctor).length, icon: "👨‍⚕️", col: "text-orange-600" },
        ].map(({ label, value, icon, col }) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <p className="text-xl mb-1">{icon}</p>
            <p className={`text-xl font-bold ${col}`}>{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Graphique en barres */}
      <div ref={printRef} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        {visitsOfYear.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-slate-600">Aucune visite enregistrée pour cette période</p>
          </div>
        ) : (
          <>
            {/* Barres */}
            {groupBy === "month" && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Visites par mois</p>
                {Object.entries(byMonth).map(([m, vs]) => (
                  <div key={m} className="flex items-center gap-3">
                    <span className="w-24 text-right text-xs font-medium text-slate-500 shrink-0">{MONTHS[Number(m) - 1]}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-medwork-cyan rounded-full flex items-center justify-end pr-3 transition-all"
                        style={{ width: maxVal > 0 ? `${Math.max(vs.length / maxVal * 100, vs.length > 0 ? 4 : 0)}%` : "0%" }}
                      >
                        {vs.length > 0 && <span className="text-[10px] font-bold text-white">{vs.length}</span>}
                      </div>
                    </div>
                    <span className="w-8 text-xs text-slate-400">{vs.length}</span>
                  </div>
                ))}
              </div>
            )}

            {groupBy === "type" && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Visites par type</p>
                {Object.entries(byType).sort((a, b) => b[1].length - a[1].length).map(([type, vs]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-48 text-right text-xs font-medium text-slate-500 shrink-0 truncate">{type}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full flex items-center justify-end pr-3 transition-all"
                        style={{ width: `${Math.max(vs.length / maxVal * 100, 4)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{vs.length}</span>
                      </div>
                    </div>
                    <span className="w-16 text-xs text-slate-400">{vs.length} ({Math.round(vs.length / visitsOfYear.length * 100)}%)</span>
                  </div>
                ))}
              </div>
            )}

            {groupBy === "doctor" && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Visites par médecin</p>
                {Object.entries(byDoctor).sort((a, b) => b[1].length - a[1].length).map(([doc, vs]) => (
                  <div key={doc} className="flex items-center gap-3">
                    <span className="w-40 text-right text-xs font-medium text-slate-500 shrink-0 truncate">{doc}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full flex items-center justify-end pr-3 transition-all"
                        style={{ width: `${Math.max(vs.length / maxVal * 100, 4)}%` }}
                      >
                        <span className="text-[10px] font-bold text-white">{vs.length}</span>
                      </div>
                    </div>
                    <span className="w-16 text-xs text-slate-400">{vs.length} visite{vs.length > 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Rapport : Suivi des travailleurs ─────────────────────────────────────────
function WorkersReport({ workers, allVisits, decisions }: { workers: Worker[]; allVisits: WorkerVisit[]; decisions: Decision[] }) {
  const [view, setView] = useState<"all" | "embauche" | "fin_contrat" | "expired" | "no_visit">("all");
  const { ref: printRef, exportPDF } = usePrintExport();

  const today = new Date();

  // Calcul de l'expiration de la prochaine visite
  const isExpired = (nextVisit: string): boolean => {
    if (!nextVisit || nextVisit === "—" || nextVisit === "Non définie") return false;
    const parts = nextVisit.split("/");
    if (parts.length === 2) {
      const [m, y] = parts.map(Number);
      return new Date(y, m - 1, 1) < today;
    }
    const monthIdx = MONTHS.findIndex((mo) => nextVisit.toLowerCase().includes(mo.toLowerCase()));
    const yearMatch = nextVisit.match(/\d{4}/);
    if (monthIdx >= 0 && yearMatch) {
      return new Date(Number(yearMatch[0]), monthIdx, 1) < today;
    }
    return false;
  };

  // Dernière visite par travailleur
  const lastVisitMap: Record<number, WorkerVisit> = {};
  for (const v of allVisits) {
    if (!lastVisitMap[v.workerId] || v.id > lastVisitMap[v.workerId].id) {
      lastVisitMap[v.workerId] = v;
    }
  }

  type WorkerRow = {
    worker: Worker;
    lastVisit: WorkerVisit | null;
    nextVisitExpired: boolean;
    hasNoVisit: boolean;
  };

  const rows: WorkerRow[] = workers.map((w) => {
    const lv = lastVisitMap[w.id] ?? null;
    const nextVisitExpired = lv ? isExpired(lv.nextVisit) : false;
    return { worker: w, lastVisit: lv, nextVisitExpired, hasNoVisit: !lv };
  });

  const views = [
    { id: "all" as const, label: "Tous", count: rows.length, color: "bg-medwork-navy text-white" },
    { id: "embauche" as const, label: "En cours d'embauche", count: rows.filter((r) => r.worker.contractStatus === "embauche").length, color: "bg-blue-100 text-blue-700" },
    { id: "fin_contrat" as const, label: "Fin de contrat", count: rows.filter((r) => r.worker.contractStatus === "fin_contrat").length, color: "bg-slate-200 text-slate-600" },
    { id: "expired" as const, label: "Aptitude expirée", count: rows.filter((r) => r.nextVisitExpired).length, color: "bg-red-100 text-red-700" },
    { id: "no_visit" as const, label: "Sans visite", count: rows.filter((r) => r.hasNoVisit).length, color: "bg-orange-100 text-orange-700" },
  ];

  const filtered = rows.filter((r) => {
    if (view === "embauche")    return r.worker.contractStatus === "embauche";
    if (view === "fin_contrat") return r.worker.contractStatus === "fin_contrat";
    if (view === "expired")     return r.nextVisitExpired;
    if (view === "no_visit")    return r.hasNoVisit;
    return true;
  });

  const handleExcel = () => {
    const header = ["Nom", "Matricule", "Entreprise", "Département", "Poste", "Statut médical", "Statut contrat", "Dernière visite", "Aptitude", "Prochaine visite", "Expirée"];
    const exRows = filtered.map(({ worker: w, lastVisit: lv, nextVisitExpired }) => [
      w.name, w.matricule, w.company, w.department, w.position,
      w.status, w.contractStatus ?? "actif",
      lv?.date ?? "—", lv?.aptitude ?? "—", lv?.nextVisit ?? "—",
      nextVisitExpired ? "Oui" : "Non",
    ]);
    exportToExcel([header, ...exRows], `suivi_travailleurs`);
  };

  const aptBadgeClass = (label: string) => {
    const dec = decisions.find((d) => d.label === label);
    if (!dec) return "bg-slate-100 text-slate-600 ring-slate-200";
    switch (dec.color) {
      case "green":  return "bg-green-50 text-green-700 ring-green-200";
      case "orange": return "bg-orange-50 text-orange-700 ring-orange-200";
      case "red":    return "bg-red-50 text-red-700 ring-red-200";
      case "blue":   return "bg-sky-50 text-sky-700 ring-sky-200";
      default:       return "bg-slate-100 text-slate-600 ring-slate-200";
    }
  };

  return (
    <div className="space-y-5">
      {/* Filtres onglets */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {views.map(({ id, label, count, color }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition
                ${view === id ? `${color} border-transparent shadow-sm` : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${view === id ? "bg-white/30" : "bg-slate-200 text-slate-600"}`}>{count}</span>
            </button>
          ))}
        </div>
        <ExportButton onPDF={() => exportPDF(`Rapport — Suivi des travailleurs`)} onExcel={handleExcel} />
      </div>

      {/* Tableau */}
      <div ref={printRef}>
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-16 text-center border border-slate-100 shadow-sm">
            <p className="text-4xl mb-3">👷</p>
            <p className="font-semibold text-slate-600">Aucun travailleur dans cette catégorie</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden border border-slate-100">
            <div className="border-b border-slate-100 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-400"><span className="font-bold text-medwork-navy">{filtered.length}</span> travailleur{filtered.length > 1 ? "s" : ""}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {["Travailleur", "Matricule", "Département", "Poste", "Statut contrat", "Aptitude", "Dernière visite", "Prochaine visite"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(({ worker: w, lastVisit: lv, nextVisitExpired }) => (
                  <tr key={w.id} className={`transition hover:bg-slate-50/60 ${nextVisitExpired ? "bg-red-50/20" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">{w.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{w.matricule}</td>
                    <td className="px-4 py-3 text-slate-600">{w.department}</td>
                    <td className="px-4 py-3 text-slate-600">{w.position}</td>
                    <td className="px-4 py-3">
                      {w.contractStatus === "embauche"
                        ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">En cours d'embauche</span>
                        : w.contractStatus === "fin_contrat"
                        ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-300">Fin de contrat</span>
                        : <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">Actif</span>}
                    </td>
                    <td className="px-4 py-3">
                      {lv
                        ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${aptBadgeClass(lv.aptitude)}`}>{lv.aptitude}</span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{lv?.date ?? <span className="text-orange-500 font-medium">Aucune visite</span>}</td>
                    <td className="px-4 py-3">
                      {lv?.nextVisit
                        ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${nextVisitExpired ? "bg-red-100 text-red-700 ring-1 ring-red-300" : "bg-slate-100 text-slate-600"}`}>
                            {nextVisitExpired && "⚠️ "}{lv.nextVisit}
                          </span>
                        : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Rapports disponibles ─────────────────────────────────────────────────────
const REPORT_CARDS = [
  {
    id: "prescriptions",
    icon: "💊",
    title: "Prescriptions médicales",
    description: "Analyse des prescriptions par médecin, médicament et travailleur sur une période donnée.",
    color: "bg-cyan-50 text-medwork-cyan border-medwork-cyan",
  },
  {
    id: "aptitudes",
    icon: "✅",
    title: "Suivi des aptitudes",
    description: "Bilan des décisions d'aptitude, aptitudes expirées et travailleurs à convoquer.",
    color: "bg-green-50 text-green-700 border-green-400",
  },
  {
    id: "activity",
    icon: "📋",
    title: "Activité médicale",
    description: "Nombre de visites par période, type et médecin. Statistiques globales d'activité.",
    color: "bg-purple-50 text-purple-700 border-purple-400",
  },
  {
    id: "workers",
    icon: "👷",
    title: "Suivi des travailleurs",
    description: "Liste des travailleurs par statut : embauche, fin de contrat, actifs, visites en retard.",
    color: "bg-orange-50 text-orange-700 border-orange-400",
  },
] as const;

type ReportId = (typeof REPORT_CARDS)[number]["id"];

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ReportsPage({
  allVisits, workers, decisions, currentPage, onNavigate, onLogout,
  userName, userRole, userPhoto, isSuperAdmin,
  permissions = [],
  searchData,
  onOpenWorker,
  onOpenVisit,
}: Props) {
  const [activeReport, setActiveReport] = useState<ReportId>("prescriptions");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout}
        userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Rapports" onNavigate={onNavigate} searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin} onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Grille de cartes */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {REPORT_CARDS.map((card) => (
              <ReportCard
                key={card.id}
                icon={card.icon}
                title={card.title}
                description={card.description}
                color={card.color}
                onClick={() => setActiveReport(card.id)}
                active={activeReport === card.id}
              />
            ))}
          </div>

          {/* Titre du rapport actif */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">{REPORT_CARDS.find((c) => c.id === activeReport)?.icon}</span>
            <div>
              <h2 className="text-base font-bold text-medwork-navy">
                {REPORT_CARDS.find((c) => c.id === activeReport)?.title}
              </h2>
              <p className="text-xs text-slate-400">
                {REPORT_CARDS.find((c) => c.id === activeReport)?.description}
              </p>
            </div>
          </div>

          {/* Contenu du rapport actif */}
          {activeReport === "prescriptions" && (
            <PrescriptionsReport allVisits={allVisits} workers={workers} />
          )}
          {activeReport === "aptitudes" && (
            <AptitudesReport allVisits={allVisits} workers={workers} decisions={decisions} />
          )}
          {activeReport === "activity" && (
            <ActivityReport allVisits={allVisits} workers={workers} />
          )}
          {activeReport === "workers" && (
            <WorkersReport workers={workers} allVisits={allVisits} decisions={decisions} />
          )}
        </main>
      </div>
    </div>
  );
}
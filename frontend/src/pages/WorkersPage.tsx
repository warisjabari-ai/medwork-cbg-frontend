import { useMemo, useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";

// ─── Export helpers ───────────────────────────────────────────────────────────
function exportCSV(rows: string[][], filename: string) {
  const bom = "\uFEFF";
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bom + csv], { type: "text/csv;charset=utf-8;" }));
  a.download = filename + ".csv"; a.click();
}

function ExportDropdown({ onPDF, onExcel }: { onPDF: () => void; onExcel: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
        <Icon d={icons.download} size={14} />Exporter<Icon d={icons.chevDown} size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <button onClick={() => { onPDF(); setOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 transition">📄 Export PDF</button>
          <button onClick={() => { onExcel(); setOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-green-50 hover:text-green-600 border-t border-slate-100 transition">📊 Export Excel</button>
        </div>
      )}
    </div>
  );
}

export type Worker = {
  id: number;
  name: string;
  matricule: string;
  department: string;
  position: string;
  company: string;
  status: string;
  lastVisit: string;
  residence: string;
  contractStatus?: "actif" | "embauche" | "fin_contrat"; // statut contractuel
};

type Props = {
  workers: Worker[];
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onSelect: (worker: Worker) => void;
  onCreate: () => void;
  onEdit: (worker: Worker) => void;
  onDelete: (id: number) => void;
  onSetContractStatus: (id: number, status: Worker["contractStatus"]) => void;
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

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

function getStatusStyle(status: string) {
  const s = normalizeText(status);
  if (s === "apte") return { dot: "bg-green-500", badge: "bg-green-50 text-green-700 ring-green-200" };
  if (s.includes("restriction")) return { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 ring-orange-200" };
  return { dot: "bg-red-500", badge: "bg-red-50 text-red-700 ring-red-200" };
}

function getContractBadge(cs?: Worker["contractStatus"]) {
  if (cs === "embauche") return { label: "En cours d'embauche", cls: "bg-blue-50 text-blue-700 ring-blue-200" };
  if (cs === "fin_contrat") return { label: "Fin de contrat", cls: "bg-slate-100 text-slate-500 ring-slate-300" };
  return null;
}

export default function WorkersPage({
  workers,
  currentPage,
  onNavigate,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onSetContractStatus,
  onLogout,
  userName,
  userRole,
  userPhoto,
  isSuperAdmin,
  permissions = [],
  searchData,
  onOpenWorker,
  onOpenVisit,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous");

  // Helpers de permission
    const can = (perm: string): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const parts = perm.split(".");
    for (let i = 1; i < parts.length; i++) {
      if (permissions.includes(parts.slice(0, i).join("."))) return true;
    }
    return false;
  };

  const filteredWorkers = useMemo(() => {
    const q = normalizeText(search);
    return workers.filter((w) => {
      const matchesSearch =
        !q ||
        normalizeText(w.name).includes(q) ||
        normalizeText(w.matricule).includes(q) ||
        normalizeText(w.department).includes(q);
      const matchesStatus =
        statusFilter === "Tous" ||
        (statusFilter === "embauche" ? w.contractStatus === "embauche" :
         statusFilter === "fin_contrat" ? w.contractStatus === "fin_contrat" :
         normalizeText(w.status) === normalizeText(statusFilter));
      return matchesSearch && matchesStatus;
    });
  }, [workers, search, statusFilter]);

  const handleExcelExport = () => {
    const header = ["Nom", "Matricule", "Entreprise", "Département", "Poste", "Statut médical", "Statut contrat", "Dernière visite"];
    const rows = filteredWorkers.map((w) => [
      w.name, w.matricule, w.company ?? "—", w.department ?? "—", w.position ?? "—",
      w.status, w.contractStatus === "embauche" ? "En cours d'embauche" : w.contractStatus === "fin_contrat" ? "Fin de contrat" : "En activité",
      w.lastVisit ?? "—",
    ]);
    exportCSV([header, ...rows], `travailleurs_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}`);
  };

  const handlePDFExport = () => {
    const rows = filteredWorkers.map((w) => `
      <tr>
        <td>${w.name}</td>
        <td>${w.matricule}</td>
        <td>${w.company ?? "—"}</td>
        <td>${w.department ?? "—"}</td>
        <td>${w.position ?? "—"}</td>
        <td>${w.status}</td>
        <td>${w.contractStatus === "embauche" ? "En cours d'embauche" : w.contractStatus === "fin_contrat" ? "Fin de contrat" : "En activité"}</td>
        <td>${w.lastVisit ?? "—"}</td>
      </tr>`).join("");

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
      <h1>Liste des travailleurs</h1>
      <p>Exporté le ${new Date().toLocaleDateString("fr-FR")} · ${filteredWorkers.length} travailleur(s)</p>
      <table>
        <thead><tr>
          <th>Nom</th><th>Matricule</th><th>Entreprise</th><th>Département</th>
          <th>Poste</th><th>Statut médical</th><th>Contrat</th><th>Dernière visite</th>
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Travailleurs" onNavigate={onNavigate} searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin} onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">

            {/* Barre d'outils */}
            <div className="flex flex-wrap items-end gap-4 border-b border-slate-100 px-6 py-4">
              {/* Recherche */}
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Recherche
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon d={icons.search} size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Nom, matricule ou département"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20"
                  />
                </div>
              </div>

              {/* Filtre statut */}
              <div className="min-w-[160px]">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-4 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white"
                >
                  <option value="Tous">Tous les statuts</option>
                  <option value="Apte">Apte</option>
                  <option value="Apte avec restriction">Apte avec restriction</option>
                  <option value="A surveiller">A surveiller</option>
                  <option value="Inapte">Inapte</option>
                  <option value="embauche">En cours d'embauche</option>
                  <option value="fin_contrat">Fin de contrat</option>
                  <option value="Apte">Apte</option>
                  <option value="Restriction">Restriction</option>
                  <option value="A surveiller">À surveiller</option>
                </select>
              </div>

              {/* Compteur + boutons */}
              <div className="ml-auto flex items-center gap-3 self-end">
                <span className="text-sm text-slate-400">
                  <span className="font-bold text-medwork-navy">{filteredWorkers.length}</span>{" "}
                  travailleur{filteredWorkers.length > 1 ? "s" : ""}
                </span>
                <ExportDropdown onPDF={handlePDFExport} onExcel={handleExcelExport} />
                {can("workers.create") && (
                  <button
                    onClick={onCreate}
                    className="rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    + Nouveau travailleur
                  </button>
                )}
              </div>
            </div>

            {/* Tableau */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    {["Nom complet", "Matricule", "Entreprise", "Département", "Poste", "Statut médical", "Contrat", "Dernière visite", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.length > 0 ? (
                    filteredWorkers.map((worker) => {
                      const { dot, badge } = getStatusStyle(worker.status);
                      const contractBadge = getContractBadge(worker.contractStatus);
                      const isFinContrat = worker.contractStatus === "fin_contrat";
                      return (
                        <tr key={worker.id} className={`text-sm transition hover:bg-slate-50/80 ${isFinContrat ? "opacity-60" : ""}`}>
                          <td className="cursor-pointer px-5 py-3.5 font-semibold text-medwork-navy hover:underline" onClick={() => onSelect(worker)}>
                            <div className="flex flex-wrap items-center gap-2">
                              {worker.name}
                              {contractBadge && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${contractBadge.cls}`}>
                                  {contractBadge.label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{worker.matricule}</td>
                          <td className="px-5 py-3.5 text-slate-600">{worker.company}</td>
                          <td className="px-5 py-3.5 text-slate-600">{worker.department}</td>
                          <td className="px-5 py-3.5 text-slate-600">{worker.position}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                              {worker.status}
                            </span>
                          </td>
                          {/* Statut du contrat */}
                          <td className="px-5 py-3.5">
                            {worker.contractStatus === "embauche" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                En cours d'embauche
                              </span>
                            ) : worker.contractStatus === "fin_contrat" ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Fin de contrat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                En activité
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500">{worker.lastVisit}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {can("workers.edit") && (
                                <button onClick={() => onEdit(worker)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-medwork-cyan hover:text-medwork-cyan">
                                  ✏️
                                </button>
                              )}
                              {/* Statut contractuel — nécessite workers.edit */}
                              {can("workers.edit") && (
                                worker.contractStatus === "embauche" ? (
                                  <button
                                    onClick={() => onSetContractStatus(worker.id, "actif")}
                                    title="Valider l'embauche → Actif"
                                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-500 hover:text-white hover:border-blue-500"
                                  >
                                    ✅ Valider
                                  </button>
                                ) : worker.contractStatus === "fin_contrat" ? (
                                  <button
                                    onClick={() => onSetContractStatus(worker.id, "actif")}
                                    title="Réactiver ce travailleur"
                                    className="rounded-lg border border-green-200 bg-white px-2.5 py-1.5 text-xs font-medium text-green-700 shadow-sm transition hover:bg-green-500 hover:text-white hover:border-green-500"
                                  >
                                    🔄 Réactiver
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { if (window.confirm(`Marquer ${worker.name} en fin de contrat ?`)) onSetContractStatus(worker.id, "fin_contrat"); }}
                                    title="Fin de contrat"
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 shadow-sm transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600"
                                  >
                                    🚪
                                  </button>
                                )
                              )}
                              {can("workers.delete") && (
                                <button
                                  onClick={() => { if (window.confirm(`Supprimer définitivement ${worker.name} ?`)) onDelete(worker.id); }}
                                  className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 shadow-sm transition hover:bg-red-500 hover:text-white hover:border-red-500"
                                >
                                  🗑️
                                </button>
                              )}
                              {!can("workers.edit") && !can("workers.delete") && (
                                <span className="text-[10px] text-slate-400 italic">Lecture seule</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <p className="text-3xl mb-2">🔍</p>
                        <p className="font-semibold text-slate-600">Aucun travailleur trouvé</p>
                        <p className="mt-1 text-sm text-slate-400">Essayez de modifier vos filtres.</p>
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
  );
}
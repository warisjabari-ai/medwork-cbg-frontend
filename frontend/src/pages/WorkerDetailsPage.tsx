import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";
import DatePicker from "../components/DatePicker";
import type {
  WorkerVisit, Visit, VisitFormData,
  TreatmentItem, ImagingExam, DiagnosisItem, ComplaintItem,
  TestVisuel, FunctionalEvaluation, ClinicalExam, PhysicalExam,
} from "../types/visit";
import { emptyForm, generateVisitRef } from "../types/visit";

// ─── Types locaux ─────────────────────────────────────────────────────────────
type ProfessionalEntry = {
  id: number; startDate: string; endDate?: string;
  position: string; department: string; company?: string;
  reason: "embauche" | "promotion" | "mutation" | "redéploiement_médical" | "redéploiement_professionnel" | "autre";
  notes?: string;
};
type Worker = {
  id: number; name: string; matricule: string; department: string; position: string;
  company: string; status: string; lastVisit: string; residence?: string;
  bloodGroup?: string; professionalHistory?: ProfessionalEntry[];
};
type PrintDocType = "compte-rendu" | "certificat" | "ordonnance";

type Props = {
  worker: Worker | null;
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  onUpdateStatus: (workerId: number, newStatus: string) => void;
  visits: WorkerVisit[];
  onAddVisit: (visit: WorkerVisit) => void;
  onEditVisit: (visit: WorkerVisit) => void;
  onCloseVisit: (visitId: number) => void;
  onDeleteVisit?: (visitId: number) => void;
  initialOpenForm?: boolean;
  initialEditVisitId?: number;
  // Ouvre cette visite en accordéon (lecture seule, sans mode édition)
  initialOpenVisitId?: number;
  visitTypeNames?: string[];
  visitTypes?: import("./VisitTypesPage").VisitType[];
  decisions?: import("./DecisionsPage").Decision[];
  examTypes?: import("./ExamTypesPage").ExamType[];
  currentUserRoleId?: number;
  allUsers?: import("./UserManagementPage").AppUser[];
};

// ─── Helper : sections que l'utilisateur peut modifier pour ce type de visite ─
// Retourne un Set des clés de section autorisées.
// Si pas de règle pour ce rôle → tout est autorisé.
function resolveAllowedSections(
  visitTypeName: string | undefined,
  roleId: number | undefined,
  visitTypes: import("./VisitTypesPage").VisitType[] | undefined,
  isSuperAdminUser = false
): Set<string> | "all" {
  if (isSuperAdminUser) return "all";
  if (!visitTypeName || !visitTypes) return "all";
  const vt = visitTypes.find((t) => t.name === visitTypeName);
  // Pas de editRules → tout le monde peut tout modifier
  if (!vt || !vt.editRules || Object.keys(vt.editRules).length === 0) return "all";
  if (!roleId) return "all";
  const key = String(roleId);
  // Rôle NON listé dans editRules → accès complet (restrictions s'appliquent uniquement aux rôles listés)
  if (!(key in vt.editRules)) return "all";
  return new Set(vt.editRules[key]);
}

// Convertit l'aptitude d'une visite en statut travailleur
function aptitudeToStatus(aptitude: string): string {
  const v = aptitude.trim().toLowerCase();
  if (v === "apte") return "Apte";
  if (v.includes("restriction")) return "Restriction";
  if (v.includes("surveiller") || v.includes("inapte")) return "A surveiller";
  return "Apte";
}

// Déduit le statut depuis la liste de visites (dernière ouverte, sinon la plus récente)
function deriveStatusFromVisits(visits: Visit[]): string | null {
  if (visits.length === 0) return null;
  const open = visits.filter((v) => !v.closed);
  return aptitudeToStatus((open.length > 0 ? open[0] : visits[0]).aptitude);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fv(v: string) { return v && v.trim() !== "" ? v : "Non renseigné"; }
function calculateBMI(weight: string, height: string) {
  const w = Number(weight.replace(",", ".")), h = Number(height.replace(",", "."));
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return "";
  return (w / (h * h)).toFixed(2);
}
function getStatusStyle(s: string) {
  const v = s.trim().toLowerCase();
  if (v.includes("apte") && !v.includes("restriction")) return { dot: "bg-green-500", badge: "bg-green-50 text-green-700 ring-green-200" };
  if (v.includes("restriction") || v.includes("surveiller")) return { dot: "bg-orange-500", badge: "bg-orange-50 text-orange-700 ring-orange-200" };
  return { dot: "bg-red-500", badge: "bg-red-50 text-red-700 ring-red-200" };
}
function getBadgeStyle(v: string) {
  const t = v.trim().toLowerCase();
  if (t.includes("normal") || t.includes("apte") || t.includes("ras") || t.includes("à jour")) return "bg-green-50 text-green-700 ring-1 ring-green-200";
  if (t.includes("modéré") || t.includes("restriction") || t.includes("familial") || t.includes("rappel") || t.includes("identifié")) return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  if (t.includes("alerte") || t.includes("inapte") || t.includes("expiré") || t.includes("suivi")) return "bg-red-50 text-red-700 ring-1 ring-red-200";
  return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
}
function aptitudeColors(aptitude: string) {
  const v = aptitude.toLowerCase();
  if (v.includes("restriction") || v.includes("surveiller")) return { bg: "#fff7ed", color: "#9a3412", border: "#fb923c" };
  if (v.includes("inapte")) return { bg: "#fef2f2", color: "#991b1b", border: "#f87171" };
  return { bg: "#f0fdf4", color: "#14532d", border: "#4ade80" };
}

// ─── Styles impression ────────────────────────────────────────────────────────
const pTbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", marginBottom: "14px", fontSize: "11px" };
const pTh: React.CSSProperties = { background: "#f1f5f9", padding: "6px 10px", textAlign: "left", fontWeight: 700, color: "#0f2d5a", border: "1px solid #e2e8f0" };
const pTd: React.CSSProperties = { padding: "6px 10px", border: "1px solid #e2e8f0", color: "#334155", verticalAlign: "top" };
const pTdL: React.CSSProperties = { ...pTd, fontWeight: 600, color: "#475569", width: "32%", background: "#f8fafc" };
function PSecHead({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "#0f2d5a", color: "#fff", padding: "5px 10px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "16px", marginBottom: "6px", borderRadius: "4px" }}>{children}</div>;
}
function PrintHeader({ worker, visit }: { worker: Worker; visit: Visit }) {
  return (
    <div style={{ borderBottom: "2px solid #0f2d5a", paddingBottom: "12px", marginBottom: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: "22px", fontWeight: 800, color: "#0f2d5a" }}>MédWork</div><div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Service de Santé au Travail — CBG</div></div>
        <div style={{ textAlign: "right", fontSize: "11px", color: "#64748b" }}>
          {visit.ref && <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#0f2d5a", marginBottom: "2px" }}>{visit.ref}</div>}
          <div>Date : {visit.date}</div>
          <div>Médecin : {visit.doctor}</div>
          <div>Matricule : {worker.matricule}</div>
        </div>
      </div>
    </div>
  );
}
function PrintTreatmentTable({ treatment }: { treatment: TreatmentItem[] }) {
  if (treatment.length === 0) return <table style={pTbl}><tbody><tr><td style={pTd} colSpan={3}>Aucun traitement prescrit</td></tr></tbody></table>;
  return (<table style={pTbl}><thead><tr><th style={pTh}>Molécule</th><th style={{ ...pTh, width: "18%" }}>Quantité</th><th style={pTh}>Posologie</th></tr></thead><tbody>{treatment.map((t, i) => <tr key={i}><td style={pTd}>{fv(t.molecule)}</td><td style={pTd}>{fv(t.quantity)}</td><td style={pTd}>{fv(t.posology)}</td></tr>)}</tbody></table>);
}
// ─── Bloc signature commun aux 3 documents ────────────────────────────────────
function SignatureBlock({ doctor, doctorSignature }: { doctor: string; doctorSignature?: string }) {
  return (
    <div style={{ marginTop: "32px", display: "flex", justifyContent: "flex-end" }}>
      <div style={{ textAlign: "center", minWidth: "200px" }}>
        <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>Signature et cachet du médecin</div>
        {doctorSignature
          ? <img src={doctorSignature} alt="Signature" style={{ height: "56px", maxWidth: "180px", objectFit: "contain", display: "block", margin: "0 auto 6px" }} />
          : <div style={{ height: "56px" }} />
        }
        <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "4px", fontSize: "11px", fontWeight: 600 }}>{doctor}</div>
      </div>
    </div>
  );
}

function CompteRenduDocument({ worker, visit, doctorName, doctorSignature }: { worker: Worker; visit: Visit; doctorName: string; doctorSignature?: string }) {
  const { bg, color } = aptitudeColors(visit.aptitude);
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", fontSize: "11px", color: "#1e293b", lineHeight: 1.5 }}>
      <PrintHeader worker={worker} visit={visit} />
      <div style={{ textAlign: "center", marginBottom: "18px" }}><div style={{ fontSize: "15px", fontWeight: 800, color: "#0f2d5a", textTransform: "uppercase" }}>Compte Rendu de Visite Médicale</div><div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>{visit.type}</div></div>
      <PSecHead>Identité du travailleur</PSecHead>
      <table style={pTbl}><tbody><tr><td style={pTdL}>Nom complet</td><td style={pTd}>{worker.name}</td><td style={pTdL}>Matricule</td><td style={pTd}>{worker.matricule}</td></tr><tr><td style={pTdL}>Entreprise</td><td style={pTd}>{worker.company}</td><td style={pTdL}>Poste</td><td style={pTd}>{worker.position}</td></tr><tr><td style={pTdL}>Département</td><td style={pTd}>{worker.department}</td><td style={pTdL}>Résidence</td><td style={pTd}>{worker.residence || "—"}</td></tr></tbody></table>
      {visit.complaints && visit.complaints.length > 0 && (<><PSecHead>Plaintes</PSecHead><table style={pTbl}><thead><tr><th style={pTh}>Plainte</th><th style={{...pTh, width:"28%"}}>Durée d'évolution</th></tr></thead><tbody>{visit.complaints.map((c, i) => <tr key={i}><td style={pTd}>{fv(c.label)}</td><td style={pTd}>{fv(c.duration)}</td></tr>)}</tbody></table></>)}
      <PSecHead>Examen clinique</PSecHead>
      <table style={pTbl}><tbody><tr><td style={pTdL}>Poids (kg)</td><td style={pTd}>{fv(visit.clinicalExam.weight)}</td><td style={pTdL}>Taille (m)</td><td style={pTd}>{fv(visit.clinicalExam.height)}</td></tr><tr><td style={pTdL}>IMC</td><td style={pTd}>{fv(visit.clinicalExam.bmi)}</td><td style={pTdL}>TA (mmHg)</td><td style={pTd}>{fv(visit.clinicalExam.bloodPressure)}</td></tr></tbody></table>
      <PSecHead>Traitement / Ordonnance</PSecHead>
      <PrintTreatmentTable treatment={visit.treatment} />
      <div style={{ marginTop: "20px", padding: "14px 18px", background: bg, border: `1.5px solid ${color}`, borderRadius: "8px" }}>
        <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color, letterSpacing: "0.08em", marginBottom: "4px" }}>Conclusion — Aptitude médicale</div>
        <div style={{ fontSize: "13px", fontWeight: 800, color }}>{visit.aptitude}</div>
        {visit.restrictions && visit.restrictions !== "Aucune" && <div style={{ marginTop: "4px", fontSize: "11px", color }}>Restrictions : {visit.restrictions}</div>}
      </div>
      <SignatureBlock doctor={doctorName} doctorSignature={doctorSignature} />
    </div>
  );
}

function CertificatDocument({ worker, visit, doctorName, doctorSignature }: { worker: Worker; visit: Visit; doctorName: string; doctorSignature?: string }) {
  const { bg, color, border } = aptitudeColors(visit.aptitude);
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", fontSize: "12px", color: "#1e293b", lineHeight: 1.6 }}>
      <PrintHeader worker={worker} visit={visit} />
      <div style={{ textAlign: "center", margin: "28px 0 32px" }}><div style={{ fontSize: "17px", fontWeight: 800, color: "#0f2d5a", textTransform: "uppercase" }}>Certificat Médical d'Aptitude</div><div style={{ width: "60px", height: "3px", background: "#06b6d4", margin: "8px auto 0" }} /></div>
      <div style={{ border: `2px solid ${border}`, borderRadius: "10px", background: bg, padding: "20px 24px", textAlign: "center" }}><div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color, marginBottom: "8px" }}>Décision médicale</div><div style={{ fontSize: "22px", fontWeight: 900, color }}>{visit.aptitude.toUpperCase()}</div></div>
      {visit.restrictions && visit.restrictions !== "Aucune" && (<div style={{ border: "1px solid #fed7aa", borderRadius: "8px", background: "#fff7ed", padding: "12px 16px", marginTop: "16px" }}><div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#9a3412", marginBottom: "4px" }}>Restrictions</div><div style={{ fontSize: "12px", color: "#7c2d12" }}>{visit.restrictions}</div></div>)}
      <SignatureBlock doctor={doctorName} doctorSignature={doctorSignature} />
    </div>
  );
}

function OrdonnanceDocument({ worker, visit, doctorName, doctorSignature }: { worker: Worker; visit: Visit; doctorName: string; doctorSignature?: string }) {
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", fontSize: "12px", color: "#1e293b", lineHeight: 1.6 }}>
      <PrintHeader worker={worker} visit={visit} />
      <div style={{ textAlign: "center", margin: "20px 0 28px" }}><div style={{ fontSize: "17px", fontWeight: 800, color: "#0f2d5a", textTransform: "uppercase" }}>Ordonnance Médicale</div><div style={{ width: "50px", height: "3px", background: "#06b6d4", margin: "8px auto 0" }} /></div>
      <PSecHead>Prescriptions médicamenteuses</PSecHead>
      <PrintTreatmentTable treatment={visit.treatment} />
      <SignatureBlock doctor={doctorName} doctorSignature={doctorSignature} />
    </div>
  );
}

// ─── Modal impression ─────────────────────────────────────────────────────────
// aptitudeDoctor = celui qui a pris la décision d'aptitude (certificat + compte rendu)
// doctor         = celui qui a réalisé la consultation / signé l'ordonnance
function PrintModal({ worker, visit, initialDoc, onClose, allUsers }: { worker: Worker; visit: Visit; initialDoc: PrintDocType; onClose: () => void; allUsers?: import("./UserManagementPage").AppUser[] }) {
  const [activeDoc, setActiveDoc] = useState<PrintDocType>(initialDoc);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>MédWork CBG — ${activeDoc}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; background: white; }
        @page { margin: 16mm 14mm; }
        img { max-width: 100%; }
        table { border-collapse: collapse; width: 100%; }
        td, th { padding: 4px 8px; }
      </style>
    </head><body>${content}</body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 600);
    }
  };

  const tabs: { id: PrintDocType; label: string }[] = [{ id: "compte-rendu", label: "📋 Compte rendu" }, { id: "certificat", label: "📄 Certificat d'aptitude" }, { id: "ordonnance", label: "💊 Ordonnance" }];

  // Médecin consultant / prescripteur (ordonnance)
  const consultingDoctor = visit.doctor;
  const consultingSignature = allUsers?.find((u) => u.name === consultingDoctor)?.signature;

  // Médecin décision d'aptitude (certificat + compte rendu) — fallback sur le médecin consultant
  const aptDoctor = visit.aptitudeDoctor?.trim() ? visit.aptitudeDoctor : consultingDoctor;
  const aptSignature = allUsers?.find((u) => u.name === aptDoctor)?.signature ?? consultingSignature;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="my-6 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-medwork-navy px-6 py-4"><div><h2 className="text-base font-bold text-white">Impression — {visit.type}</h2><p className="mt-0.5 text-sm text-white/60">{worker.name} · {visit.date}</p></div><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">✕</button></div>
          <div className="flex gap-2 border-b border-slate-200 bg-slate-50 px-6 pt-4 pb-0">{tabs.map((tab) => <button key={tab.id} onClick={() => setActiveDoc(tab.id)} className={`rounded-t-xl px-5 py-2.5 text-sm font-semibold transition-colors ${activeDoc === tab.id ? "bg-white text-medwork-navy shadow-sm border border-slate-200 -mb-px border-b-white" : "text-slate-500 hover:text-slate-700"}`}>{tab.label}</button>)}</div>
          <div className="bg-slate-100 px-6 py-6"><div ref={printRef} className="mx-auto rounded-xl border border-slate-200 bg-white p-10 shadow-sm" style={{ maxWidth: "740px" }}>
            {activeDoc === "compte-rendu" && <CompteRenduDocument worker={worker} visit={visit} doctorName={aptDoctor} doctorSignature={aptSignature} />}
            {activeDoc === "certificat" && <CertificatDocument worker={worker} visit={visit} doctorName={aptDoctor} doctorSignature={aptSignature} />}
            {activeDoc === "ordonnance" && <OrdonnanceDocument worker={worker} visit={visit} doctorName={consultingDoctor} doctorSignature={consultingSignature} />}
          </div></div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4"><p className="text-xs text-slate-400">L'aperçu correspond au document qui sera imprimé.</p><div className="flex gap-3"><button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">Annuler</button><button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-medwork-cyan px-5 py-2 text-sm font-semibold text-white hover:opacity-90">🖨️ Imprimer</button></div></div>
        </div>
      </div>
    </>
  );
}

// ─── Composants UI internes ───────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) { return <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h4>; }
function DetailGrid({ items }: { items: { label: string; value: string }[] }) {
  return (<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => (<div key={item.label} className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">{item.label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{fv(item.value)}</p></div>))}</div>);
}
function TextBlock({ title, value }: { title: string; value: string }) {
  return (<div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">{title}</p><p className="mt-1 whitespace-pre-line text-sm text-slate-700">{fv(value)}</p></div>);
}
function FunctionalGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>{children}</div>);
}
function OdOgRow({ label, od, og }: { label: string; od: string; og: string }) {
  return (<div className="rounded-xl bg-slate-50 p-3"><p className="mb-2 text-xs text-slate-400">{label}</p><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-400">OD</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{fv(od)}</p></div><div><p className="text-xs text-slate-400">OG</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{fv(og)}</p></div></div></div>);
}
// ─── Types locaux ─────────────────────────────────────────────────────────────
type Antecedent = {
  id: number;
  label: string;
  suivi: "Suivi" | "Non suivi";
  type: "Personnel" | "Familial" | "Alerte" | "À surveiller";
  // Champs optionnels pour les antécédents générés automatiquement depuis une visite
  autoFrom?: { visitRef: string; visitDate: string };
};
type Vaccination = { id: number; nom: string; dateAdmin: string; dateExp: string };
type Exposition = { id: number; type: string; niveau: "Faible" | "Modéré" | "Élevé" };

// ─── Synchronisation automatique diagnostics → antécédents ───────────────────
// Appelée lors de l'enregistrement d'une visite.
// Pour chaque diagnostic marqué "isHistory", ajoute un antécédent dans localStorage
// si ce libellé n'existe pas déjà (déduplication par label normalisé).
function pushAntecedentsFromDiagnoses(
  workerId: number,
  diagnoses: DiagnosisItem[],
  visitRef: string,
  visitDate: string
): number {
  const KEY = `antecedents_${workerId}`;
  let current: Antecedent[] = [];
  try { current = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { current = []; }

  const existingLabels = new Set(current.map((a) => a.label.trim().toLowerCase()));
  let added = 0;

  for (const dx of diagnoses) {
    if (!dx.isHistory || !dx.label.trim()) continue;
    if (existingLabels.has(dx.label.trim().toLowerCase())) continue;
    const newAnt: Antecedent = {
      id: Date.now() + added,
      label: dx.label.trim(),
      suivi: "Suivi",
      type: "Personnel",
      autoFrom: { visitRef, visitDate },
    };
    current = [...current, newAnt];
    existingLabels.add(dx.label.trim().toLowerCase());
    added++;
  }

  if (added > 0) localStorage.setItem(KEY, JSON.stringify(current));
  return added;
}

const ANT_TYPE_STYLE: Record<string, string> = {
  "Personnel":    "bg-blue-50 text-blue-700 ring-blue-200",
  "Familial":     "bg-purple-50 text-purple-700 ring-purple-200",
  "Alerte":       "bg-red-50 text-red-700 ring-red-200",
  "À surveiller": "bg-orange-50 text-orange-700 ring-orange-200",
};
const EXP_NIVEAU_STYLE: Record<string, string> = {
  "Faible":  "bg-green-50 text-green-700 ring-green-200",
  "Modéré":  "bg-orange-50 text-orange-700 ring-orange-200",
  "Élevé":   "bg-red-50 text-red-700 ring-red-200",
};

function vaccExpired(dateExp: string): boolean {
  if (!dateExp) return false;
  const [d, m, y] = dateExp.split("/").map(Number);
  if (!d || !m || !y) return false;
  return new Date(y, m - 1, d) < new Date();
}

// ─── Antécédents ──────────────────────────────────────────────────────────────
function AntecedentsCard({ workerId, apiBase }: { workerId: number; apiBase: string }) {
  const [items, setItems] = useState<Antecedent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Antecedent, "id" | "autoFrom">>({ label: "", suivi: "Suivi", type: "Personnel" });
  const [editId, setEditId] = useState<number | null>(null);

  const load = async () => {
    try {
      const { medicalHistoryAPI } = await import("../api");
      const data = await medicalHistoryAPI.get(workerId);
      setItems(data.antecedents.map((a: any) => ({
        id: a.id, label: a.label, suivi: a.suivi, type: a.type,
        autoFrom: a.visitRef ? { visitRef: a.visitRef, visitDate: a.visitDate } : undefined,
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [workerId]);

  const handleSubmit = async () => {
    if (!form.label.trim()) return;
    try {
      const { medicalHistoryAPI } = await import("../api");
      if (editId !== null) {
        const updated = await medicalHistoryAPI.updateAntecedent(workerId, editId, form);
        setItems((prev) => prev.map((i) => i.id === editId ? { ...i, ...form } : i));
      } else {
        const created = await medicalHistoryAPI.createAntecedent(workerId, form);
        setItems((prev) => [...prev, { id: created.id, ...form }]);
      }
      setForm({ label: "", suivi: "Suivi", type: "Personnel" });
      setEditId(null);
      setShowForm(false);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    try {
      const { medicalHistoryAPI } = await import("../api");
      await medicalHistoryAPI.deleteAntecedent(workerId, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { console.error(e); }
  };

  const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-medwork-cyan focus:ring-1 focus:ring-medwork-cyan/20";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-sm shadow-sm">🩺</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Antécédents</h3>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setEditId(null); setForm({ label: "", suivi: "Suivi", type: "Personnel" }); }}
          className="rounded-lg bg-medwork-cyan/10 px-2.5 py-1 text-[10px] font-bold text-medwork-cyan hover:bg-medwork-cyan/20 transition">
          {showForm ? "✕ Annuler" : "+ Ajouter"}
        </button>
      </div>
      {showForm && (
        <div className="border-b border-slate-100 bg-slate-50 p-4 space-y-2">
          <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Nom de l'antécédent" className={inp} />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Antecedent["type"] })} className={inp}>
              {["Personnel", "Familial", "Alerte", "À surveiller"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <select value={form.suivi} onChange={(e) => setForm({ ...form, suivi: e.target.value as Antecedent["suivi"] })} className={inp}>
              <option>Suivi</option><option>Non suivi</option>
            </select>
          </div>
          <button onClick={handleSubmit} className="w-full rounded-lg bg-medwork-cyan py-1.5 text-xs font-bold text-white hover:opacity-90 transition">
            {editId !== null ? "Modifier" : "Enregistrer"}
          </button>
        </div>
      )}
      <div>
        {loading ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Aucun antécédent enregistré</p>
        ) : items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 hover:bg-slate-50/60 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-800 truncate">{item.label}</p>
                {item.autoFrom && (
                  <span className="shrink-0 rounded-full bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold text-medwork-cyan ring-1 ring-cyan-200" title={`Depuis visite ${item.autoFrom.visitRef}`}>⚡ Auto</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${ANT_TYPE_STYLE[item.type] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>{item.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${item.suivi === "Suivi" ? "bg-green-50 text-green-700 ring-green-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{item.suivi}</span>
                {item.autoFrom && <span className="text-[9px] text-slate-400 font-mono">{item.autoFrom.visitRef}</span>}
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => { setForm({ label: item.label, suivi: item.suivi, type: item.type }); setEditId(item.id); setShowForm(true); }} className="rounded p-1 text-slate-400 hover:text-medwork-cyan hover:bg-cyan-50 text-xs">✏️</button>
              <button onClick={() => handleDelete(item.id)} className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Vaccinations ─────────────────────────────────────────────────────────────
function VaccinationsCard({ workerId }: { workerId: number }) {
  const [items, setItems] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Vaccination, "id">>({ nom: "", dateAdmin: "", dateExp: "" });
  const [editId, setEditId] = useState<number | null>(null);

  const load = async () => {
    try {
      const { medicalHistoryAPI } = await import("../api");
      const data = await medicalHistoryAPI.get(workerId);
      setItems(data.vaccinations);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [workerId]);

  const handleSubmit = async () => {
    if (!form.nom.trim()) return;
    try {
      const { medicalHistoryAPI } = await import("../api");
      if (editId !== null) {
        await medicalHistoryAPI.updateVaccination(workerId, editId, form);
        setItems((prev) => prev.map((i) => i.id === editId ? { ...i, ...form } : i));
      } else {
        const created = await medicalHistoryAPI.createVaccination(workerId, form);
        setItems((prev) => [...prev, { ...form, id: created.id }]);
      }
      setForm({ nom: "", dateAdmin: "", dateExp: "" });
      setEditId(null);
      setShowForm(false);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    try {
      const { medicalHistoryAPI } = await import("../api");
      await medicalHistoryAPI.deleteVaccination(workerId, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { console.error(e); }
  };

  const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-medwork-cyan focus:ring-1 focus:ring-medwork-cyan/20";
  const expired = items.filter((i) => vaccExpired(i.dateExp));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-sm shadow-sm">💉</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Vaccinations</h3>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setEditId(null); setForm({ nom: "", dateAdmin: "", dateExp: "" }); }}
          className="rounded-lg bg-medwork-cyan/10 px-2.5 py-1 text-[10px] font-bold text-medwork-cyan hover:bg-medwork-cyan/20 transition">
          {showForm ? "✕ Annuler" : "+ Ajouter"}
        </button>
      </div>
      {expired.length > 0 && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-[10px] text-red-700 font-semibold">
          ⚠️ {expired.length} vaccin{expired.length > 1 ? "s" : ""} expiré{expired.length > 1 ? "s" : ""}
        </div>
      )}
      {showForm && (
        <div className="border-b border-slate-100 bg-slate-50 p-4 space-y-2">
          <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom du vaccin" className={inp} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Date administration</label>
              <DatePicker value={form.dateAdmin} onChange={(v) => setForm({ ...form, dateAdmin: v })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Date expiration</label>
              <DatePicker value={form.dateExp} onChange={(v) => setForm({ ...form, dateExp: v })} />
            </div>
          </div>
          <button onClick={handleSubmit} className="w-full rounded-lg bg-medwork-cyan py-1.5 text-xs font-bold text-white hover:opacity-90 transition">
            {editId !== null ? "Modifier" : "Enregistrer"}
          </button>
        </div>
      )}
      <div>
        {loading ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Aucune vaccination enregistrée</p>
        ) : items.map((item) => {
          const exp = vaccExpired(item.dateExp);
          return (
            <div key={item.id} className={`flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 hover:bg-slate-50/60 group ${exp ? "bg-red-50/30" : ""}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{item.nom}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.dateAdmin && <span className="text-[10px] text-slate-400">Admin : {item.dateAdmin}</span>}
                  {item.dateExp && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${exp ? "bg-red-50 text-red-700 ring-red-200" : "bg-green-50 text-green-700 ring-green-200"}`}>
                      {exp ? "⚠️ Expiré" : "✅ À jour"} · {item.dateExp}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => { setForm({ nom: item.nom, dateAdmin: item.dateAdmin, dateExp: item.dateExp }); setEditId(item.id); setShowForm(true); }} className="rounded p-1 text-slate-400 hover:text-medwork-cyan hover:bg-cyan-50 text-xs">✏️</button>
                <button onClick={() => handleDelete(item.id)} className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs">🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Expositions aux risques ──────────────────────────────────────────────────
function ExpositionsCard({ workerId }: { workerId: number }) {
  const [items, setItems] = useState<Exposition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Exposition, "id">>({ type: "", niveau: "Modéré" });
  const [editId, setEditId] = useState<number | null>(null);

  const load = async () => {
    try {
      const { medicalHistoryAPI } = await import("../api");
      const data = await medicalHistoryAPI.get(workerId);
      setItems(data.expositions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [workerId]);

  const handleSubmit = async () => {
    if (!form.type.trim()) return;
    try {
      const { medicalHistoryAPI } = await import("../api");
      if (editId !== null) {
        await medicalHistoryAPI.updateExposition(workerId, editId, form);
        setItems((prev) => prev.map((i) => i.id === editId ? { ...i, ...form } : i));
      } else {
        const created = await medicalHistoryAPI.createExposition(workerId, form);
        setItems((prev) => [...prev, { ...form, id: created.id }]);
      }
      setForm({ type: "", niveau: "Modéré" });
      setEditId(null);
      setShowForm(false);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    try {
      const { medicalHistoryAPI } = await import("../api");
      await medicalHistoryAPI.deleteExposition(workerId, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) { console.error(e); }
  };

  const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-medwork-cyan focus:ring-1 focus:ring-medwork-cyan/20";
  const risquesElevés = items.filter((i) => i.niveau === "Élevé");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-sm shadow-sm">⚠️</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Expositions aux risques</h3>
        </div>
        <button onClick={() => { setShowForm((v) => !v); setEditId(null); setForm({ type: "", niveau: "Modéré" }); }}
          className="rounded-lg bg-medwork-cyan/10 px-2.5 py-1 text-[10px] font-bold text-medwork-cyan hover:bg-medwork-cyan/20 transition">
          {showForm ? "✕ Annuler" : "+ Ajouter"}
        </button>
      </div>
      {risquesElevés.length > 0 && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-[10px] text-red-700 font-semibold">
          🔴 {risquesElevés.length} risque{risquesElevés.length > 1 ? "s" : ""} élevé{risquesElevés.length > 1 ? "s" : ""} identifié{risquesElevés.length > 1 ? "s" : ""}
        </div>
      )}
      {showForm && (
        <div className="border-b border-slate-100 bg-slate-50 p-4 space-y-2">
          <input type="text" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Type de risque (bruit, chimique, poussière…)" className={inp} />
          <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value as Exposition["niveau"] })} className={inp}>
            <option>Faible</option><option>Modéré</option><option>Élevé</option>
          </select>
          <button onClick={handleSubmit} className="w-full rounded-lg bg-medwork-cyan py-1.5 text-xs font-bold text-white hover:opacity-90 transition">
            {editId !== null ? "Modifier" : "Enregistrer"}
          </button>
        </div>
      )}
      <div>
        {loading ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Aucune exposition enregistrée</p>
        ) : items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 hover:bg-slate-50/60 group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{item.type}</p>
              <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${EXP_NIVEAU_STYLE[item.niveau] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>{item.niveau}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => { setForm({ type: item.type, niveau: item.niveau }); setEditId(item.id); setShowForm(true); }} className="rounded p-1 text-slate-400 hover:text-medwork-cyan hover:bg-cyan-50 text-xs">✏️</button>
              <button onClick={() => handleDelete(item.id)} className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  return (<div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5"><span className="text-xs text-slate-500">{label}</span>{badge ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getBadgeStyle(value)}`}>{value}</span> : <span className="text-xs font-semibold text-slate-800">{value}</span>}</div>);
}
function AlertRow({ text, color = "orange" }: { text: string; color?: "orange" | "red" }) {
  return <div className={`px-4 py-2 text-xs ${color === "red" ? "border-l-4 border-red-500 bg-red-50 text-red-700" : "border-l-4 border-orange-500 bg-orange-50 text-orange-700"}`}>{text}</div>;
}

// ─── Groupage sanguin ──────────────────────────────────────────────────────────
function BloodGroupCard({ worker, onUpdate }: { worker: Worker; onUpdate: (bloodGroup: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(worker.bloodGroup || "");
  const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Inconnu"];
  const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-medwork-cyan focus:ring-1 focus:ring-medwork-cyan/20";

  const handleSave = async () => {
    try {
      const { workersAPI } = await import("../api");
      await workersAPI.update(worker.id, { bloodGroup: value });
      onUpdate(value);
      setEditing(false);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-sm">🩸</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Groupage sanguin</h3>
        </div>
        <button onClick={() => setEditing(v => !v)}
          className="rounded-lg bg-medwork-cyan/10 px-2.5 py-1 text-[10px] font-bold text-medwork-cyan hover:bg-medwork-cyan/20 transition">
          {editing ? "✕" : "✏️"}
        </button>
      </div>
      {editing ? (
        <div className="p-4 space-y-2 bg-slate-50 border-b border-slate-100">
          <select value={value} onChange={e => setValue(e.target.value)} className={inp}>
            <option value="">-- Sélectionner --</option>
            {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button onClick={handleSave} className="w-full rounded-lg bg-medwork-cyan py-1.5 text-xs font-bold text-white hover:opacity-90 transition">
            Enregistrer
          </button>
        </div>
      ) : null}
      <div className="px-4 py-4 flex items-center justify-center">
        {worker.bloodGroup ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-red-600">{worker.bloodGroup}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Groupe sanguin</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center">Groupe sanguin non renseigné</p>
        )}
      </div>
    </div>
  );
}

// ─── Antécédents professionnels ────────────────────────────────────────────────
const REASON_LABELS: Record<ProfessionalEntry["reason"], string> = {
  embauche: "Embauche",
  promotion: "Promotion",
  mutation: "Mutation",
  redéploiement_médical: "Redéploiement médical",
  redéploiement_professionnel: "Redéploiement professionnel",
  autre: "Autre",
};

const REASON_COLORS: Record<ProfessionalEntry["reason"], string> = {
  embauche: "bg-blue-50 text-blue-700 ring-blue-200",
  promotion: "bg-green-50 text-green-700 ring-green-200",
  mutation: "bg-purple-50 text-purple-700 ring-purple-200",
  redéploiement_médical: "bg-orange-50 text-orange-700 ring-orange-200",
  redéploiement_professionnel: "bg-amber-50 text-amber-700 ring-amber-200",
  autre: "bg-slate-100 text-slate-600 ring-slate-200",
};

function ProfessionalHistoryCard({ worker, onUpdate }: { worker: Worker; onUpdate: (history: ProfessionalEntry[]) => void }) {
  const [items, setItems] = useState<ProfessionalEntry[]>(worker.professionalHistory || []);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<ProfessionalEntry, "id">>({
    startDate: "", endDate: "", position: "", department: "", company: worker.company || "",
    reason: "embauche", notes: "",
  });

  const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-medwork-cyan focus:ring-1 focus:ring-medwork-cyan/20";

  const saveToBackend = async (newItems: ProfessionalEntry[]) => {
    try {
      const { workersAPI } = await import("../api");
      await workersAPI.update(worker.id, { professionalHistory: newItems });
      onUpdate(newItems);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async () => {
    if (!form.position.trim() || !form.startDate) return;
    let newItems: ProfessionalEntry[];
    if (editId !== null) {
      newItems = items.map(i => i.id === editId ? { ...form, id: editId } : i);
    } else {
      const newEntry: ProfessionalEntry = { ...form, id: Date.now() };
      newItems = [...items, newEntry];
    }
    setItems(newItems);
    await saveToBackend(newItems);
    setForm({ startDate: "", endDate: "", position: "", department: "", company: worker.company || "", reason: "embauche", notes: "" });
    setEditId(null);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    await saveToBackend(newItems);
  };

  const sorted = [...items].sort((a, b) => (b.startDate > a.startDate ? 1 : -1));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-sm">💼</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Parcours professionnel</h3>
        </div>
        <button onClick={() => { setShowForm(v => !v); setEditId(null); setForm({ startDate: "", endDate: "", position: "", department: "", company: worker.company || "", reason: "embauche", notes: "" }); }}
          className="rounded-lg bg-medwork-cyan/10 px-2.5 py-1 text-[10px] font-bold text-medwork-cyan hover:bg-medwork-cyan/20 transition">
          {showForm ? "✕ Annuler" : "+ Ajouter"}
        </button>
      </div>

      {showForm && (
        <div className="border-b border-slate-100 bg-slate-50 p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Début</p>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className={inp} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-1">Fin (optionnel)</p>
              <input type="date" value={form.endDate || ""} onChange={e => setForm({ ...form, endDate: e.target.value })} className={inp} />
            </div>
          </div>
          <input type="text" placeholder="Poste occupé" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} className={inp} />
          <input type="text" placeholder="Département / Service" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={inp} />
          <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value as ProfessionalEntry["reason"] })} className={inp}>
            {(Object.entries(REASON_LABELS) as [ProfessionalEntry["reason"], string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(form.reason === "redéploiement_médical" || form.reason === "redéploiement_professionnel") && (
            <textarea placeholder="Motif du redéploiement…" value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} className={`${inp} h-16 resize-none`} />
          )}
          <button onClick={handleSubmit} className="w-full rounded-lg bg-medwork-cyan py-1.5 text-xs font-bold text-white hover:opacity-90 transition">
            {editId !== null ? "Modifier" : "Enregistrer"}
          </button>
        </div>
      )}

      <div>
        {items.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400 text-center">Aucun parcours enregistré</p>
        ) : sorted.map((entry, idx) => (
          <div key={entry.id} className="border-t border-slate-100 px-4 py-3 hover:bg-slate-50/60 group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-slate-800">{entry.position}</p>
                  {idx === 0 && !entry.endDate && (
                    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-700 ring-1 ring-green-200">Actuel</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{entry.department}{entry.company && entry.company !== worker.company ? ` — ${entry.company}` : ""}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${REASON_COLORS[entry.reason]}`}>
                    {REASON_LABELS[entry.reason]}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {entry.startDate}{entry.endDate ? ` → ${entry.endDate}` : " → aujourd'hui"}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-[10px] text-slate-500 mt-1 italic">{entry.notes}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                <button onClick={() => { setForm({ startDate: entry.startDate, endDate: entry.endDate || "", position: entry.position, department: entry.department, company: entry.company || "", reason: entry.reason, notes: entry.notes || "" }); setEditId(entry.id); setShowForm(true); }} className="rounded p-1 text-slate-400 hover:text-medwork-cyan hover:bg-cyan-50">✏️</button>
                <button onClick={() => handleDelete(entry.id)} className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SideCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-50 text-sm shadow-sm">{icon}</span><h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3></div><div>{children}</div></div>);
}
function FormGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{title}</p>{children}</div>);
}

// ─── Section Biologie avec recherche dynamique ────────────────────────────────
function BiologySection({
  examTypes, examResults, setExamResults, preloadedIds = [], biology, onBiologyChange, inp,
}: {
  examTypes: import("./ExamTypesPage").ExamType[];
  examResults: Record<number, string>;
  setExamResults: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  preloadedIds?: number[];
  biology: string;
  onBiologyChange: (v: string) => void;
  inp: string;
}) {
  const [search, setSearch] = useState("");
  // Initialiser avec les IDs préchargés du type de visite + ceux déjà renseignés
  const [addedIds, setAddedIds] = useState<number[]>(() => {
    const fromResults = Object.keys(examResults).map(Number).filter((id) => examResults[id] !== "");
    return [...new Set([...preloadedIds, ...fromResults])];
  });
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = search.trim().length >= 1
    ? examTypes.filter((et) =>
        et.name.toLowerCase().includes(search.toLowerCase()) && !addedIds.includes(et.id)
      )
    : [];

  const addExam = (et: import("./ExamTypesPage").ExamType) => {
    setAddedIds((p) => [...p, et.id]);
    setSearch("");
    setShowDropdown(false);
  };

  const removeExam = (id: number) => {
    setAddedIds((p) => p.filter((x) => x !== id));
    setExamResults((r) => { const n = { ...r }; delete n[id]; return n; });
  };

  const activeExams = examTypes.filter((et) => addedIds.includes(et.id));

  const getAbnormal = (et: import("./ExamTypesPage").ExamType, val: string) => {
    if (!val) return false;
    if (et.valueType === "numeric") {
      const n = parseFloat(val);
      if (isNaN(n)) return false;
      if (et.normalMin !== null && n < et.normalMin) return true;
      if (et.normalMax !== null && n > et.normalMax) return true;
      return false;
    }
    const normals = et.normalValues ?? [];
    return normals.length > 0 && !normals.includes(val);
  };

  return (
    <div className="space-y-3">
      <SectionTitle title="Biologie" />

      {/* Barre de recherche pour ajouter un examen */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon d={icons.search} size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Rechercher un examen biologique à ajouter…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20"
            />
          </div>
        </div>

        {/* Dropdown résultats */}
        {showDropdown && search.trim().length >= 1 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">Aucun examen trouvé pour « {search} »</p>
            ) : (
              filtered.slice(0, 8).map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => addExam(et)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-cyan-50 transition"
                >
                  <div>
                    <span className="font-semibold text-slate-700">{et.name}</span>
                    {et.unit && <span className="ml-1.5 text-xs text-slate-400">{et.unit}</span>}
                  </div>
                  <span className="text-xs text-slate-400">
                    {et.valueType === "numeric"
                      ? `${et.normalMin ?? "—"} – ${et.normalMax ?? "—"}`
                      : (et.normalValues ?? []).join(" / ")}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Examens ajoutés */}
      {activeExams.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_140px_110px_32px] gap-0 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>Examen</span>
            <span className="px-2">Valeur de référence</span>
            <span className="px-2">Résultat</span>
            <span />
          </div>
          {activeExams.map((et) => {
            const val = examResults[et.id] ?? "";
            const isAbnormal = getAbnormal(et, val);
            return (
              <div key={et.id} className={`grid grid-cols-[1fr_140px_110px_32px] items-center border-t border-slate-100 px-4 py-2.5 ${isAbnormal ? "bg-red-50" : ""}`}>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{et.name}</p>
                  {et.unit && <p className="text-xs text-slate-400">{et.unit}</p>}
                </div>
                <div className="px-2 text-xs text-slate-500">
                  {et.valueType === "numeric" ? (
                    <div className="space-y-0.5">
                      {/* Intervalle par défaut */}
                      {(et.normalMin !== null || et.normalMax !== null) && (
                        <div className="text-[10px]">
                          <span className="text-slate-400">Défaut : </span>
                          {et.normalMin ?? "—"} – {et.normalMax ?? "—"} {et.unit ?? ""}
                        </div>
                      )}
                      {/* Intervalles spécifiques */}
                      {(et.referenceRanges ?? []).map((r: any, ri: number) => (
                        <div key={ri} className="text-[10px]">
                          <span className="font-semibold text-slate-500">{r.label} : </span>
                          {r.normalMin ?? "—"} – {r.normalMax ?? "—"}
                          {r.sex && r.sex !== "tous" && <span className="ml-1 text-slate-400">({r.sex})</span>}
                          {(r.ageMin !== null || r.ageMax !== null) && (
                            <span className="ml-1 text-slate-400">
                              {r.ageMin ?? "0"}-{r.ageMax ?? "∞"} ans
                            </span>
                          )}
                        </div>
                      ))}
                      {(et.normalMin === null && et.normalMax === null && (et.referenceRanges ?? []).length === 0) && "Non défini"}
                    </div>
                  ) : (
                    (et.normalValues ?? []).join(", ") || "Non défini"
                  )}
                </div>
                <div className="px-2">
                  {et.valueType === "numeric" ? (
                    <div className="relative">
                      <input
                        type="number" step="any"
                        value={val}
                        onChange={(e) => setExamResults((r) => ({ ...r, [et.id]: e.target.value }))}
                        placeholder="—"
                        className={`w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-1 transition ${isAbnormal ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-300 font-bold" : "border-slate-200 bg-slate-50 focus:border-medwork-cyan focus:ring-medwork-cyan/20"}`}
                      />
                      {isAbnormal && <span className="absolute -right-1 -top-1 text-[9px]">⚠️</span>}
                    </div>
                  ) : (
                    <select
                      value={val}
                      onChange={(e) => setExamResults((r) => ({ ...r, [et.id]: e.target.value }))}
                      className={`w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:ring-1 transition ${isAbnormal ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-300 font-bold" : "border-slate-200 bg-slate-50 focus:border-medwork-cyan focus:ring-medwork-cyan/20"}`}
                    >
                      <option value="">— Non fait</option>
                      {(et.possibleValues ?? et.normalValues ?? []).map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeExam(et.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-xs"
                  title="Retirer cet examen"
                >✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Note texte libre (optionnel) */}
      <textarea
        rows={1}
        value={biology}
        onChange={(e) => onBiologyChange(e.target.value)}
        placeholder="Remarques biologiques complémentaires (optionnel)…"
        className={inp}
      />
    </div>
  );
}

// ─── Formulaire visite ────────────────────────────────────────────────────────
function VisitFormContent({ formData, onChange, onSubmit, onCancel, submitLabel, visitTypeNames, visitTypes, decisions, canEdit, permissions = [], examTypes = [], currentUserRoleId }: { formData: VisitFormData; onChange: (d: VisitFormData) => void; onSubmit: (e: React.FormEvent) => void; onCancel: () => void; submitLabel: string; visitTypeNames?: string[]; visitTypes?: import("./VisitTypesPage").VisitType[]; decisions?: import("./DecisionsPage").Decision[]; canEdit?: (section: string) => boolean; permissions?: string[]; examTypes?: import("./ExamTypesPage").ExamType[]; currentUserRoleId?: number }) {
  const set = (u: (p: VisitFormData) => VisitFormData) => onChange(u(formData));
  const bmi = useMemo(() => calculateBMI(formData.clinicalExam.weight, formData.clinicalExam.height), [formData.clinicalExam.weight, formData.clinicalExam.height]);

  // Récupère la config du type de visite sélectionné
  const currentVT = visitTypes?.find((vt) => vt.name === formData.type);
  const examCfg = currentVT?.examConfig;

  // Examens biologiques associés au type de visite courant
  const associatedExamTypeIds = currentVT?.examTypeIds ?? [];
  const associatedExams = examTypes.filter((et) => associatedExamTypeIds.includes(et.id));

  // État local pour les résultats d'examens (examTypeId → value)
  const [examResults, setExamResults] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    ((formData as any).examResults ?? []).forEach((r: any) => { init[r.examTypeId] = r.value ?? ""; });
    return init;
  });

  // Sync dans formData quand les résultats changent
  useEffect(() => {
    const results = Object.entries(examResults)
      .filter(([, v]) => v !== "")
      .map(([id, value]) => {
        const et = examTypes.find((e) => e.id === Number(id));
        let isAbnormal = false;
        if (et) {
          if (et.valueType === "numeric") {
            const num = parseFloat(value);
            if (!isNaN(num)) {
              if (et.normalMin !== null && num < et.normalMin) isAbnormal = true;
              if (et.normalMax !== null && num > et.normalMax) isAbnormal = true;
            }
          } else {
            const normals = et.normalValues ?? [];
            if (normals.length > 0 && !normals.includes(value)) isAbnormal = true;
          }
        }
        return { examTypeId: Number(id), value, isAbnormal };
      });
    onChange({ ...formData, examResults: results } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examResults]);

  // ── fieldConfig : visibilité des champs principaux ────────────────────────
  const DEFAULT_FC = { aptitude: "visible", nextVisit: "visible", restrictions: "visible", note: "visible", doctor: "visible", aptitudeDoctor: "visible" } as const;
  const fieldCfg = examCfg?.fieldConfig ?? DEFAULT_FC;
  const fieldLevel = (key: keyof typeof DEFAULT_FC): "visible" | "readonly" | "hidden" => {
    const rule = fieldCfg?.[key] as any;
    if (!rule) return "visible";
    // Nouveau format avec byRole
    if (typeof rule === "object" && rule.default !== undefined) {
      const rid = currentUserRoleId !== undefined ? String(currentUserRoleId) : undefined;
      if (rid && rule.byRole?.[rid]) return rule.byRole[rid];
      return rule.default ?? "visible";
    }
    // Ancien format : string simple
    return typeof rule === "string" ? rule : "visible";
  };
  const fieldVisible = (key: keyof typeof DEFAULT_FC) => fieldLevel(key) !== "hidden";
  const fieldReadonly = (key: keyof typeof DEFAULT_FC) => fieldLevel(key) === "readonly";

  // ── Auto-calcul prochaine visite ──────────────────────────────────────────
  // Calcule la prochaine visite à partir de la date de visite et de la périodicité
  const calcNextVisit = (date: string, periodicity: string | undefined): string => {
    if (!date || !periodicity) return "";
    const parts = date.split("/");
    if (parts.length !== 3) return "";
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y) return "";
    const base = new Date(y, m - 1, d);
    let months = 0;
    if (periodicity === "Annuelle")       months = 12;
    else if (periodicity === "Tous les 2 ans") months = 24;
    else if (periodicity === "Tous les 3 ans") months = 36;
    else if (periodicity === "Tous les 5 ans") months = 60;
    else if (periodicity === "6 mois")    months = 6;
    else if (periodicity === "3 mois")    months = 3;
    else return ""; // À la demande / Unique → pas de calcul
    base.setMonth(base.getMonth() + months);
    return `${String(base.getDate()).padStart(2, "0")}/${String(base.getMonth() + 1).padStart(2, "0")}/${base.getFullYear()}`;
  };

  // Auto-mettre à jour nextVisit quand date ou type change
  useEffect(() => {
    if (!currentVT?.periodicity) return;
    const computed = calcNextVisit(formData.date, currentVT.periodicity);
    if (computed && computed !== formData.nextVisit) {
      onChange({ ...formData, nextVisit: computed });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.type]);

  // ── Vérificateur de permissions centralisé ────────────────────────────────
  const canPerm = (perm: string): boolean => {
    if (permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const parts = perm.split(".");
    for (let i = 1; i < parts.length; i++) {
      if (permissions.includes(parts.slice(0, i).join("."))) return true;
    }
    return false;
  };

  // 3 états : "edit" = modifiable | "disabled" = visible grisé | "hidden" = masqué
  const SECTION_PERMS: Record<string, string> = {
    info:            "visits.edit.info",
    note:            "visits.edit.info",  // note partage la perm info mais section séparée
    doctor:          "visits.edit.doctor",
    aptitudeDoctor:  "visits.edit.aptitudeDoctor",
    clinicalExam:    "visits.edit.clinicalExam",
    complaints:      "visits.edit.complaints",
    physicalExam:    "visits.edit.physicalExam",
    biology:         "visits.edit.biology",
    functional:      "visits.edit.functional",
    diagnoses:       "visits.edit.diagnoses",
    treatment:       "visits.edit.treatment",
    complementary:   "visits.edit.complementary",
    recommendations: "visits.edit.recommendations",
    aptitude:        "visits.edit.aptitude",
  };

  // ── Résolution des droits par section ─────────────────────────────────────
  // Source de vérité : editRules (✏️) et viewSections (👁) du type de visite
  const rid = currentUserRoleId !== undefined ? String(currentUserRoleId) : null;

  const getSectionState = (section: string): "edit" | "view" | "hidden" => {
    // Super admin → toujours edit
    if (canPerm("*")) return "edit";
    // Pas de type de visite configuré → edit par défaut (aucune restriction)
    if (!currentVT || !rid) return "edit";
    const editable = currentVT.editRules?.[rid];
    const viewable = (currentVT as any).viewSections?.[rid];
    // Si le rôle n'est configuré NI dans editRules NI dans viewSections → edit par défaut
    const isConfigured = editable !== undefined || viewable !== undefined;
    if (!isConfigured) return "edit";
    if (editable?.includes(section)) return "edit";
    if (viewable?.includes(section)) return "view";
    return "hidden";
  };

  const sectionAccess = (section: string): "edit" | "disabled" | "hidden" => {
    const state = getSectionState(section);
    if (state === "edit") return "edit";
    if (state === "view") return "disabled"; // visible mais non modifiable
    // hidden → vérifier si visits.view est accordé (ne change rien pour les sections = masqué)
    return "hidden";
  };

  // Wrapper pour les sections désactivées
  const DisabledWrapper = ({ children, reason }: { children: React.ReactNode; reason?: string }) => (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-slate-700/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          🔒 {reason ?? "Non autorisé pour ce rôle"}
        </span>
      </div>
    </div>
  );

  const ce = (section: string) => sectionAccess(section) !== "hidden";
  const isDisabled = (section: string) => sectionAccess(section) === "disabled";

  const show = {
    clinicalExam:   ce("clinicalExam")   && (!examCfg || examCfg.clinicalExam.enabled),
    complaints:     ce("complaints")     && (!examCfg || examCfg.complaints),
    physicalExam:   ce("physicalExam")   && (!examCfg || examCfg.physicalExam.enabled),
    biology:        ce("biology")        && (!examCfg || examCfg.biology),
    functional:     ce("functional")     && (!examCfg || examCfg.functionalEvaluation.enabled),
    ecg:            ce("functional")     && (!examCfg || examCfg.functionalEvaluation.ecg),
    spirometry:     ce("functional")     && (!examCfg || examCfg.functionalEvaluation.spirometry),
    audiogram:      ce("functional")     && (!examCfg || examCfg.functionalEvaluation.audiogram),
    visualTest:     ce("functional")     && (!examCfg || examCfg.functionalEvaluation.visualTest),
    imaging:        ce("functional")     && (!examCfg || examCfg.functionalEvaluation.imaging),
    diagnoses:      ce("diagnoses")      && (!examCfg || examCfg.diagnoses),
    treatment:      ce("treatment")      && (!examCfg || examCfg.treatment),
    complementary:  ce("complementary")  && (!examCfg || examCfg.complementaryExams),
    recommendations:ce("recommendations")&& (!examCfg || examCfg.recommendations),
    info:           ce("info"),
    note:           ce("note"),          // section indépendante pour la note médicale
    aptitude:       ce("aptitude"),
  };
  const clinFields = examCfg?.clinicalExam.fields;
  const physFields = examCfg?.physicalExam.fields;

  const upField = (n: keyof Omit<VisitFormData, "clinicalExam" | "physicalExam" | "functionalEvaluation" | "diagnoses" | "treatment">, v: string) => set((p) => ({ ...p, [n]: v }));
  const upClinical = (n: keyof ClinicalExam, v: string) => set((p) => ({ ...p, clinicalExam: { ...p.clinicalExam, [n]: v, bmi: (n === "weight" || n === "height") ? calculateBMI(n === "weight" ? v : p.clinicalExam.weight, n === "height" ? v : p.clinicalExam.height) : p.clinicalExam.bmi } }));
  const upPhysical = (n: keyof PhysicalExam, v: string) => set((p) => ({ ...p, physicalExam: { ...p.physicalExam, [n]: v } }));
  const upFE = (n: keyof Omit<FunctionalEvaluation, "visualTest" | "imaging" | "colorVisionOD" | "colorVisionOG">, v: string) => set((p) => ({ ...p, functionalEvaluation: { ...p.functionalEvaluation, [n]: v } }));
  const upColor = (eye: "colorVisionOD" | "colorVisionOG", v: string) => set((p) => ({ ...p, functionalEvaluation: { ...p.functionalEvaluation, [eye]: v } }));
  const upVisual = (n: keyof TestVisuel, v: string) => set((p) => ({ ...p, functionalEvaluation: { ...p.functionalEvaluation, visualTest: { ...p.functionalEvaluation.visualTest, [n]: v } } }));
  const upImaging = (i: number, f: keyof ImagingExam, v: string) => set((p) => ({ ...p, functionalEvaluation: { ...p.functionalEvaluation, imaging: p.functionalEvaluation.imaging.map((e, j) => j === i ? { ...e, [f]: v } : e) } }));
  const addImaging = () => set((p) => ({ ...p, functionalEvaluation: { ...p.functionalEvaluation, imaging: [...p.functionalEvaluation.imaging, { name: "", result: "" }] } }));
  const rmImaging = (i: number) => set((p) => ({ ...p, functionalEvaluation: { ...p.functionalEvaluation, imaging: p.functionalEvaluation.imaging.filter((_, j) => j !== i) } }));
  const upDx = (i: number, f: keyof DiagnosisItem, v: string | boolean) => set((p) => ({ ...p, diagnoses: p.diagnoses.map((d, j) => j === i ? { ...d, [f]: v } : d) }));
  const addDx = () => set((p) => ({ ...p, diagnoses: [...p.diagnoses, { label: "", isHistory: false }] }));
  const rmDx = (i: number) => set((p) => ({ ...p, diagnoses: p.diagnoses.filter((_, j) => j !== i) }));
  const upComplaint = (i: number, f: keyof ComplaintItem, v: string) => set((p) => ({ ...p, complaints: p.complaints.map((c, j) => j === i ? { ...c, [f]: v } : c) }));
  const addComplaint = () => set((p) => ({ ...p, complaints: [...p.complaints, { label: "", duration: "" }] }));
  const rmComplaint = (i: number) => set((p) => ({ ...p, complaints: p.complaints.filter((_, j) => j !== i) }));
  const upTx = (i: number, f: keyof TreatmentItem, v: string) => set((p) => ({ ...p, treatment: p.treatment.map((t, j) => j === i ? { ...t, [f]: v } : t) }));
  const addTx = () => set((p) => ({ ...p, treatment: [...p.treatment, { molecule: "", quantity: "", posology: "" }] }));
  const rmTx = (i: number) => set((p) => ({ ...p, treatment: p.treatment.filter((_, j) => j !== i) }));
  const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Infos générales : uniquement date + type */}
        {show.info && (
          <div key="date"><label className={lbl}>Date de visite</label>
            <DatePicker value={(formData as Record<string, string>)["date"]} onChange={(v) => upField("date", v)} />
          </div>
        )}
        {show.info && (
          <div><label className={lbl}>Type de visite</label>
            <select value={formData.type} onChange={(e) => upField("type", e.target.value)} className={inp}>
              {(visitTypeNames && visitTypeNames.length > 0 ? visitTypeNames : ["Visite périodique", "Visite d'embauche", "Visite de reprise", "Consultation spontanée"]).map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Médecins — section séparée */}
        {fieldVisible("doctor") && sectionAccess("doctor") !== "hidden" && (
          <div key="doctor">
            <label className={lbl}>Médecin consultant / prescripteur</label>
            <input
              type="text"
              value={(formData as Record<string, string>)["doctor"]}
              onChange={(e) => upField("doctor", e.target.value)}
              placeholder="Ex: Dr Alseny Camara"
              className={inp}
              readOnly={sectionAccess("doctor") === "disabled" || fieldReadonly("doctor")}
            />
          </div>
        )}
        {fieldVisible("aptitudeDoctor") && sectionAccess("aptitudeDoctor") !== "hidden" && (
          <div>
            <label className={lbl}>Médecin décision d'aptitude</label>
            <input
              type="text"
              value={formData.aptitudeDoctor ?? ""}
              onChange={(e) => set((p) => ({ ...p, aptitudeDoctor: e.target.value }))}
              placeholder="Si différent — Ex: Dr Ibrahima Camara"
              className={inp}
              readOnly={sectionAccess("aptitudeDoctor") === "disabled" || fieldReadonly("aptitudeDoctor")}
            />
            <p className="mt-1 text-[10px] text-slate-400">Laisser vide = même que le médecin consultant.</p>
          </div>
        )}

        {/* Prochaine visite */}
        {show.info && fieldVisible("nextVisit") && (
          <div key="nextVisit">
            <label className={lbl}>
              Prochaine visite
              {currentVT?.periodicity && currentVT.periodicity !== "À la demande" && currentVT.periodicity !== "Unique" && (
                <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-medwork-cyan ring-1 ring-cyan-200">
                  ⚡ Auto ({currentVT.periodicity})
                </span>
              )}
            </label>
            <DatePicker value={(formData as Record<string, string>)["nextVisit"]} onChange={(v) => upField("nextVisit", v)} />
          </div>
        )}

        {/* Aptitude */}
        {show.aptitude && fieldVisible("aptitude") && (
          sectionAccess("aptitude") === "disabled" ? (
            <DisabledWrapper reason="Aptitude — non autorisé">
              <div>
                <label className={lbl}>Aptitude / Décision médicale</label>
                <select disabled value={formData.aptitude} className={inp + " opacity-60"}>
                  <option>{formData.aptitude}</option>
                </select>
              </div>
            </DisabledWrapper>
          ) : (
            <div>
              <label className={lbl}>Aptitude / Décision médicale</label>
              <select value={formData.aptitude} onChange={(e) => !fieldReadonly("aptitude") && upField("aptitude", e.target.value)} disabled={fieldReadonly("aptitude")} className={inp + (fieldReadonly("aptitude") ? " opacity-60 cursor-not-allowed" : "")}>
                <option value="">— Sélectionner une aptitude</option>
                {(decisions && decisions.length > 0
                  ? decisions.map((d) => d.label)
                  : ["Apte", "Apte avec restriction", "A surveiller", "Inapte temporaire"]
                ).map((label) => <option key={label}>{label}</option>)}
              </select>
            </div>
          )
        )}
        {/* Restrictions */}
        {show.aptitude && fieldVisible("restrictions") && sectionAccess("aptitude") !== "disabled" && (!decisions || decisions.length === 0 || decisions.find((d) => d.label === formData.aptitude)?.requiresRestriction) && (
          <div>
            <label className={lbl}>Restrictions</label>
            <input type="text" value={(formData as Record<string, string>)["restrictions"]} onChange={(e) => upField("restrictions", e.target.value)} placeholder="Ex: Éviter le port de charges lourdes" className={inp} />
          </div>
        )}
        {/* Note médicale */}
        {show.note && fieldVisible("note") && (
          <div className="md:col-span-2"><label className={lbl}>Note médicale</label><textarea rows={3} value={formData.note} onChange={(e) => upField("note", e.target.value)} placeholder="Résumé de la visite" className={inp} /></div>
        )}
      </div>

      {/* Bandeau informatif si sections restreintes */}
      {canEdit && !canEdit("info") && !canEdit("aptitude") && !show.clinicalExam && !show.physicalExam && !show.treatment && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3">
          <span className="text-orange-500">⚠️</span>
          <p className="text-xs text-orange-700">Votre rôle ne vous autorise à modifier aucune section de cette visite.</p>
        </div>
      )}

      {/* Examen clinique */}
      {show.clinicalExam && (
        isDisabled("clinicalExam") ? (
          <DisabledWrapper reason="Examen clinique — non autorisé">
            <div className="space-y-3"><SectionTitle title="Examen clinique" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {([ ["weight","Poids (kg)"], ["height","Taille (m)"], ["temperature","Température"], ["bloodPressure","TA (mmHg)"], ["pulse","Pouls /mn"], ["respiratoryRate","FR cycles/mn"] ] as [keyof ClinicalExam, string][]).map(([n, p]) => <input key={n} type="text" readOnly placeholder={p} value={formData.clinicalExam[n]} className={inp} />)}
              </div>
            </div>
          </DisabledWrapper>
        ) : (
          <div className="space-y-3"><SectionTitle title="Examen clinique" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {([ ["weight","Poids (kg)"], ["height","Taille (m)"], ["temperature","Température"], ["bloodPressure","TA (mmHg)"], ["pulse","Pouls /mn"], ["respiratoryRate","FR cycles/mn"] ] as [keyof ClinicalExam, string][]).filter(([k]) => !clinFields || clinFields[k as keyof typeof clinFields]).map(([n, p]) => <input key={n} type="text" placeholder={p} value={formData.clinicalExam[n]} onChange={(e) => upClinical(n, e.target.value)} className={inp} />)}
              {(!clinFields || clinFields.height) && <input type="text" readOnly placeholder="IMC calculé" value={bmi} className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm outline-none" />}
            </div>
          </div>
        )
      )}

      {/* Plaintes */}
      {show.complaints && (
        isDisabled("complaints") ? (
          <DisabledWrapper reason="Plaintes — non autorisé"><div className="space-y-3"><SectionTitle title="Plaintes" /><div className="rounded-xl border border-slate-200 bg-white p-4 h-16" /></div></DisabledWrapper>
        ) : (
          <div className="space-y-3">
            <SectionTitle title="Plaintes" />
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Plaintes du travailleur</p>
                <button type="button" onClick={addComplaint} className="rounded-lg bg-medwork-cyan px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">+ Ajouter une plainte</button>
              </div>
              {formData.complaints.length > 0 && (
                <div className="mb-2 grid grid-cols-[1fr_160px_36px] gap-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Plainte</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Durée d'évolution</span>
                  <span />
                </div>
              )}
              <div className="space-y-2">
                {formData.complaints.map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_160px_36px] gap-2">
                    <input type="text" placeholder="Ex: Douleurs lombaires…" value={c.label} onChange={(e) => upComplaint(i, "label", e.target.value)} className={inp} />
                    <input type="text" placeholder="Ex: 3 semaines" value={c.duration} onChange={(e) => upComplaint(i, "duration", e.target.value)} className={inp} />
                    <button type="button" onClick={() => rmComplaint(i)} className="flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-400 hover:bg-red-100">✕</button>
                  </div>
                ))}
                {formData.complaints.length === 0 && <p className="text-xs text-slate-400">Aucune plainte. Cliquez sur "Ajouter une plainte".</p>}
              </div>
            </div>
          </div>
        )
      )}

      {/* Examen physique */}
      {show.physicalExam && (
        isDisabled("physicalExam") ? (
          <DisabledWrapper reason="Examen physique — non autorisé"><div className="space-y-3"><SectionTitle title="Examen physique" /><div className="rounded-xl border border-slate-200 bg-white p-4 h-16" /></div></DisabledWrapper>
        ) : (
          <div className="space-y-3"><SectionTitle title="Examen physique" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {([ ["orl","ORL"], ["digestive","Digestif"], ["cardiology","Cardiologique"], ["neurology","Neurologique"], ["pulmonary","Pulmonaire"], ["uroGenital","Uro-génital"], ["locomotor","Locomoteur"], ["others","Autres"] ] as [keyof PhysicalExam, string][]).filter(([k]) => !physFields || physFields[k as keyof typeof physFields]).map(([k, l]) => <input key={k} type="text" placeholder={l} value={formData.physicalExam[k]} onChange={(e) => upPhysical(k, e.target.value)} className={inp} />)}
            </div>
          </div>
        )
      )}

      {/* Biologie */}
      {show.biology && (
        isDisabled("biology") ? (
          <DisabledWrapper reason="Biologie — non autorisé"><div className="space-y-3"><SectionTitle title="Biologie" /><div className="h-16 rounded-xl border border-slate-200 bg-white" /></div></DisabledWrapper>
        ) : (
          <BiologySection
            examTypes={examTypes}
            examResults={examResults}
            setExamResults={setExamResults}
            preloadedIds={associatedExamTypeIds}
            biology={formData.biology ?? ""}
            onBiologyChange={(v) => upField("biology", v)}
            inp={inp}
          />
        )
      )}

      {/* Évaluation fonctionnelle */}
      {show.functional && (
        isDisabled("functional") ? (
          <DisabledWrapper reason="Évaluation fonctionnelle — non autorisé"><div className="space-y-3"><SectionTitle title="Évaluation fonctionnelle" /><div className="h-16 rounded-xl border border-slate-200 bg-white" /></div></DisabledWrapper>
        ) : (
          <div className="space-y-3"><SectionTitle title="Évaluation fonctionnelle" />
            <div className="grid gap-3 md:grid-cols-2">
              {show.ecg && <input type="text" placeholder="ECG" value={formData.functionalEvaluation.ecg} onChange={(e) => upFE("ecg", e.target.value)} className={inp} />}
              {show.spirometry && <input type="text" placeholder="Spirométrie" value={formData.functionalEvaluation.spirometry} onChange={(e) => upFE("spirometry", e.target.value)} className={inp} />}
            </div>
            {show.audiogram && <FormGroup title="Audiogramme & protection auditive"><div className="grid gap-3 md:grid-cols-2"><input type="text" placeholder="Audiogramme" value={formData.functionalEvaluation.audiogram} onChange={(e) => upFE("audiogram", e.target.value)} className={inp} /><select value={formData.functionalEvaluation.hearingProtectionUsed} onChange={(e) => upFE("hearingProtectionUsed", e.target.value)} className={inp}><option>Non</option><option>Oui</option></select>{formData.functionalEvaluation.hearingProtectionUsed === "Oui" && <input type="text" placeholder="Type protection" value={formData.functionalEvaluation.hearingProtectionType} onChange={(e) => upFE("hearingProtectionType", e.target.value)} className={inp} />}</div></FormGroup>}
            {show.visualTest && <FormGroup title="Tests visuels"><div className="grid gap-3 md:grid-cols-3">{[["distanceOD","distanceOG","Vision de loin"],["presOD","presOG","Vision de près"]].map(([od,og,l]) => (<div key={l} className="space-y-1"><p className="text-xs text-slate-400">{l}</p><div className="flex gap-2"><input type="text" placeholder="OD" value={(formData.functionalEvaluation.visualTest as Record<string,string>)[od]} onChange={(e) => upVisual(od as keyof TestVisuel, e.target.value)} className={inp} /><input type="text" placeholder="OG" value={(formData.functionalEvaluation.visualTest as Record<string,string>)[og]} onChange={(e) => upVisual(og as keyof TestVisuel, e.target.value)} className={inp} /></div></div>))}<div className="space-y-1"><p className="text-xs text-slate-400">Vision des couleurs</p><div className="flex gap-2"><input type="text" placeholder="OD" value={formData.functionalEvaluation.colorVisionOD} onChange={(e) => upColor("colorVisionOD", e.target.value)} className={inp} /><input type="text" placeholder="OG" value={formData.functionalEvaluation.colorVisionOG} onChange={(e) => upColor("colorVisionOG", e.target.value)} className={inp} /></div></div></div></FormGroup>}
            {show.imaging && <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Imagerie</p><button type="button" onClick={addImaging} className="rounded-lg bg-medwork-cyan px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">+ Ajouter</button></div><div className="space-y-2">{formData.functionalEvaluation.imaging.map((ex, i) => (<div key={i} className="flex items-center gap-2"><div className="grid flex-1 gap-2 md:grid-cols-2"><input type="text" placeholder="Examen" value={ex.name} onChange={(e) => upImaging(i,"name",e.target.value)} className={inp} /><input type="text" placeholder="Résultat" value={ex.result} onChange={(e) => upImaging(i,"result",e.target.value)} className={inp} /></div><button type="button" onClick={() => rmImaging(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-400 hover:bg-red-100">✕</button></div>))}{formData.functionalEvaluation.imaging.length === 0 && <p className="text-xs text-slate-400">Aucune imagerie.</p>}</div></div>}
          </div>
        )
      )}

      {/* Diagnostics */}
      {show.diagnoses && (
        isDisabled("diagnoses") ? (
          <DisabledWrapper reason="Diagnostics — non autorisé"><div className="space-y-3"><SectionTitle title="Diagnostics" /><div className="h-16 rounded-xl border border-slate-200 bg-white" /></div></DisabledWrapper>
        ) : (
          <div className="space-y-3"><SectionTitle title="Diagnostics" /><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Diagnostics</p><button type="button" onClick={addDx} className="rounded-lg bg-medwork-cyan px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">+ Ajouter</button></div><div className="space-y-2">{formData.diagnoses.map((d, i) => (<div key={i} className="flex items-center gap-2"><div className="grid flex-1 gap-2 md:grid-cols-[1fr_auto]"><input type="text" placeholder="Diagnostic" value={d.label} onChange={(e) => upDx(i,"label",e.target.value)} className={inp} /><label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs whitespace-nowrap cursor-pointer transition ${d.isHistory ? "border-orange-300 bg-orange-50 text-orange-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50/50"}`}><input type="checkbox" checked={d.isHistory} onChange={(e) => upDx(i,"isHistory",e.target.checked)} className="h-3.5 w-3.5 accent-orange-500" />⚡ → Antécédent</label></div><button type="button" onClick={() => rmDx(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-400 hover:bg-red-100">✕</button></div>))}{formData.diagnoses.length === 0 && <p className="text-xs text-slate-400">Aucun diagnostic. Cliquez sur "+ Ajouter".</p>}</div><p className="mt-2 text-[10px] text-slate-400">💡 Cocher "→ Antécédent" ajoute automatiquement le diagnostic dans la fiche du travailleur.</p></div></div>
        )
      )}

      {/* Traitement */}
      {show.treatment && (
        isDisabled("treatment") ? (
          <DisabledWrapper reason="Traitement — non autorisé"><div className="space-y-3"><SectionTitle title="Traitement / ordonnance" /><div className="h-16 rounded-xl border border-slate-200 bg-white" /></div></DisabledWrapper>
        ) : (
          <div className="space-y-3"><SectionTitle title="Traitement / ordonnance" /><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Prescriptions</p><button type="button" onClick={addTx} className="rounded-lg bg-medwork-cyan px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">+ Ajouter</button></div>{formData.treatment.length > 0 && <div className="mb-2 grid grid-cols-[1fr_120px_1fr_36px] gap-2 px-1"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Molécule</span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Qté</span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Posologie</span><span /></div>}<div className="space-y-2">{formData.treatment.map((t, i) => (<div key={i} className="grid grid-cols-[1fr_120px_1fr_36px] gap-2"><input type="text" placeholder="Molécule" value={t.molecule} onChange={(e) => upTx(i,"molecule",e.target.value)} className={inp} /><input type="text" placeholder="Qté" value={t.quantity} onChange={(e) => upTx(i,"quantity",e.target.value)} className={inp} /><input type="text" placeholder="Posologie" value={t.posology} onChange={(e) => upTx(i,"posology",e.target.value)} className={inp} /><button type="button" onClick={() => rmTx(i)} className="flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-400 hover:bg-red-100">✕</button></div>))}{formData.treatment.length === 0 && <p className="text-xs text-slate-400">Aucun traitement.</p>}</div></div></div>
        )
      )}

      {/* Examens complémentaires */}
      {show.complementary && (
        isDisabled("complementary") ? (
          <DisabledWrapper reason="Examens complémentaires — non autorisé"><div className="space-y-2"><SectionTitle title="Examens complémentaires" /><div className="h-12 rounded-xl border border-slate-200 bg-white" /></div></DisabledWrapper>
        ) : (
          <div className="space-y-2"><SectionTitle title="Examens complémentaires" /><textarea rows={2} value={formData.complementaryExams} onChange={(e) => upField("complementaryExams", e.target.value)} placeholder="Examens demandés" className={inp} /></div>
        )
      )}

      {/* Recommandations */}
      {show.recommendations && (
        isDisabled("recommendations") ? (
          <DisabledWrapper reason="Recommandations — non autorisé"><div className="space-y-2"><SectionTitle title="Recommandations" /><div className="h-12 rounded-xl border border-slate-200 bg-white" /></div></DisabledWrapper>
        ) : (
          <div className="space-y-2"><SectionTitle title="Recommandations" /><textarea rows={2} value={formData.recommendations} onChange={(e) => upField("recommendations", e.target.value)} placeholder="Conseils au travailleur" className={inp} /></div>
        )
      )}

      <div className="flex gap-3 pt-2"><button type="submit" className="rounded-xl bg-medwork-cyan px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">{submitLabel}</button><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Annuler</button></div>
    </form>
  );
}

// ─── Carte visite ─────────────────────────────────────────────────────────────
// ─── Palette de couleurs par type de visite ───────────────────────────────────
// Chaque type de visite reçoit une couleur cohérente basée sur son nom.
// Les types connus ont des couleurs fixes ; les types personnalisés ont une couleur
// générée de façon déterministe à partir du nom.
function getVisitTypeStyle(typeName: string): {
  bg: string;       // fond de l'en-tête
  border: string;   // bordure gauche colorée
  text: string;     // couleur du texte du titre
  dot: string;      // couleur du point indicateur
} {
  const KNOWN: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    "Visite périodique":      { bg: "bg-medwork-navy/5",   border: "border-l-4 border-medwork-navy",   text: "text-medwork-navy",   dot: "bg-medwork-navy" },
    "Visite d'embauche":      { bg: "bg-green-50",         border: "border-l-4 border-green-500",       text: "text-green-700",      dot: "bg-green-500" },
    "Visite de reprise":      { bg: "bg-orange-50",        border: "border-l-4 border-orange-400",      text: "text-orange-700",     dot: "bg-orange-400" },
    "Consultation spontanée": { bg: "bg-purple-50",        border: "border-l-4 border-purple-400",      text: "text-purple-700",     dot: "bg-purple-400" },
    "Visite de pré-reprise":  { bg: "bg-yellow-50",        border: "border-l-4 border-yellow-500",      text: "text-yellow-700",     dot: "bg-yellow-500" },
    "Visite d'aptitude":      { bg: "bg-cyan-50",          border: "border-l-4 border-medwork-cyan",    text: "text-medwork-cyan",   dot: "bg-medwork-cyan" },
    "Visite de surveillance": { bg: "bg-sky-50",           border: "border-l-4 border-sky-400",         text: "text-sky-700",        dot: "bg-sky-400" },
  };

  if (KNOWN[typeName]) return KNOWN[typeName];

  // Couleur déterministe pour les types personnalisés
  const FALLBACK = [
    { bg: "bg-indigo-50",  border: "border-l-4 border-indigo-400", text: "text-indigo-700",  dot: "bg-indigo-400" },
    { bg: "bg-teal-50",    border: "border-l-4 border-teal-400",   text: "text-teal-700",    dot: "bg-teal-400" },
    { bg: "bg-rose-50",    border: "border-l-4 border-rose-400",   text: "text-rose-700",    dot: "bg-rose-400" },
    { bg: "bg-amber-50",   border: "border-l-4 border-amber-400",  text: "text-amber-700",   dot: "bg-amber-400" },
    { bg: "bg-lime-50",    border: "border-l-4 border-lime-500",   text: "text-lime-700",    dot: "bg-lime-500" },
    { bg: "bg-fuchsia-50", border: "border-l-4 border-fuchsia-400",text: "text-fuchsia-700", dot: "bg-fuchsia-400" },
  ];
  const hash = typeName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return FALLBACK[hash % FALLBACK.length];
}

function VisitCard({ visit, worker, isOpen, onToggle, onSaveEdit, onCloseVisit, onDeleteVisit, autoEdit = false, visitTypeNames, visitTypes, decisions, currentUserRoleId, allUsers, permissions = [], examTypes = [] }: { visit: Visit; worker: Worker; isOpen: boolean; onToggle: () => void; onSaveEdit: (v: Visit) => void; onCloseVisit: (id: number) => void; onDeleteVisit?: (id: number) => void; autoEdit?: boolean; visitTypeNames?: string[]; visitTypes?: import("./VisitTypesPage").VisitType[]; decisions?: import("./DecisionsPage").Decision[]; currentUserRoleId?: number; allUsers?: import("./UserManagementPage").AppUser[]; permissions?: string[]; examTypes?: import("./ExamTypesPage").ExamType[] }) {
  const [printState, setPrintState] = useState<{ open: boolean; doc: PrintDocType }>({ open: false, doc: "compte-rendu" });
  const [isEditing, setIsEditing] = useState(autoEdit && !visit.closed);
  const [editFD, setEditFD] = useState<VisitFormData>(() => { const { id, ...r } = visit; return r; });

  // ── Vérificateur de permissions unifié ──────────────────────────────────
  const canPerm = (perm: string): boolean => {
    if (permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const parts = perm.split(".");
    for (let i = 1; i < parts.length; i++) {
      if (permissions.includes(parts.slice(0, i).join("."))) return true;
    }
    return false;
  };

  // ── Accès à une section en LECTURE ──────────────────────────────────────
  // Un rôle qui peut voir les visites voit toutes les sections en lecture
  // SAUF si la section est masquée dans la FieldConfig pour ce rôle
  const currentVT = visitTypes?.find((vt) => vt.name === visit.type);
  const examCfg = currentVT?.examConfig;
  const fieldCfg = examCfg?.fieldConfig;

  const getSectionStateForCard = (section: string): "edit" | "view" | "hidden" => {
    if (canPerm("*")) return "edit";
    if (!currentVT || currentUserRoleId === undefined) return "edit";
    const rid = String(currentUserRoleId);
    const editable = currentVT.editRules?.[rid];
    const viewable = (currentVT as any).viewSections?.[rid];
    const isConfigured = editable !== undefined || viewable !== undefined;
    if (!isConfigured) return "edit"; // rôle non configuré → tout visible
    if (editable?.includes(section)) return "edit";
    if (viewable?.includes(section)) return "view";
    return "hidden";
  };

  const isSectionVisible = (section: string): boolean => {
    if (!canPerm("visits.view") && !canPerm("*")) return false;
    const state = getSectionStateForCard(section);
    if (state === "hidden") return false;
    // Vérifier si la section est activée dans le type de visite (examConfig)
    if (examCfg) {
      if (section === "clinicalExam"    && examCfg.clinicalExam?.enabled === false)         return false;
      if (section === "complaints"      && examCfg.complaints === false)                    return false;
      if (section === "physicalExam"    && examCfg.physicalExam?.enabled === false)         return false;
      if (section === "biology"         && examCfg.biology === false)                       return false;
      if (section === "functional"      && examCfg.functionalEvaluation?.enabled === false) return false;
      if (section === "diagnoses"       && examCfg.diagnoses === false)                     return false;
      if (section === "treatment"       && examCfg.treatment === false)                     return false;
      if (section === "complementary"   && examCfg.complementaryExams === false)            return false;
      if (section === "recommendations" && examCfg.recommendations === false)               return false;
    }
    return true;
  };

  // ── Résolution du niveau d'accès d'un champ (fieldConfig) ───────────────
  const getFieldLevel = (field: string): "visible" | "readonly" | "hidden" => {
    if (!fieldCfg || !fieldCfg[field]) return "visible";
    const rule = fieldCfg[field] as any;
    if (typeof rule === "string") return rule;
    const rid = currentUserRoleId !== undefined ? String(currentUserRoleId) : undefined;
    if (rid && rule.byRole?.[rid] !== undefined) return rule.byRole[rid];
    return rule.default ?? "visible";
  };

  const isFieldVisible = (field: string) => {
    // Pour la note, vérifier aussi hiddenSections
    if (field === "note") {
      const hiddenForRole = currentVT?.hiddenSections?.[String(currentUserRoleId)] ?? [];
      if (hiddenForRole.includes("note")) return false;
    }
    return getFieldLevel(field) !== "hidden";
  };

  // Résout les sections que l'utilisateur courant peut modifier pour ce type de visite
  const allowedSections = resolveAllowedSections(
    visit.type,
    currentUserRoleId,
    visitTypes,
    permissions.includes("*") // SuperAdmin a permissions=["*"]
  );
  const canEdit = (section: string) => allowedSections === "all" || (allowedSections as Set<string>).has(section);
  const canEditAnything = allowedSections === "all" || (allowedSections as Set<string>).size > 0;

  const openPrint = (doc: PrintDocType, e: React.MouseEvent) => { e.stopPropagation(); setPrintState({ open: true, doc }); };
  const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); const { id, ...r } = visit; setEditFD(r); setIsEditing(true); };
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = { ...editFD, id: visit.id, ref: visit.ref };
    onSaveEdit(saved);
    // Synchronisation automatique diagnostics → antécédents via API
    const histDx = (saved.diagnoses ?? []).filter((d: any) => d.isHistory && d.label?.trim());
    if (histDx.length > 0) {
      import("../api").then(({ medicalHistoryAPI }) => {
        medicalHistoryAPI.syncAntecedents(worker.id, histDx, visit.ref ?? "", saved.date).catch(console.error);
      });
    }
    setIsEditing(false);
  };
  const handleClose = (e: React.MouseEvent) => { e.stopPropagation(); if (window.confirm(`Clôturer la visite ${visit.type} du ${visit.date} ?`)) { onCloseVisit(visit.id); setIsEditing(false); } };
  const { badge } = getStatusStyle(visit.aptitude);
  const typeStyle = getVisitTypeStyle(visit.type);

  return (
    <>
      {printState.open && <PrintModal worker={worker} visit={visit} initialDoc={printState.doc} onClose={() => setPrintState({ open: false, doc: "compte-rendu" })} allUsers={allUsers} />}
      <div className={`overflow-hidden rounded-2xl border shadow-sm transition-all ${visit.closed ? "border-slate-200 bg-slate-50" : isOpen ? "border-medwork-cyan/40 bg-white ring-2 ring-medwork-cyan/20" : "border-slate-200 bg-white"}`}>
        <button type="button" onClick={onToggle} className={`w-full text-left transition hover:opacity-95 ${visit.closed ? "opacity-70" : ""}`}>
          {/* Bandeau coloré selon le type de visite */}
          <div className={`flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between ${visit.closed ? "bg-slate-100" : typeStyle.bg} ${typeStyle.border}`}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${visit.closed ? "bg-slate-400" : typeStyle.dot} shrink-0`} />
                <h3 className={`text-sm font-bold ${visit.closed ? "text-slate-500" : typeStyle.text}`}>{visit.type}</h3>
                {visit.ref && (
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 ring-1 ring-slate-200">
                    {visit.ref}
                  </span>
                )}
                {visit.closed && <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">🔒 Clôturé</span>}
              </div>
              <p className="mt-1 text-xs text-slate-400">Date : <span className="font-medium text-slate-600">{visit.date}</span>{isFieldVisible("doctor") && <> · Médecin : <span className="font-medium text-slate-600">{visit.doctor}</span></>}</p>
              {isFieldVisible("nextVisit") && <p className="mt-0.5 text-xs text-slate-400">Prochaine visite : <span className="font-medium text-slate-600">{visit.nextVisit}</span></p>}
            </div>
            {isFieldVisible("aptitude") && <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge}`}>{visit.aptitude}</span>}
          </div>
          {visit.note && isSectionVisible("note") && isFieldVisible("note") && <p className="border-t border-black/5 px-5 py-2.5 text-xs text-slate-500 line-clamp-2 bg-white/50">{visit.note}</p>}
        </button>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-2.5">
          {(permissions.includes("*") || permissions.includes("visits.print")) && (
            <>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Imprimer</span>
              <div className="mx-1 h-3 w-px bg-slate-300" />
              {[["compte-rendu", "🖨️ Compte rendu", "hover:bg-medwork-navy hover:text-white hover:border-medwork-navy"], ["certificat", "📄 Certificat", "hover:bg-medwork-cyan hover:text-white hover:border-medwork-cyan"], ["ordonnance", "💊 Ordonnance", "hover:bg-emerald-500 hover:text-white hover:border-emerald-500"]].map(([doc, lbl, hov]) => (
                <button key={doc} type="button" onClick={(e) => openPrint(doc as PrintDocType, e)} className={`rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition ${hov}`}>{lbl}</button>
              ))}
            </>
          )}
          {!visit.closed && (
            <>
              <div className="flex-1" />
              {/* Bouton Modifier — visible uniquement si permission visits.edit */}
              {canEditAnything && (permissions.includes("*") || permissions.some((p) => p.startsWith("visits.edit"))) ? (
                <>
                  <button type="button" onClick={handleEdit} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-500 hover:text-white hover:border-amber-500">✏️ Modifier</button>
                  {allowedSections !== "all" && (
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-200">
                      ⚠️ {(allowedSections as Set<string>).size} section{(allowedSections as Set<string>).size > 1 ? "s" : ""} autorisée{(allowedSections as Set<string>).size > 1 ? "s" : ""}
                    </span>
                  )}
                </>
              ) : canEditAnything ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-500 ring-1 ring-red-200">🔒 Lecture seule</span>
              ) : null}
              {/* Bouton Clôturer */}
              {canPerm("visits.close") && (
                <button type="button" onClick={handleClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-700 hover:text-white hover:border-slate-700">🔒 Clôturer</button>
              )}
              {/* Bouton Supprimer */}
              {canPerm("visits.delete") && onDeleteVisit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Supprimer définitivement la visite ${visit.type} du ${visit.date} ?\n\nCette action est irréversible.`)) {
                      onDeleteVisit(visit.id);
                    }
                  }}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition hover:bg-red-600 hover:text-white hover:border-red-600"
                >
                  🗑️ Supprimer
                </button>
              )}
            </>
          )}
        </div>
        {isEditing && !visit.closed && (<div className="border-t border-amber-200 bg-amber-50/30 p-5"><p className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-700">✏️ Modification — {visit.type} du {visit.date}</p><VisitFormContent formData={editFD} onChange={setEditFD} onSubmit={handleSave} onCancel={() => setIsEditing(false)} submitLabel="Enregistrer les modifications" visitTypeNames={visitTypeNames} visitTypes={visitTypes} decisions={decisions} canEdit={canEdit} permissions={permissions} examTypes={examTypes} currentUserRoleId={currentUserRoleId} /></div>)}
        {isOpen && !isEditing && (
          <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-5">
            {isSectionVisible("clinicalExam") && <div className="space-y-3"><SectionTitle title="Examen clinique" /><DetailGrid items={[{ label: "Poids (kg)", value: visit.clinicalExam.weight }, { label: "Taille (m)", value: visit.clinicalExam.height }, { label: "IMC", value: visit.clinicalExam.bmi }, { label: "Température", value: visit.clinicalExam.temperature }, { label: "TA (mmHg)", value: visit.clinicalExam.bloodPressure }, { label: "Pouls", value: visit.clinicalExam.pulse }, { label: "FR", value: visit.clinicalExam.respiratoryRate }]} /></div>}

            {isSectionVisible("complaints") && <div className="space-y-3">
              <SectionTitle title="Plaintes" />
              <div className="rounded-xl bg-white p-4 shadow-sm">
                {visit.complaints && visit.complaints.length > 0 ? (
                  <>
                    <div className="mb-2 grid grid-cols-[1fr_160px] gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Plainte</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Durée d'évolution</span>
                    </div>
                    {visit.complaints.map((c, i) => (
                      <div key={i} className="grid grid-cols-[1fr_160px] gap-3 rounded-xl border border-slate-100 px-3 py-2.5 mt-1.5">
                        <span className="text-sm font-medium text-slate-800">{fv(c.label)}</span>
                        <span className="text-sm text-slate-500">{fv(c.duration)}</span>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Aucune plainte renseignée.</p>
                )}
              </div>
            </div>}

            {isSectionVisible("physicalExam") && <div className="space-y-3"><SectionTitle title="Examen physique" /><DetailGrid items={[{ label: "ORL", value: visit.physicalExam.orl }, { label: "Digestif", value: visit.physicalExam.digestive }, { label: "Cardiologique", value: visit.physicalExam.cardiology }, { label: "Neurologique", value: visit.physicalExam.neurology }, { label: "Pulmonaire", value: visit.physicalExam.pulmonary }, { label: "Uro-génital", value: visit.physicalExam.uroGenital }, { label: "Locomoteur", value: visit.physicalExam.locomotor }, { label: "Autres", value: visit.physicalExam.others }]} /></div>}
            {isSectionVisible("biology") && <div className="space-y-3"><SectionTitle title="Biologie" /><TextBlock title="Résultats biologiques" value={visit.biology} /></div>}
            {isSectionVisible("functional") && <div className="space-y-3"><SectionTitle title="Évaluation fonctionnelle" />
              <div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">ECG</p><p className="mt-1 text-sm font-semibold text-slate-800">{fv(visit.functionalEvaluation.ecg)}</p></div><div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-400">Spirométrie</p><p className="mt-1 text-sm font-semibold text-slate-800">{fv(visit.functionalEvaluation.spirometry)}</p></div></div>
              <FunctionalGroup title="Audiogramme & protection"><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Audiogramme</p><p className="mt-1 text-sm font-semibold text-slate-800">{fv(visit.functionalEvaluation.audiogram)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Protection</p><p className="mt-1 text-sm font-semibold text-slate-800">{fv(visit.functionalEvaluation.hearingProtectionUsed)}</p></div>{visit.functionalEvaluation.hearingProtectionUsed === "Oui" && <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Type</p><p className="mt-1 text-sm font-semibold text-slate-800">{fv(visit.functionalEvaluation.hearingProtectionType)}</p></div>}</div></FunctionalGroup>
              <FunctionalGroup title="Tests visuels"><div className="grid gap-3 md:grid-cols-2"><OdOgRow label="Vision de loin" od={visit.functionalEvaluation.visualTest.distanceOD} og={visit.functionalEvaluation.visualTest.distanceOG} /><OdOgRow label="Vision de près" od={visit.functionalEvaluation.visualTest.presOD} og={visit.functionalEvaluation.visualTest.presOG} /><OdOgRow label="Vision des couleurs" od={visit.functionalEvaluation.colorVisionOD} og={visit.functionalEvaluation.colorVisionOG} /><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Correction</p><p className="mt-1 text-sm font-semibold text-slate-800">{fv(visit.functionalEvaluation.visualTest.withGlasses)}</p></div></div></FunctionalGroup>
              {visit.functionalEvaluation.imaging.length > 0 && <div className="rounded-xl bg-white p-4 shadow-sm"><p className="text-xs text-slate-400 mb-3">Imagerie</p><div className="space-y-2">{visit.functionalEvaluation.imaging.map((ex, i) => <div key={i} className="rounded-xl border border-slate-100 p-3"><p className="text-sm font-semibold text-slate-800">{fv(ex.name)}</p><p className="mt-0.5 text-xs text-slate-500">{fv(ex.result)}</p></div>)}</div></div>}
            </div>}
            {isSectionVisible("diagnoses") && <div className="space-y-3"><SectionTitle title="Diagnostics" /><div className="rounded-xl bg-white p-4 shadow-sm space-y-2">{visit.diagnoses.length > 0 ? visit.diagnoses.map((d, i) => <div key={i} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3"><span className="text-sm font-medium text-slate-800">{fv(d.label)}</span>{d.isHistory && <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">Antécédent</span>}</div>) : <p className="text-xs text-slate-400">Aucun diagnostic.</p>}</div></div>}
            {isSectionVisible("treatment") && <div className="space-y-3"><SectionTitle title="Traitement" /><div className="rounded-xl bg-white p-4 shadow-sm">{visit.treatment.length > 0 ? <><div className="mb-2 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Molécule</span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Quantité</span><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Posologie</span></div>{visit.treatment.map((t, i) => <div key={i} className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 px-3 py-2.5"><span className="text-sm font-semibold text-slate-800">{fv(t.molecule)}</span><span className="text-sm text-slate-600">{fv(t.quantity)}</span><span className="text-xs text-slate-500">{fv(t.posology)}</span></div>)}</> : <p className="text-xs text-slate-400">Aucun traitement.</p>}</div></div>}
            {isSectionVisible("complementary") && <div className="space-y-3"><SectionTitle title="Examens complémentaires" /><TextBlock title="Examens" value={visit.complementaryExams} /></div>}
            {isSectionVisible("recommendations") && <div className="space-y-3"><SectionTitle title="Recommandations" /><TextBlock title="Conseils" value={visit.recommendations} /></div>}
            {isSectionVisible("note") && visit.note && <div className="space-y-3"><SectionTitle title="Note médicale" /><TextBlock title="Note" value={visit.note} /></div>}
            {(isFieldVisible("aptitude") || isFieldVisible("restrictions")) && <div className="space-y-3"><SectionTitle title="Aptitude & restrictions" /><DetailGrid items={[...(isFieldVisible("aptitude") ? [{ label: "Aptitude", value: visit.aptitude }] : []), ...(isFieldVisible("restrictions") ? [{ label: "Restrictions", value: visit.restrictions }] : [])]} /></div>}
            {visit.closed && <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-3"><span>🔒</span><div><p className="text-sm font-semibold text-slate-600">Dossier clôturé</p><p className="text-xs text-slate-400">Cette visite ne peut plus être modifiée.</p></div></div>}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function WorkerDetailsPage({ worker, currentPage, onNavigate, onLogout, userName, userRole, userPhoto, isSuperAdmin, onUpdateStatus, visits, onAddVisit, onEditVisit, onCloseVisit, onDeleteVisit, initialOpenForm, initialEditVisitId, initialOpenVisitId, visitTypeNames, visitTypes, decisions, examTypes = [], currentUserRoleId, allUsers, permissions = [], searchData, onOpenWorker, onOpenVisit }: Props) {
  const [showForm, setShowForm] = useState(initialOpenForm ?? false);
  // Si on vient de VisitsPage avec un visitId, ouvrir cette carte
  const [openVisitId, setOpenVisitId] = useState<number | null>(
    initialEditVisitId ?? initialOpenVisitId ?? visits[0]?.id ?? null
  );
  const openVisitRef = useRef<HTMLDivElement>(null);
  const [newFD, setNewFD] = useState<VisitFormData>(emptyForm());

  // ─── Recherche et filtrage de l'historique ────────────────────────────────
  const [histSearch, setHistSearch] = useState("");
  const [histFrom,   setHistFrom]   = useState("");
  const [histTo,     setHistTo]     = useState("");

  // Quand on arrive depuis la liste des visites :
  // 1. Effacer les filtres pour s'assurer que la visite apparaît
  // 2. Scroller vers la carte après rendu
  useEffect(() => {
    const targetId = initialOpenVisitId ?? initialEditVisitId;
    if (!targetId) return;
    setHistSearch("");
    setHistFrom("");
    setHistTo("");
    let attempts = 0;
    const tryScroll = () => {
      if (openVisitRef.current) {
        openVisitRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryScroll, 150);
      }
    };
    setTimeout(tryScroll, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenVisitId, initialEditVisitId]);

  // Parse JJ/MM/AAAA → timestamp
  const parseDateStr = (s: string): number => {
    const p = s.split("/"); if (p.length !== 3) return 0;
    return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])).getTime();
  };

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Filtre texte (ref ou type)
      const q = histSearch.trim().toLowerCase();
      if (q) {
        const matchRef  = (v.ref  ?? "").toLowerCase().includes(q);
        const matchType = (v.type ?? "").toLowerCase().includes(q);
        const matchDoc  = (v.doctor ?? "").toLowerCase().includes(q);
        if (!matchRef && !matchType && !matchDoc) return false;
      }
      // Filtre période
      if (histFrom || histTo) {
        const d = parseDateStr(v.date);
        const f = histFrom ? parseDateStr(histFrom) : 0;
        const t = histTo   ? parseDateStr(histTo)   : Infinity;
        if (d < f || d > t) return false;
      }
      return true;
    });
  }, [visits, histSearch, histFrom, histTo]);

  // ─── Export PDF ───────────────────────────────────────────────────────────
  const handleHistPDF = () => {
    const rows = filteredVisits.map((v) => `
      <tr>
        <td>${v.ref ?? "—"}</td>
        <td>${v.date}</td>
        <td>${v.type}</td>
        <td>${v.doctor ?? "—"}</td>
        <td>${v.aptitude}</td>
        <td>${v.nextVisit ?? "—"}</td>
        <td>${v.closed ? "Clôturé" : "En cours"}</td>
      </tr>`).join("");
    const period = (histFrom || histTo) ? ` — ${histFrom || "…"} → ${histTo || "…"}` : "";
    const html = `
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; }
        h1 { font-size: 15px; font-weight: 800; color: #0f2d5a; margin-bottom: 2px; }
        h2 { font-size: 12px; font-weight: 600; color: #0891b2; margin-bottom: 12px; }
        p  { font-size: 10px; color: #64748b; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; text-align: left; padding: 7px 9px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 6px 9px; border-bottom: 1px solid #f1f5f9; }
        tr:nth-child(even) td { background: #f8fafc; }
        @page { margin: 14mm 12mm; }
      </style>
      <h1>Historique des visites médicales</h1>
      <h2>${worker.name} · ${worker.matricule} · ${worker.position}</h2>
      <p>Exporté le ${new Date().toLocaleDateString("fr-FR")}${period} · ${filteredVisits.length} visite(s)</p>
      <table>
        <thead><tr>
          <th>Référence</th><th>Date</th><th>Type de visite</th><th>Médecin</th>
          <th>Aptitude</th><th>Prochaine visite</th><th>Statut</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close(); }, 500); }
  };

  // ─── Export Excel ─────────────────────────────────────────────────────────
  const handleHistExcel = () => {
    const bom = "\uFEFF";
    const header = ["Référence", "Date", "Type de visite", "Médecin", "Aptitude", "Prochaine visite", "Statut"];
    const rows = filteredVisits.map((v) => [
      v.ref ?? "—", v.date, v.type, v.doctor ?? "—",
      v.aptitude, v.nextVisit ?? "—", v.closed ? "Clôturé" : "En cours",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([bom + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `visites_${worker.matricule}_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.csv`;
    a.click();
  };

  // Notifie App.tsx du nouveau statut déduit des visites
  const syncStatus = (updatedVisits: Visit[]) => {
    if (!worker) return;
    const newStatus = deriveStatusFromVisits(updatedVisits);
    if (newStatus && newStatus !== worker.status) {
      onUpdateStatus(worker.id, newStatus);
    }
  };

  const handleAddVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFD.date) { alert("La date de la visite est obligatoire."); return; }
    const ref = generateVisitRef(visits.map((v) => v.ref ?? ""));
    const v: WorkerVisit = { id: Date.now(), ref, ...newFD, restrictions: newFD.restrictions || "Aucune", nextVisit: newFD.nextVisit || "Non définie", diagnoses: newFD.diagnoses.filter((d) => d.label.trim() !== ""), treatment: newFD.treatment.filter((t) => t.molecule.trim() !== ""), closed: false, workerId: worker!.id };
    onAddVisit(v);
    // Synchronisation automatique diagnostics → antécédents via API
    const histDx = v.diagnoses.filter((d) => d.isHistory && d.label?.trim());
    if (histDx.length > 0) {
      import("../api").then(({ medicalHistoryAPI }) => {
        medicalHistoryAPI.syncAntecedents(worker!.id, histDx, ref, v.date).catch(console.error);
      });
    }
    syncStatus([v, ...visits]);
    setOpenVisitId(v.id);
    setShowForm(false);
    setNewFD(emptyForm());
  };

  if (!worker) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><button onClick={() => onNavigate("workers")} className="rounded-xl bg-medwork-cyan px-4 py-2 text-white">← Retour aux travailleurs</button></div>;
  }

  const initials = worker.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  const { badge: workerBadge, dot: workerDot } = getStatusStyle(worker.status);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          title={worker.name}
          subtitle={`${worker.matricule} · ${worker.position}`}
          onNavigate={onNavigate}
          left={
            <button
              onClick={() => onNavigate("workers")}
              title="Retour aux travailleurs"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-medwork-cyan hover:text-medwork-cyan"
            >
              <Icon d={icons.arrowLeft} size={15} />
            </button>
          }
          searchData={searchData}
          permissions={permissions}
          isSuperAdmin={isSuperAdmin}
          onOpenWorker={onOpenWorker}
          onOpenVisit={onOpenVisit}
        />

        <main className="flex-1 overflow-hidden flex">
          {/* ── Panneau gauche : sticky avec scroll interne ─────────────────── */}
          <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 space-y-4"
            style={{ height: "100%", position: "sticky", top: 0 }}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-medwork-navy px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-medwork-cyan text-sm font-bold text-white ring-2 ring-white/20">{initials}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{worker.name}</p>
                      <p className="text-[11px] text-cyan-300">{worker.matricule}</p>
                    </div>
                  </div>
                  {/* Statut du contrat — juste sous le nom */}
                  <div className="mt-2 mb-1">
                    {worker.contractStatus === "embauche" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-200 ring-1 ring-inset ring-blue-400/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                        En cours d'embauche
                      </span>
                    ) : worker.contractStatus === "fin_contrat" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-600/40 px-2.5 py-1 text-xs font-semibold text-slate-300 ring-1 ring-inset ring-slate-500/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Fin de contrat
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-semibold text-green-300 ring-1 ring-inset ring-green-400/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        En activité
                      </span>
                    )}
                  </div>
                  {/* Aptitude en cours */}
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${workerBadge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${workerDot}`} />
                      {worker.status}
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {[["Entreprise", worker.company], ["Département", worker.department], ["Poste", worker.position], ["Résidence", worker.residence || "—"], ["Dernière visite", worker.lastVisit]].map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between px-4 py-2.5"><span className="text-xs text-slate-400">{l}</span><span className="text-xs font-semibold text-slate-700">{v}</span></div>
                  ))}
                </div>
              </div>
              {/* Antécédents — médecin uniquement (secret médical) */}
              {(isSuperAdmin || permissions.includes("*") || permissions.includes("medical.antecedents")) && (
                <AntecedentsCard workerId={worker.id} />
              )}
              {/* Vaccinations */}
              {(isSuperAdmin || permissions.includes("*") || permissions.includes("medical.vaccinations")) && (
                <VaccinationsCard workerId={worker.id} />
              )}
              {/* Expositions */}
              {(isSuperAdmin || permissions.includes("*") || permissions.includes("medical.expositions")) && (
                <ExpositionsCard workerId={worker.id} />
              )}
              {/* Groupage sanguin */}
              <BloodGroupCard worker={worker} onUpdate={(bg) => {}} />

              {/* Parcours professionnel */}
              <ProfessionalHistoryCard worker={worker} onUpdate={(h) => {}} />

              {/* Dernières visites */}
              {(isSuperAdmin || permissions.includes("*") || permissions.includes("medical.lastvisits") || permissions.includes("visits.view")) && (
                <SideCard title="Dernières visites" icon="🗓️">
                  <InfoRow label="Dernière visite" value={worker.lastVisit} />
                  <InfoRow label="Aptitude" value={worker.status} badge />
                </SideCard>
              )}
            </aside>

          {/* ── Panneau droit : scroll principal ─────────────────────────────── */}
          <section className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Informations générales</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[["Nom complet", worker.name], ["Matricule", worker.matricule], ["Statut médical", worker.status], ["Statut contrat", worker.contractStatus === "embauche" ? "En cours d'embauche" : worker.contractStatus === "fin_contrat" ? "Fin de contrat" : "En activité"], ["Entreprise", worker.company], ["Département", worker.department], ["Poste", worker.position], ["Résidence", worker.residence || "—"]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-slate-50 p-3.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-1 text-sm font-semibold text-slate-800">{v}</p></div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* En-tête : titre + bouton nouvelle visite */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Historique des visites médicales</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {filteredVisits.length !== visits.length
                        ? `${filteredVisits.length} sur ${visits.length} visite${visits.length > 1 ? "s" : ""}`
                        : `${visits.length} visite${visits.length > 1 ? "s" : ""} enregistrée${visits.length > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Export */}
                    <div className="relative group">
                      <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition">
                        <Icon d={icons.download} size={13} />
                        Exporter
                      </button>
                      <div className="absolute right-0 top-full mt-1 z-20 hidden w-40 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden group-hover:block">
                        <button onClick={handleHistPDF} className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-red-50 hover:text-red-600 transition">📄 Export PDF</button>
                        <button onClick={handleHistExcel} className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-green-50 hover:text-green-600 border-t border-slate-100 transition">📊 Export Excel</button>
                      </div>
                    </div>
                    {(permissions.includes("*") || isSuperAdmin || permissions.includes("visits.create")) && (
                      <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-medwork-cyan px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition">
                        {showForm ? "— Annuler" : "+ Nouvelle visite"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Barre de recherche + filtres */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  {/* Recherche */}
                  <div className="relative flex-1 min-w-[160px]">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon d={icons.search} size={13} />
                    </span>
                    <input
                      type="text" value={histSearch} onChange={(e) => setHistSearch(e.target.value)}
                      placeholder="Recherche ref., type, médecin…"
                      className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-3 text-xs outline-none focus:border-medwork-cyan focus:ring-1 focus:ring-medwork-cyan/20"
                    />
                    {histSearch && (
                      <button onClick={() => setHistSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                    )}
                  </div>
                  {/* Date début */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Du</span>
                    <DatePicker value={histFrom} onChange={setHistFrom} />
                  </div>
                  {/* Date fin */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Au</span>
                    <DatePicker value={histTo} onChange={setHistTo} />
                  </div>
                  {/* Reset filtres */}
                  {(histSearch || histFrom || histTo) && (
                    <button onClick={() => { setHistSearch(""); setHistFrom(""); setHistTo(""); }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition">
                      ✕ Effacer
                    </button>
                  )}
                </div>

                {/* Formulaire nouvelle visite */}
                <div className="px-5">
                  {showForm && (
                    <div className="my-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-medwork-navy">Nouvelle visite médicale</p>
                      <VisitFormContent formData={newFD} onChange={setNewFD} onSubmit={handleAddVisit} onCancel={() => { setShowForm(false); setNewFD(emptyForm()); }} submitLabel="Enregistrer la visite" visitTypeNames={visitTypeNames} visitTypes={visitTypes} decisions={decisions} permissions={permissions} examTypes={examTypes} currentUserRoleId={currentUserRoleId} />
                    </div>
                  )}

                  {/* Liste des visites filtrées */}
                  <div className="space-y-3 py-4">
                    {filteredVisits.length === 0 ? (
                      <div className="rounded-xl bg-slate-50 px-5 py-10 text-center">
                        <p className="text-slate-400 text-sm">
                          {visits.length === 0
                            ? "Aucune visite enregistrée pour ce travailleur."
                            : "Aucune visite ne correspond aux critères de recherche."}
                        </p>
                        {(histSearch || histFrom || histTo) && (
                          <button onClick={() => { setHistSearch(""); setHistFrom(""); setHistTo(""); }}
                            className="mt-3 text-xs text-medwork-cyan hover:underline">
                            Effacer les filtres
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredVisits.map((visit) => {
                        const isTarget = visit.id === (initialOpenVisitId ?? initialEditVisitId);
                        return (
                          <div key={visit.id} ref={isTarget ? openVisitRef : undefined}>
                            <VisitCard visit={visit} worker={worker} isOpen={openVisitId === visit.id} onToggle={() => setOpenVisitId((p) => p === visit.id ? null : visit.id)} onSaveEdit={(v) => { const wv: WorkerVisit = { ...v, workerId: worker.id }; onEditVisit(wv); syncStatus(visits.map((x) => x.id === v.id ? wv : x)); }} onCloseVisit={(id) => { onCloseVisit(id); syncStatus(visits.map((x) => x.id === id ? { ...x, closed: true } : x)); }} onDeleteVisit={onDeleteVisit} autoEdit={initialEditVisitId === visit.id} visitTypeNames={visitTypeNames} visitTypes={visitTypes} decisions={decisions} examTypes={examTypes} currentUserRoleId={currentUserRoleId} allUsers={allUsers} permissions={permissions} />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>
        </main>
      </div>
    </div>
  );
}
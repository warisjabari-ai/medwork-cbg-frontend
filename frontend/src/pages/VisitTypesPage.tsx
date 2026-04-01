import { useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldAccessLevel = "visible" | "readonly" | "hidden";

export type FieldConfig = {
  aptitude:       FieldAccessLevel;
  nextVisit:      FieldAccessLevel;
  restrictions:   FieldAccessLevel;
  note:           FieldAccessLevel;
  doctor:         FieldAccessLevel;
  aptitudeDoctor: FieldAccessLevel;
};

// Pour rétrocompatibilité
export type FieldRuleConfig = { default: FieldAccessLevel; byRole?: Record<string, FieldAccessLevel> };
export function resolveFieldLevel(fc: any, field: string): FieldAccessLevel { return (fc?.[field] as any) ?? "visible"; }


export type ExamConfig = {
  clinicalExam: {
    enabled: boolean;
    fields: {
      weight: boolean; height: boolean; temperature: boolean;
      bloodPressure: boolean; pulse: boolean; respiratoryRate: boolean;
    };
  };
  complaints: boolean;
  physicalExam: {
    enabled: boolean;
    fields: {
      orl: boolean; digestive: boolean; cardiology: boolean;
      neurology: boolean; pulmonary: boolean; uroGenital: boolean;
      locomotor: boolean; others: boolean;
    };
  };
  biology: boolean;
  functionalEvaluation: {
    enabled: boolean;
    ecg: boolean;
    spirometry: boolean;
    audiogram: boolean;
    visualTest: boolean;
    imaging: boolean;
  };
  diagnoses: boolean;
  treatment: boolean;
  complementaryExams: boolean;
  recommendations: boolean;
  // Configuration des champs principaux
  fieldConfig: FieldConfig;
};

export type VisitType = {
  id: number;
  name: string;
  description: string;
  periodicity: string;
  mandatory: boolean;
  examConfig: ExamConfig;
  editRules:     Record<string, string[]>; // ✏️ sections modifiables par rôle
  viewSections:  Record<string, string[]>; // 👁 sections visibles (lecture seule) par rôle
  hiddenSections:Record<string, string[]>; // non utilisé (calculé = absent des deux)
  examTypeIds: number[];
};

// Toutes les sections modifiables d'une visite
export const EDIT_SECTIONS = [
  { key: "info",            label: "Infos générales",          description: "Date, médecin, type, note" },
  { key: "clinicalExam",    label: "Examen clinique",           description: "Poids, taille, TA, pouls…" },
  { key: "complaints",      label: "Plaintes",                  description: "Plaintes du travailleur" },
  { key: "physicalExam",    label: "Examen physique",           description: "ORL, digestif, cardio…" },
  { key: "biology",         label: "Biologie",                  description: "Résultats biologiques" },
  { key: "functional",      label: "Évaluation fonctionnelle",  description: "ECG, spirométrie, audiogramme, tests visuels, imagerie" },
  { key: "diagnoses",       label: "Diagnostics",               description: "Résumé syndromique et diagnostics" },
  { key: "treatment",       label: "Traitement / Ordonnance",   description: "Prescriptions médicamenteuses" },
  { key: "complementary",   label: "Examens complémentaires",   description: "Examens demandés" },
  { key: "recommendations", label: "Recommandations",           description: "Conseils au travailleur" },
  { key: "aptitude",        label: "Aptitude / Décision",       description: "Décision médicale et restrictions" },
] as const;

// Règles par défaut : tout le monde peut tout modifier
export function defaultEditRules(): Record<string, string[]> {
  return {};
}

// Config par défaut : tout activé
export function defaultExamConfig(): ExamConfig {
  return {
    clinicalExam: {
      enabled: true,
      fields: { weight: true, height: true, temperature: true, bloodPressure: true, pulse: true, respiratoryRate: true },
    },
    complaints: true,
    physicalExam: {
      enabled: true,
      fields: { orl: true, digestive: true, cardiology: true, neurology: true, pulmonary: true, uroGenital: true, locomotor: true, others: true },
    },
    biology: true,
    functionalEvaluation: { enabled: true, ecg: true, spirometry: true, audiogram: true, visualTest: true, imaging: true },
    diagnoses: true,
    treatment: true,
    complementaryExams: true,
    recommendations: true,
    fieldConfig: {
      aptitude:       "visible",
      nextVisit:      "visible",
      restrictions:   "visible",
      note:           "visible",
      doctor:         "visible",
      aptitudeDoctor: "visible",
    } as FieldConfig,
  };
}

// ─── Props page ───────────────────────────────────────────────────────────────
type Props = {
  visitTypes?: VisitType[];
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
  onAdd: (vt: VisitType) => void;
  onEdit: (vt: VisitType) => void;
  onDelete: (id: number) => void;
  roles: { id: number; name: string }[];
  examTypes?: import("./ExamTypesPage").ExamType[];
};

// ─── Constantes d'affichage ────────────────────────────────────────────────────
const PERIODICITIES = ["À la demande", "3 mois", "6 mois", "Annuelle", "Tous les 2 ans", "Tous les 3 ans", "Tous les 5 ans", "Unique"];

const CLINICAL_FIELDS: { key: keyof ExamConfig["clinicalExam"]["fields"]; label: string }[] = [
  { key: "weight",          label: "Poids" },
  { key: "height",          label: "Taille / IMC" },
  { key: "temperature",     label: "Température" },
  { key: "bloodPressure",   label: "Tension artérielle" },
  { key: "pulse",           label: "Pouls" },
  { key: "respiratoryRate", label: "Fréquence respiratoire" },
];

const PHYSICAL_FIELDS: { key: keyof ExamConfig["physicalExam"]["fields"]; label: string }[] = [
  { key: "orl",       label: "ORL" },
  { key: "digestive", label: "Appareil digestif" },
  { key: "cardiology",label: "Appareil cardiologique" },
  { key: "neurology", label: "Appareil neurologique" },
  { key: "pulmonary", label: "Appareil pulmonaire" },
  { key: "uroGenital",label: "Appareil uro-génital" },
  { key: "locomotor", label: "Appareil locomoteur" },
  { key: "others",    label: "Autres" },
];

const FUNCTIONAL_FIELDS: { key: keyof Omit<ExamConfig["functionalEvaluation"], "enabled">; label: string }[] = [
  { key: "ecg",         label: "ECG" },
  { key: "spirometry",  label: "Spirométrie" },
  { key: "audiogram",   label: "Audiogramme & protection auditive" },
  { key: "visualTest",  label: "Tests visuels" },
  { key: "imaging",     label: "Imagerie" },
];

// ─── Checkbox utilitaires ─────────────────────────────────────────────────────
function Check({ checked, onChange, label, indent = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; indent?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 ${indent ? "ml-4" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded accent-medwork-cyan"
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function SectionToggle({ enabled, onToggle, label, icon }: { enabled: boolean; onToggle: (v: boolean) => void; label: string; icon: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition
      ${enabled ? "border-medwork-cyan bg-cyan-50" : "border-slate-200 bg-slate-50 opacity-60"}`}
    >
      <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 rounded accent-medwork-cyan" />
      <span className="text-sm">{icon}</span>
      <span className={`text-sm font-semibold ${enabled ? "text-medwork-navy" : "text-slate-500"}`}>{label}</span>
    </label>
  );
}

// ─── Configurateur d'examens ──────────────────────────────────────────────────
function ExamConfigurator({ config, onChange }: { config: ExamConfig; onChange: (c: ExamConfig) => void }) {
  const set = (patch: Partial<ExamConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
        Sections d'examen incluses dans ce type de visite
      </p>

      <div className="grid gap-3 md:grid-cols-2">

        {/* Examen clinique */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.clinicalExam.enabled}
            onToggle={(v) => set({ clinicalExam: { ...config.clinicalExam, enabled: v } })}
            label="Examen clinique"
            icon="🩺"
          />
          {config.clinicalExam.enabled && (
            <div className="mt-3 ml-1 space-y-0.5 border-l-2 border-cyan-100 pl-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Paramètres inclus</p>
              {CLINICAL_FIELDS.map(({ key, label }) => (
                <Check
                  key={key}
                  checked={config.clinicalExam.fields[key]}
                  onChange={(v) => set({ clinicalExam: { ...config.clinicalExam, fields: { ...config.clinicalExam.fields, [key]: v } } })}
                  label={label}
                />
              ))}
            </div>
          )}
        </div>

        {/* Plaintes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.complaints}
            onToggle={(v) => set({ complaints: v })}
            label="Plaintes du travailleur"
            icon="💬"
          />
        </div>

        {/* Examen physique */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.physicalExam.enabled}
            onToggle={(v) => set({ physicalExam: { ...config.physicalExam, enabled: v } })}
            label="Examen physique"
            icon="🫀"
          />
          {config.physicalExam.enabled && (
            <div className="mt-3 ml-1 space-y-0.5 border-l-2 border-cyan-100 pl-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Appareils inclus</p>
              {PHYSICAL_FIELDS.map(({ key, label }) => (
                <Check
                  key={key}
                  checked={config.physicalExam.fields[key]}
                  onChange={(v) => set({ physicalExam: { ...config.physicalExam, fields: { ...config.physicalExam.fields, [key]: v } } })}
                  label={label}
                />
              ))}
            </div>
          )}
        </div>

        {/* Biologie */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.biology}
            onToggle={(v) => set({ biology: v })}
            label="Biologie"
            icon="🧪"
          />
        </div>

        {/* Évaluation fonctionnelle */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
          <SectionToggle
            enabled={config.functionalEvaluation.enabled}
            onToggle={(v) => set({ functionalEvaluation: { ...config.functionalEvaluation, enabled: v } })}
            label="Évaluation fonctionnelle"
            icon="📊"
          />
          {config.functionalEvaluation.enabled && (
            <div className="mt-3 grid gap-0.5 grid-cols-2 ml-1 border-l-2 border-cyan-100 pl-3 md:grid-cols-3">
              <p className="col-span-2 md:col-span-3 mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Examens inclus</p>
              {FUNCTIONAL_FIELDS.map(({ key, label }) => (
                <Check
                  key={key}
                  checked={config.functionalEvaluation[key] as boolean}
                  onChange={(v) => set({ functionalEvaluation: { ...config.functionalEvaluation, [key]: v } })}
                  label={label}
                />
              ))}
            </div>
          )}
        </div>

        {/* Diagnostics */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.diagnoses}
            onToggle={(v) => set({ diagnoses: v })}
            label="Résumé syndromique / Diagnostics"
            icon="🔬"
          />
        </div>

        {/* Traitement */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.treatment}
            onToggle={(v) => set({ treatment: v })}
            label="Traitement / Ordonnance"
            icon="💊"
          />
        </div>

        {/* Examens complémentaires */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.complementaryExams}
            onToggle={(v) => set({ complementaryExams: v })}
            label="Examens complémentaires"
            icon="📋"
          />
        </div>

        {/* Recommandations */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SectionToggle
            enabled={config.recommendations}
            onToggle={(v) => set({ recommendations: v })}
            label="Recommandations / Conseils"
            icon="📝"
          />
        </div>

      </div>
    </div>
  );
}

// ─── Formulaire type de visite ────────────────────────────────────────────────
// ─── Configurateur droits d'édition ──────────────────────────────────────────
function EditRulesConfigurator({
  rules,
  roles,
  onChange,
}: {
  rules: Record<string, string[]>;
  roles: { id: number; name: string }[];
  onChange: (r: Record<string, string[]>) => void;
}) {
  const allSectionKeys = EDIT_SECTIONS.map((s) => s.key);

  // Récupère les sections autorisées pour un rôle
  // Absence de clé = tout autorisé (comportement par défaut)
  const getSections = (roleId: string) =>
    roleId in rules ? rules[roleId] : allSectionKeys;

  const isAllowed = (roleId: string, sectionKey: string) =>
    getSections(roleId).includes(sectionKey);

  const isAllSections = (roleId: string) =>
    allSectionKeys.every((k) => isAllowed(roleId, k));

  const toggleSection = (roleId: string, sectionKey: string) => {
    const current = getSections(roleId);
    const next = current.includes(sectionKey)
      ? current.filter((k) => k !== sectionKey)
      : [...current, sectionKey];
    onChange({ ...rules, [roleId]: next });
  };

  const toggleAll = (roleId: string, allOn: boolean) => {
    onChange({ ...rules, [roleId]: allOn ? allSectionKeys : [] });
  };

  if (roles.length === 0) {
    return <p className="text-xs text-slate-400">Aucun rôle défini. Créez des rôles dans Paramètres → Rôles.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3">
        <span className="mt-0.5 text-medwork-cyan">ℹ️</span>
        <p className="text-xs text-cyan-800">
          Configurez ici quelles sections de la visite chaque rôle peut <strong>modifier</strong>.
          Par défaut, tous les rôles peuvent tout modifier. Décochez pour restreindre.
        </p>
      </div>

      <div className="space-y-3">
        {roles.map((role) => {
          const roleId = String(role.id);
          const allOn = isAllSections(roleId);
          const sections = getSections(roleId);
          const count = sections.length;

          return (
            <div key={role.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {/* En-tête du rôle */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-medwork-navy">{role.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset
                    ${count === allSectionKeys.length ? "bg-green-50 text-green-700 ring-green-200"
                    : count === 0 ? "bg-red-50 text-red-700 ring-red-200"
                    : "bg-orange-50 text-orange-700 ring-orange-200"}`}>
                    {count === allSectionKeys.length ? "✓ Accès complet"
                     : count === 0 ? "✗ Lecture seule"
                     : `${count}/${allSectionKeys.length} sections`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAll(roleId, true)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100"
                  >
                    Tout autoriser
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAll(roleId, false)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100"
                  >
                    Tout bloquer
                  </button>
                </div>
              </div>

              {/* Grille des sections */}
              <div className="grid grid-cols-2 gap-0 divide-y divide-slate-50 md:grid-cols-3">
                {EDIT_SECTIONS.map((section) => {
                  const allowed = isAllowed(roleId, section.key);
                  return (
                    <label
                      key={section.key}
                      className={`flex cursor-pointer items-start gap-2.5 px-4 py-2.5 transition
                        ${allowed ? "hover:bg-green-50/50" : "bg-slate-50/80 hover:bg-red-50/40"}`}
                    >
                      <input
                        type="checkbox"
                        checked={allowed}
                        onChange={() => toggleSection(roleId, section.key)}
                        className="mt-0.5 h-4 w-4 rounded accent-medwork-cyan"
                      />
                      <span>
                        <p className={`text-xs font-semibold ${allowed ? "text-slate-700" : "text-slate-400 line-through"}`}>
                          {section.label}
                        </p>
                        <p className="text-[10px] text-slate-400">{section.description}</p>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Matrice de permissions par champ et par rôle ────────────────────────────
const SECTION_LABELS: { key: string; label: string }[] = [
  { key: "info",            label: "Infos générales (date, type)" },
  { key: "clinicalExam",    label: "Examen clinique" },
  { key: "complaints",      label: "Plaintes" },
  { key: "physicalExam",    label: "Examen physique" },
  { key: "biology",         label: "Biologie" },
  { key: "functional",      label: "Évaluation fonctionnelle" },
  { key: "diagnoses",       label: "Diagnostics" },
  { key: "treatment",       label: "Traitement / Ordonnance" },
  { key: "complementary",   label: "Examens complémentaires" },
  { key: "recommendations", label: "Recommandations" },
  { key: "aptitude",        label: "Aptitude / Décision médicale" },
  { key: "note",            label: "Note médicale" },
  { key: "doctor",          label: "Médecin consultant" },
  { key: "aptitudeDoctor",  label: "Médecin décision aptitude" },
];

// ✏️ = dans editRules    → peut voir ET modifier
// 👁  = dans viewSections  → peut voir uniquement
// — (aucun) = absent des deux → ne peut pas voir
type SectionState = "edit" | "view" | "hidden";

function FieldPermissionMatrix({
  editRules,
  viewSections,
  roles,
  onChange,
}: {
  editRules:    Record<string, string[]>;
  viewSections: Record<string, string[]>;
  roles: { id: number; name: string }[];
  onChange: (er: Record<string, string[]>, vs: Record<string, string[]>) => void;
}) {
  const getState = (roleId: string, section: string): SectionState => {
    if (editRules[roleId]?.includes(section))    return "edit";
    if (viewSections[roleId]?.includes(section)) return "view";
    return "hidden";
  };

  const setState = (roleId: string, section: string, clicked: "edit" | "view") => {
    const current = getState(roleId, section);
    const newRules = { ...editRules,    [roleId]: [...(editRules[roleId]    ?? [])] };
    const newView  = { ...viewSections, [roleId]: [...(viewSections[roleId] ?? [])] };

    // Cliquer sur un bouton déjà actif → passe en "hidden" (aucun coché)
    // Cliquer sur un bouton inactif → active ce bouton, désactive l'autre
    if (clicked === "edit") {
      if (current === "edit") {
        // Désactiver → hidden
        newRules[roleId] = newRules[roleId].filter(s => s !== section);
      } else {
        // Activer ✏️ : retirer de view, ajouter à edit
        newView[roleId]  = newView[roleId].filter(s => s !== section);
        if (!newRules[roleId].includes(section)) newRules[roleId].push(section);
      }
    } else { // clicked === "view"
      if (current === "view") {
        // Désactiver → hidden
        newView[roleId] = newView[roleId].filter(s => s !== section);
      } else {
        // Activer 👁 : retirer de edit, ajouter à view
        newRules[roleId] = newRules[roleId].filter(s => s !== section);
        if (!newView[roleId].includes(section)) newView[roleId].push(section);
      }
    }
    onChange(newRules, newView);
  };

  if (roles.length === 0) {
    return <p className="text-xs text-slate-400 italic">Aucun rôle configuré.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <div className="w-52 shrink-0 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Section</div>
        {roles.map((r) => (
          <div key={r.id} className="flex-1 border-l border-slate-100 px-2 py-3 text-center min-w-[130px]">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600 truncate">{r.name}</p>
            <div className="mt-1 flex justify-center gap-3 text-[9px] text-slate-400">
              <span>✏️</span><span>👁</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lignes */}
      {SECTION_LABELS.map(({ key, label }) => (
        <div key={key} className="flex items-center border-t border-slate-100 hover:bg-slate-50/40">
          <div className="w-52 shrink-0 px-4 py-2.5">
            <p className="text-xs font-semibold text-slate-700">{label}</p>
          </div>
          {roles.map((r) => {
            const rid   = String(r.id);
            const state = getState(rid, key);
            return (
              <div key={r.id} className="flex flex-1 items-center justify-center gap-3 border-l border-slate-100 py-2.5 min-w-[130px]">
                {/* ✏️ Voir & modifier */}
                <button
                  type="button"
                  title={state === "edit" ? "Cliquer pour désactiver" : "Voir & modifier"}
                  onClick={() => setState(rid, key, "edit")}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition select-none
                    ${state === "edit"
                      ? "bg-green-100 ring-2 ring-green-400 shadow-sm"
                      : "bg-slate-100 opacity-30 hover:opacity-60 hover:bg-green-50"}`}
                >
                  ✏️
                </button>
                {/* 👁 Voir uniquement */}
                <button
                  type="button"
                  title={state === "view" ? "Cliquer pour désactiver" : "Voir uniquement"}
                  onClick={() => setState(rid, key, "view")}
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition select-none
                    ${state === "view"
                      ? "bg-amber-100 ring-2 ring-amber-400 shadow-sm"
                      : "bg-slate-100 opacity-30 hover:opacity-60 hover:bg-amber-50"}`}
                >
                  👁
                </button>
                {/* Indicateur d'état */}
                {state === "hidden" && (
                  <span className="text-[9px] text-slate-300 font-semibold">🚫</span>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-5 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-green-100 ring-1 ring-green-300">✏️</span>
          Voir &amp; modifier
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 ring-1 ring-amber-300">👁</span>
          Voir uniquement
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-slate-300">🚫</span>
          Ne pas voir (aucun coché)
        </span>
      </div>
    </div>
  );
}
// ─── Barre de recherche d'examens biologiques ─────────────────────────────────
function ExamSearchBar({
  examTypes,
  selectedIds,
  onAdd,
}: {
  examTypes: import("./ExamTypesPage").ExamType[];
  selectedIds: number[];
  onAdd: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Afficher tous les examens disponibles ou filtrer par recherche
  const available = examTypes.filter(
    (et) => !selectedIds.includes(et.id) &&
    (search.trim() === "" || et.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Afficher le dropdown dès qu'il y a du focus (même sans texte)
  const showDropdown = open && examTypes.length > 0;

  return (
    <div className="relative" style={{ zIndex: showDropdown ? 40 : "auto" }}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon d={icons.search} size={13} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={examTypes.length === 0
            ? "Aucun examen configuré — allez dans Types d'examens d'abord"
            : `Rechercher parmi ${examTypes.length} examen(s)…`}
          disabled={examTypes.length === 0}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-4 text-sm outline-none focus:border-medwork-cyan focus:ring-2 focus:ring-medwork-cyan/20 disabled:opacity-50"
        />
      </div>
      {showDropdown && available.length > 0 && (
        <div
          className="absolute left-0 right-0 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          style={{ zIndex: 9999, top: "100%" }}
        >
          <div className="max-h-56 overflow-y-auto">
            {available.slice(0, 10).map((et) => (
              <button
                key={et.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onAdd(et.id); setSearch(""); setOpen(false); }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-cyan-50 transition border-b border-slate-50 last:border-0"
              >
                <span className="font-semibold text-slate-700">{et.name}</span>
                <span className="text-xs text-slate-400 ml-2 shrink-0">
                  {et.valueType === "numeric"
                    ? `${et.normalMin ?? "—"} – ${et.normalMax ?? "—"} ${et.unit ?? ""}`
                    : (et.normalValues ?? []).join(" / ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      {showDropdown && search.trim().length > 0 && available.length === 0 && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl"
          style={{ zIndex: 9999, top: "100%" }}
        >
          <p className="text-sm text-slate-400">Aucun examen trouvé pour « {search} »</p>
        </div>
      )}
    </div>
  );
}

function VisitTypeForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
  roles,
  examTypes = [],
}: {
  initial: Omit<VisitType, "id">;
  onSave: (data: Omit<VisitType, "id">) => void;
  onCancel: () => void;
  submitLabel: string;
  roles: { id: number; name: string }[];
  examTypes?: import("./ExamTypesPage").ExamType[];
}) {
  const [form, setForm] = useState({ ...initial, examTypeIds: initial.examTypeIds ?? [], editRules: initial.editRules ?? {}, viewSections: (initial as any).viewSections ?? {}, hiddenSections: (initial as any).hiddenSections ?? {} });
  const [showExamConfig, setShowExamConfig] = useState(false);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [showExamSelector, setShowExamSelector] = useState(false);
  const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  const toggleExam = (id: number) => {
    setForm((f) => ({
      ...f,
      examTypeIds: f.examTypeIds.includes(id)
        ? f.examTypeIds.filter((x) => x !== id)
        : [...f.examTypeIds, id],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Le nom est obligatoire."); return; }
    onSave(form);
  };

  // Compte les sections actives
  const cfg = form.examConfig;
  const activeSections = [
    cfg.clinicalExam.enabled, cfg.complaints, cfg.physicalExam.enabled,
    cfg.biology, cfg.functionalEvaluation.enabled,
    cfg.diagnoses, cfg.treatment, cfg.complementaryExams, cfg.recommendations,
  ].filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Infos de base */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={lbl}>Nom du type *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Visite périodique" className={inp} />
        </div>
        <div>
          <label className={lbl}>Périodicité</label>
          <select value={form.periodicity} onChange={(e) => setForm({ ...form, periodicity: e.target.value })} className={inp}>
            {PERIODICITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={lbl}>Description</label>
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description courte…" className={inp} />
        </div>
        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
            <input type="checkbox" checked={form.mandatory} onChange={(e) => setForm({ ...form, mandatory: e.target.checked })} className="h-4 w-4 rounded accent-medwork-cyan" />
            <span className="text-sm font-medium text-slate-700">Visite imposée par la réglementation</span>
          </label>
        </div>
      </div>

      {/* Configurateur examens — accordéon */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExamConfig((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">🔧</span>
            <div>
              <p className="text-sm font-bold text-medwork-navy">Configuration des examens</p>
              <p className="text-xs text-slate-400">
                {activeSections} section{activeSections > 1 ? "s" : ""} active{activeSections > 1 ? "s" : ""} sur 9
              </p>
            </div>
          </div>
          <Icon d={showExamConfig ? icons.chevUp : icons.chevDown} size={16} />
        </button>

        {showExamConfig && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-5">
            <ExamConfigurator
              config={form.examConfig}
              onChange={(c) => setForm({ ...form, examConfig: c })}
            />
          </div>
        )}
      </div>

      {/* ── Permissions par rôle (sections + champs) ── */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFieldConfig((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">🔐</span>
            <div>
              <p className="text-sm font-bold text-medwork-navy">Droits d'édition par rôle</p>
              <p className="text-xs text-slate-400">
                Définir quelles sections chaque rôle peut modifier
              </p>
            </div>
          </div>
          <Icon d={showFieldConfig ? icons.chevUp : icons.chevDown} size={16} />
        </button>

        {showFieldConfig && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
            <p className="mb-3 text-xs text-slate-500">
              La colonne <strong>Défaut</strong> s'applique aux rôles non listés.
              ✏️ = Peut modifier · 👁 = Peut voir uniquement
            </p>
            <FieldPermissionMatrix
              editRules={form.editRules ?? {}}
              viewSections={form.viewSections ?? {}}
              roles={roles}
              onChange={(newEr, newVs) => setForm({ ...form, editRules: newEr, viewSections: newVs })}
            />
          </div>
        )}
      </div>

      {/* ── Examens biologiques par défaut ── */}
      <div className="rounded-2xl border border-slate-200" style={{ overflow: "visible" }}>
        <button
          type="button"
          onClick={() => setShowExamSelector((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">🔬</span>
            <div>
              <p className="text-sm font-bold text-medwork-navy">Examens biologiques par défaut</p>
              <p className="text-xs text-slate-400">
                {form.examTypeIds.length > 0
                  ? `${form.examTypeIds.length} examen${form.examTypeIds.length > 1 ? "s" : ""} prédéfini${form.examTypeIds.length > 1 ? "s" : ""}`
                  : "Aucun examen prédéfini"}
              </p>
            </div>
          </div>
          <Icon d={showExamSelector ? icons.chevUp : icons.chevDown} size={16} />
        </button>
        {showExamSelector && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
            <p className="text-xs text-slate-500">
              Ces examens s'afficheront automatiquement lors de la création d'une visite de ce type. D'autres pourront être ajoutés ou retirés au cas par cas.
            </p>
            {examTypes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">
                Aucun examen configuré — créez-en dans <strong>Types d'examens</strong>.
              </p>
            ) : (
              <>
                {/* Barre de recherche */}
                <ExamSearchBar
                  examTypes={examTypes}
                  selectedIds={form.examTypeIds}
                  onAdd={(id) => setForm((f) => ({ ...f, examTypeIds: [...f.examTypeIds, id] }))}
                />
                {/* Examens sélectionnés */}
                {form.examTypeIds.length > 0 && (
                  <div className="space-y-1.5">
                    {form.examTypeIds.map((id) => {
                      const et = examTypes.find((e) => e.id === id);
                      if (!et) return null;
                      return (
                        <div key={id} className="flex items-center justify-between rounded-xl border border-medwork-cyan/30 bg-cyan-50/30 px-4 py-2.5">
                          <div>
                            <span className="text-sm font-semibold text-slate-700">{et.name}</span>
                            {et.unit && <span className="ml-2 text-xs text-slate-400">{et.unit}</span>}
                            <span className="ml-2 text-xs text-slate-400">
                              {et.valueType === "numeric"
                                ? `Réf: ${et.normalMin ?? "—"} – ${et.normalMax ?? "—"}`
                                : (et.normalValues ?? []).join(" / ")}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, examTypeIds: f.examTypeIds.filter((x) => x !== id) }))}
                            className="ml-3 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                          >✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" className="rounded-xl bg-medwork-cyan px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function VisitTypesPage({
  visitTypes = [], currentPage, onNavigate, onLogout, onAdd, onEdit, onDelete, roles = [], userName, userRole, userPhoto, isSuperAdmin,
  permissions = [],
  searchData, onOpenWorker, onOpenVisit,
  examTypes = [],
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleAdd = (data: Omit<VisitType, "id">) => {
    onAdd({ id: Date.now(), ...data });
    setShowAddForm(false);
  };

  const handleEdit = (data: Omit<VisitType, "id">) => {
    if (editingId === null) return;
    onEdit({ id: editingId, ...data });
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Supprimer ce type de visite ?")) return;
    onDelete(id);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Types de visite médicale" onNavigate={onNavigate} searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin} onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Formulaire ajout */}
          {showAddForm ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-medwork-navy">Nouveau type de visite</p>
              <VisitTypeForm
                initial={{ name: "", description: "", periodicity: "Annuelle", mandatory: false, examConfig: defaultExamConfig(), editRules: {}, viewSections: {}, hiddenSections: {}, examTypeIds: [] }}
                onSave={handleAdd}
                onCancel={() => setShowAddForm(false)}
                submitLabel="Créer le type"
                roles={roles}
                examTypes={examTypes}
              />
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90"
              >
                <Icon d={icons.plus} size={15} />
                Nouveau type
              </button>
            </div>
          )}

          {/* Liste */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span className="font-bold text-medwork-navy">{visitTypes.length}</span>{" "}
                type{visitTypes.length > 1 ? "s" : ""} enregistré{visitTypes.length > 1 ? "s" : ""}
              </p>
            </div>

            {visitTypes.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-3xl mb-3">🗂️</p>
                <p className="font-semibold text-slate-600">Aucun type de visite</p>
                <p className="mt-1 text-sm text-slate-400">Cliquez sur "Nouveau type" pour en créer un.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visitTypes.map((vt) => {
                  const cfg = vt.examConfig ?? defaultExamConfig();
                  const ec = cfg.clinicalExam ?? { enabled: false };
                  const pe = cfg.physicalExam ?? { enabled: false };
                  const fe = cfg.functionalEvaluation ?? { enabled: false };
                  const activeSections = [
                    ec.enabled, cfg.complaints, pe.enabled,
                    cfg.biology, fe.enabled,
                    cfg.diagnoses, cfg.treatment, cfg.complementaryExams, cfg.recommendations,
                  ].filter(Boolean).length;

                  return (
                    <div key={vt.id}>
                      {editingId !== vt.id && (
                        <div className="flex items-start justify-between gap-4 px-6 py-4 transition hover:bg-slate-50/60">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-medwork-navy">{vt.name}</p>
                              {vt.mandatory && (
                                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-200">
                                  Réglementaire
                                </span>
                              )}
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                {vt.periodicity}
                              </span>
                              <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-semibold text-medwork-cyan ring-1 ring-cyan-200">
                                🔧 {activeSections}/9 sections
                              </span>
                            </div>
                            {vt.description && <p className="mt-1 text-xs text-slate-400">{vt.description}</p>}

                            {/* Aperçu des sections actives */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {cfg.clinicalExam.enabled && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">🩺 Clinique</span>}
                              {cfg.complaints && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">💬 Plaintes</span>}
                              {cfg.physicalExam.enabled && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">🫀 Physique</span>}
                              {cfg.biology && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">🧪 Biologie</span>}
                              {cfg.functionalEvaluation.enabled && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">📊 Fonctionnel</span>}
                              {cfg.diagnoses && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">🔬 Diagnostics</span>}
                              {cfg.treatment && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">💊 Traitement</span>}
                              {cfg.complementaryExams && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">📋 Complémentaires</span>}
                              {cfg.recommendations && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">📝 Recommandations</span>}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button onClick={() => setEditingId(vt.id)} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-500 hover:bg-amber-500 hover:text-white">✏️ Modifier</button>
                            <button onClick={() => handleDelete(vt.id)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 shadow-sm transition hover:border-red-500 hover:bg-red-500 hover:text-white">🗑️ Supprimer</button>
                          </div>
                        </div>
                      )}

                      {editingId === vt.id && (
                        <div className="border-l-4 border-amber-400 bg-amber-50/30 px-6 py-5">
                          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-700">✏️ Modification — {vt.name}</p>
                          <VisitTypeForm
                            initial={{ name: vt.name, description: vt.description, periodicity: vt.periodicity, mandatory: vt.mandatory, examConfig: vt.examConfig, editRules: vt.editRules ?? {}, viewSections: (vt as any).viewSections ?? {}, hiddenSections: vt.hiddenSections ?? {}, examTypeIds: vt.examTypeIds ?? [] }}
                            onSave={handleEdit}
                            onCancel={() => setEditingId(null)}
                            submitLabel="Enregistrer les modifications"
                            roles={roles}
                            examTypes={examTypes}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Icon helpers (chevrons manquants dans icons) ─────────────────────────────
const _icons = { chevDown: "M6 9l6 6 6-6", chevUp: "M18 15l-6-6-6 6" };
// Étend l'objet icons importé
Object.assign(icons, _icons);
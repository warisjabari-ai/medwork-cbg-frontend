// src/pages/ExamTypesPage.tsx
// Gestion des types d'examens biologiques

import { useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";

// ─── Type ─────────────────────────────────────────────────────────────────────
export type ReferenceRange = {
  id: string;           // uuid local
  label: string;        // Ex: "Homme adulte", "Femme 18-60 ans"
  sex?: "homme" | "femme" | "tous";
  ageMin?: number | null;
  ageMax?: number | null;
  normalMin?: number | null;
  normalMax?: number | null;
  normalValues?: string[] | null; // pour qualitatif
};

export type ExamType = {
  id: number;
  name: string;
  unit: string;
  valueType: "numeric" | "qualitative";
  normalMin: number | null;       // valeur simple (rétrocompatibilité)
  normalMax: number | null;
  referenceRanges: ReferenceRange[];  // intervalles multiples
  normalValues: string[] | null;
  possibleValues: string[] | null;
  description: string;
  active: boolean;
};

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  examTypes: ExamType[];
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
  onAdd: (et: Omit<ExamType, "id">) => void;
  onEdit: (et: ExamType) => void;
  onDelete: (id: number) => void;
};

// ─── Valeur nulle par défaut ──────────────────────────────────────────────────
function emptyForm(): Omit<ExamType, "id"> {
  return {
    name: "", unit: "", valueType: "numeric",
    normalMin: null, normalMax: null,
    referenceRanges: [],
    normalValues: null, possibleValues: null,
    description: "", active: true,
  };
}

// ─── Formulaire ───────────────────────────────────────────────────────────────
function ExamTypeForm({
  initial, onSave, onCancel, submitLabel,
}: {
  initial: Omit<ExamType, "id">;
  onSave: (data: Omit<ExamType, "id">) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);
  // Pour les valeurs possibles / normales (qualitatif) on gère des inputs de liste
  const [pvInput, setPvInput] = useState((initial.possibleValues ?? []).join(", "));
  const [nvInput, setNvInput] = useState((initial.normalValues ?? []).join(", "));

  const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Le nom est obligatoire."); return; }
    const data: Omit<ExamType, "id"> = {
      ...form,
      possibleValues: form.valueType === "qualitative" && pvInput.trim()
        ? pvInput.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
      normalValues: form.valueType === "qualitative" && nvInput.trim()
        ? nvInput.split(",").map((s) => s.trim()).filter(Boolean)
        : null,
    };
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={lbl}>Nom de l'examen *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Glycémie, NFS, TPSA…" className={inp} />
        </div>
        <div>
          <label className={lbl}>Unité de mesure</label>
          <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
            placeholder="Ex: g/L, mg/dL, UI/L" className={inp} />
        </div>
        <div className="md:col-span-2">
          <label className={lbl}>Description</label>
          <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description courte (optionnel)" className={inp} />
        </div>
      </div>

      {/* Type de valeur */}
      <div>
        <label className={lbl}>Type de résultat</label>
        <div className="flex gap-3">
          {[
            { val: "numeric",     label: "🔢 Numérique",     desc: "Ex: 1.2 g/L" },
            { val: "qualitative", label: "🔤 Qualitatif",    desc: "Ex: Positif / Négatif" },
          ].map(({ val, label, desc }) => (
            <label key={val} className={`flex flex-1 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${form.valueType === val ? "border-medwork-cyan bg-cyan-50/30" : "border-slate-200 hover:border-slate-300"}`}>
              <input type="radio" name="valueType" value={val} checked={form.valueType === val}
                onChange={() => setForm({ ...form, valueType: val as any })} className="mt-0.5 accent-medwork-cyan" />
              <div>
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Valeurs de référence */}
      {form.valueType === "numeric" ? (
        <div className="space-y-4">
          {/* Intervalle simple (rétrocompatibilité) */}
          <div>
            <label className={lbl}>Intervalle de référence par défaut</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Minimum</label>
                <input type="number" step="any" value={form.normalMin ?? ""} onChange={(e) => setForm({ ...form, normalMin: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Ex: 0.7" className={inp} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Maximum</label>
                <input type="number" step="any" value={form.normalMax ?? ""} onChange={(e) => setForm({ ...form, normalMax: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="Ex: 1.1" className={inp} />
              </div>
            </div>
          </div>

          {/* Intervalles multiples par sexe/âge */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl}>Intervalles spécifiques (sexe / âge)</label>
              <button type="button" onClick={() => {
                const newRange = { id: Date.now().toString(), label: "", sex: "tous" as const, ageMin: null, ageMax: null, normalMin: null, normalMax: null };
                setForm({ ...form, referenceRanges: [...(form.referenceRanges ?? []), newRange] });
              }} className="rounded-lg bg-cyan-50 px-3 py-1 text-xs font-semibold text-medwork-cyan hover:bg-cyan-100 transition">
                + Ajouter un intervalle
              </button>
            </div>
            {(form.referenceRanges ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucun intervalle spécifique. Cliquez sur « Ajouter » pour définir des normes par sexe ou tranche d'âge.</p>
            ) : (
              <div className="space-y-3">
                {(form.referenceRanges ?? []).map((range, idx) => (
                  <div key={range.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" value={range.label} onChange={(e) => {
                        const ranges = [...(form.referenceRanges ?? [])];
                        ranges[idx] = { ...ranges[idx], label: e.target.value };
                        setForm({ ...form, referenceRanges: ranges });
                      }} placeholder="Ex: Homme adulte, Femme < 50 ans…" className={inp + " flex-1"} />
                      <button type="button" onClick={() => {
                        setForm({ ...form, referenceRanges: (form.referenceRanges ?? []).filter((_, i) => i !== idx) });
                      }} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition text-xs">✕</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wide">Sexe</label>
                        <select value={range.sex ?? "tous"} onChange={(e) => {
                          const ranges = [...(form.referenceRanges ?? [])];
                          ranges[idx] = { ...ranges[idx], sex: e.target.value as any };
                          setForm({ ...form, referenceRanges: ranges });
                        }} className={inp + " text-xs"}>
                          <option value="tous">Tous</option>
                          <option value="homme">Homme</option>
                          <option value="femme">Femme</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wide">Âge min</label>
                        <input type="number" value={range.ageMin ?? ""} onChange={(e) => {
                          const ranges = [...(form.referenceRanges ?? [])];
                          ranges[idx] = { ...ranges[idx], ageMin: e.target.value ? parseInt(e.target.value) : null };
                          setForm({ ...form, referenceRanges: ranges });
                        }} placeholder="ans" className={inp + " text-xs"} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wide">Âge max</label>
                        <input type="number" value={range.ageMax ?? ""} onChange={(e) => {
                          const ranges = [...(form.referenceRanges ?? [])];
                          ranges[idx] = { ...ranges[idx], ageMax: e.target.value ? parseInt(e.target.value) : null };
                          setForm({ ...form, referenceRanges: ranges });
                        }} placeholder="ans" className={inp + " text-xs"} />
                      </div>
                      <div className="col-span-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wide">Min normal</label>
                        <input type="number" step="any" value={range.normalMin ?? ""} onChange={(e) => {
                          const ranges = [...(form.referenceRanges ?? [])];
                          ranges[idx] = { ...ranges[idx], normalMin: e.target.value ? parseFloat(e.target.value) : null };
                          setForm({ ...form, referenceRanges: ranges });
                        }} className={inp + " text-xs"} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-400 uppercase tracking-wide">Max normal</label>
                        <input type="number" step="any" value={range.normalMax ?? ""} onChange={(e) => {
                          const ranges = [...(form.referenceRanges ?? [])];
                          ranges[idx] = { ...ranges[idx], normalMax: e.target.value ? parseFloat(e.target.value) : null };
                          setForm({ ...form, referenceRanges: ranges });
                        }} className={inp + " text-xs"} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={lbl}>Toutes les valeurs possibles</label>
            <input type="text" value={pvInput} onChange={(e) => setPvInput(e.target.value)}
              placeholder="Ex: Positif, Négatif, Normal, Anormal (séparés par des virgules)" className={inp} />
          </div>
          <div>
            <label className={lbl}>Valeurs considérées normales</label>
            <input type="text" value={nvInput} onChange={(e) => setNvInput(e.target.value)}
              placeholder="Ex: Négatif, Normal" className={inp} />
            <p className="mt-1 text-xs text-slate-400">Toute valeur absente de cette liste sera considérée anormale.</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" className="rounded-xl bg-medwork-cyan px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          Annuler
        </button>
      </div>
    </form>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ExamTypesPage({
  examTypes, currentPage, onNavigate, onLogout,
  userName, userRole, userPhoto, isSuperAdmin, permissions = [],
  searchData, onOpenWorker, onOpenVisit,
  onAdd, onEdit, onDelete,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const can = (p: string) => isSuperAdmin || permissions.includes("*") || permissions.includes(p);

  const filtered = examTypes.filter((et) =>
    et.name.toLowerCase().includes(search.toLowerCase()) ||
    (et.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const editingItem = editingId !== null ? examTypes.find((et) => et.id === editingId) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout}
        userName={userName} userRole={userRole} userPhoto={userPhoto}
        isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Types d'examens biologiques" onNavigate={onNavigate}
          searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin}
          onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Bandeau : Ajouter */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-medwork-navy">Examens biologiques</h2>
              <p className="text-xs text-slate-400">{examTypes.length} examen{examTypes.length > 1 ? "s" : ""} configuré{examTypes.length > 1 ? "s" : ""}</p>
            </div>
            {can("settings.examTypes") && !showForm && !editingId && (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 hover:opacity-90 transition">
                <Icon d={icons.plus} size={15} />
                Nouvel examen
              </button>
            )}
          </div>

          {/* Formulaire création */}
          {showForm && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-medwork-navy">Nouvel examen biologique</h3>
              <ExamTypeForm
                initial={emptyForm()}
                onSave={(data) => { onAdd(data); setShowForm(false); }}
                onCancel={() => setShowForm(false)}
                submitLabel="Créer l'examen"
              />
            </div>
          )}

          {/* Formulaire édition */}
          {editingItem && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-6 shadow-sm">
              <h3 className="mb-5 text-xs font-bold uppercase tracking-widest text-amber-700">✏️ Modifier — {editingItem.name}</h3>
              <ExamTypeForm
                initial={editingItem}
                onSave={(data) => { onEdit({ ...editingItem, ...data }); setEditingId(null); }}
                onCancel={() => setEditingId(null)}
                submitLabel="Enregistrer les modifications"
              />
            </div>
          )}

          {/* Barre de recherche */}
          <div className="relative max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon d={icons.search} size={14} />
            </span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un examen…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-medwork-cyan focus:ring-2 focus:ring-medwork-cyan/20" />
          </div>

          {/* Liste des examens */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl bg-white p-16 text-center shadow-sm border border-slate-100">
              <p className="text-3xl mb-3">🔬</p>
              <p className="font-semibold text-slate-600">
                {search ? "Aucun examen trouvé" : "Aucun examen configuré"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {search ? `Aucun résultat pour « ${search} »` : "Cliquez sur « Nouvel examen » pour commencer."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["Examen", "Unité", "Type", "Valeurs de référence", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((et) => (
                    <tr key={et.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{et.name}</p>
                        {et.description && <p className="text-xs text-slate-400">{et.description}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{et.unit || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${et.valueType === "numeric" ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-purple-50 text-purple-700 ring-purple-200"}`}>
                          {et.valueType === "numeric" ? "🔢 Numérique" : "🔤 Qualitatif"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {et.valueType === "numeric"
                          ? (et.normalMin !== null || et.normalMax !== null)
                            ? <span className="text-xs">{et.normalMin ?? "—"} – {et.normalMax ?? "—"} {et.unit}</span>
                            : <span className="text-xs text-slate-400">Non défini</span>
                          : (et.normalValues?.length ?? 0) > 0
                            ? <span className="text-xs">{et.normalValues!.join(", ")}</span>
                            : <span className="text-xs text-slate-400">Non défini</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          {can("settings.examTypes") && (
                            <button onClick={() => { setShowForm(false); setEditingId(et.id); }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:border-medwork-cyan hover:text-medwork-cyan transition">
                              ✏️
                            </button>
                          )}
                          {can("settings.examTypes") && (
                            <button onClick={() => { if (window.confirm(`Supprimer l'examen « ${et.name} » ?`)) onDelete(et.id); }}
                              className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 shadow-sm hover:bg-red-500 hover:text-white hover:border-red-500 transition">
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";

// ─── Type ─────────────────────────────────────────────────────────────────────
export type Decision = {
  id: number;
  label: string;           // Ex: "Apte avec restriction"
  color: "green" | "orange" | "red" | "blue";  // couleur du badge dans l'UI
  description: string;     // Définition réglementaire / interne
  requiresRestriction: boolean;  // Déclenche le champ "Restrictions" dans le formulaire
};

type Props = {
  decisions: Decision[];
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  onAdd: (d: Decision) => void;
  onEdit: (d: Decision) => void;
  onDelete: (id: number) => void;
};

// ─── Helpers visuels ──────────────────────────────────────────────────────────
export function decisionBadgeClass(color: Decision["color"]) {
  switch (color) {
    case "green":  return "bg-green-50 text-green-700 ring-green-200";
    case "orange": return "bg-orange-50 text-orange-700 ring-orange-200";
    case "red":    return "bg-red-50 text-red-700 ring-red-200";
    default:       return "bg-sky-50 text-sky-700 ring-sky-200";
  }
}

export function decisionDotClass(color: Decision["color"]) {
  switch (color) {
    case "green":  return "bg-green-500";
    case "orange": return "bg-orange-500";
    case "red":    return "bg-red-500";
    default:       return "bg-sky-500";
  }
}

const COLOR_OPTIONS: { value: Decision["color"]; label: string; preview: string }[] = [
  { value: "green",  label: "Vert — Favorable",   preview: "bg-green-500"  },
  { value: "orange", label: "Orange — Réservé",   preview: "bg-orange-500" },
  { value: "red",    label: "Rouge — Défavorable", preview: "bg-red-500"    },
  { value: "blue",   label: "Bleu — Informatif",  preview: "bg-sky-500"    },
];

// ─── Formulaire ───────────────────────────────────────────────────────────────
function DecisionForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial: Omit<Decision, "id">;
  onSave: (d: Omit<Decision, "id">) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) { alert("Le libellé est obligatoire."); return; }
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">

        {/* Libellé */}
        <div>
          <label className={lbl}>Libellé de la décision *</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Ex: Apte avec restriction"
            className={inp}
          />
        </div>

        {/* Couleur */}
        <div>
          <label className={lbl}>Couleur du badge</label>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, color: opt.value })}
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-medium transition
                  ${form.color === opt.value
                    ? "border-medwork-cyan bg-cyan-50 text-medwork-navy"
                    : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"}`}
              >
                <span className={`h-3 w-3 shrink-0 rounded-full ${opt.preview}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className={lbl}>Description / définition</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Définition réglementaire ou usage interne…"
            className={inp}
          />
        </div>

        {/* Nécessite restriction */}
        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
            <input
              type="checkbox"
              checked={form.requiresRestriction}
              onChange={(e) => setForm({ ...form, requiresRestriction: e.target.checked })}
              className="h-4 w-4 rounded accent-medwork-cyan"
            />
            <span className="text-sm font-medium text-slate-700">
              Cette décision nécessite de préciser des restrictions
            </span>
          </label>
        </div>
      </div>

      {/* Aperçu du badge */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Aperçu :</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${decisionBadgeClass(form.color)}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${decisionDotClass(form.color)}`} />
          {form.label || "Libellé…"}
        </span>
        {form.requiresRestriction && (
          <span className="text-xs text-orange-500 font-medium">⚠️ Champ restrictions activé</span>
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
export default function DecisionsPage({
  decisions,
  currentPage,
  onNavigate,
  onLogout,
  onAdd,
  onEdit,
  onDelete,
  userName,
  userRole,
  userPhoto,
  isSuperAdmin,
  permissions = [],
  searchData,
  onOpenWorker,
  onOpenVisit,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleAdd = (data: Omit<Decision, "id">) => {
    onAdd({ id: Date.now(), ...data });
    setShowAddForm(false);
  };

  const handleEdit = (data: Omit<Decision, "id">) => {
    if (editingId === null) return;
    onEdit({ id: editingId, ...data });
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Supprimer cette décision médicale ?")) return;
    onDelete(id);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Décisions médicales" onNavigate={onNavigate} searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin} onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Formulaire ajout */}
          {showAddForm ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-medwork-navy">
                Nouvelle décision médicale
              </p>
              <DecisionForm
                initial={{ label: "", color: "green", description: "", requiresRestriction: false }}
                onSave={handleAdd}
                onCancel={() => setShowAddForm(false)}
                submitLabel="Créer la décision"
              />
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90"
              >
                <Icon d={icons.plus} size={15} />
                Nouvelle décision
              </button>
            </div>
          )}

          {/* Liste */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span className="font-bold text-medwork-navy">{decisions.length}</span>{" "}
                décision{decisions.length > 1 ? "s" : ""} enregistrée{decisions.length > 1 ? "s" : ""}
              </p>
            </div>

            {decisions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-3xl mb-3">⚖️</p>
                <p className="font-semibold text-slate-600">Aucune décision médicale</p>
                <p className="mt-1 text-sm text-slate-400">
                  Cliquez sur "Nouvelle décision" pour en créer une.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {decisions.map((d) => (
                  <div key={d.id}>
                    {editingId !== d.id && (
                      <div className="flex items-start justify-between gap-4 px-6 py-4 transition hover:bg-slate-50/60">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Badge preview */}
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${decisionBadgeClass(d.color)}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${decisionDotClass(d.color)}`} />
                              {d.label}
                            </span>
                            {d.requiresRestriction && (
                              <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-200">
                                ⚠️ Avec restrictions
                              </span>
                            )}
                          </div>
                          {d.description && (
                            <p className="mt-1.5 text-xs text-slate-400 max-w-xl">{d.description}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            onClick={() => setEditingId(d.id)}
                            className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-500 hover:bg-amber-500 hover:text-white"
                          >
                            ✏️ Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 shadow-sm transition hover:border-red-500 hover:bg-red-500 hover:text-white"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    )}

                    {editingId === d.id && (
                      <div className="border-l-4 border-amber-400 bg-amber-50/30 px-6 py-5">
                        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-700">
                          ✏️ Modification — {d.label}
                        </p>
                        <DecisionForm
                          initial={{ label: d.label, color: d.color, description: d.description, requiresRestriction: d.requiresRestriction }}
                          onSave={handleEdit}
                          onCancel={() => setEditingId(null)}
                          submitLabel="Enregistrer les modifications"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
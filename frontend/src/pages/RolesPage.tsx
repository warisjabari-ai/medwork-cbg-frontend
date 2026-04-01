import { useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Permission = {
  key: string;
  label: string;
  description: string;
  group: string;
};

export type Role = {
  id: number;
  name: string;
  description: string;
  color: "navy" | "cyan" | "green" | "orange" | "red" | "purple";
  permissions: string[]; // liste de permission.key
};

// ─── Toutes les permissions disponibles ──────────────────────────────────────
export const ALL_PERMISSIONS: Permission[] = [
  // Travailleurs
  { key: "workers.view",   label: "Voir les travailleurs",    description: "Consulter la liste et les fiches",        group: "Travailleurs" },
  { key: "workers.create", label: "Créer un travailleur",     description: "Ajouter un nouveau dossier travailleur",  group: "Travailleurs" },
  { key: "workers.edit",   label: "Modifier un travailleur",  description: "Éditer les informations d'un dossier",    group: "Travailleurs" },
  { key: "workers.delete", label: "Supprimer un travailleur", description: "Archiver ou supprimer un dossier",        group: "Travailleurs" },
  // Visites — accès général
  { key: "visits.view",   label: "Voir les visites",        description: "Consulter l'historique des visites médicales",        group: "Visites médicales" },
  { key: "visits.create", label: "Créer une visite",        description: "Créer une nouvelle visite (bouton Nouvelle visite)",   group: "Visites médicales" },
  { key: "visits.close",  label: "Clôturer une visite",     description: "Fermer définitivement un dossier visite",              group: "Visites médicales" },
  { key: "visits.delete", label: "Supprimer une visite",    description: "Supprimer définitivement une visite (irréversible)",   group: "Visites médicales" },
  { key: "visits.print",  label: "Imprimer les documents",  description: "Générer compte rendu, certificat, ordonnance",         group: "Visites médicales" },
  // Les droits de modification par section sont gérés dans "Droits d'édition par rôle" des types de visites
  // Données médicales sensibles (fiche travailleur)
  { key: "medical.antecedents",   label: "Voir les antécédents médicaux",     description: "Secret médical — médecin uniquement recommandé",   group: "Données médicales" },
  { key: "medical.vaccinations",  label: "Voir les vaccinations",             description: "Carnet vaccinal du travailleur",                   group: "Données médicales" },
  { key: "medical.expositions",   label: "Voir les expositions aux risques",  description: "Risques professionnels identifiés",                group: "Données médicales" },
  { key: "medical.lastvisits",    label: "Voir les dernières visites",        description: "Résumé des visites récentes dans la fiche",        group: "Données médicales" },
  // Paramètres
  { key: "settings.visitTypes", label: "Gérer les types de visite", description: "Créer, modifier, supprimer les types", group: "Paramètres" },
  { key: "settings.decisions",  label: "Gérer les décisions",       description: "Créer, modifier, supprimer les décisions", group: "Paramètres" },
  { key: "settings.examTypes",  label: "Gérer les types d'examens", description: "Créer, modifier, supprimer les examens biologiques", group: "Paramètres" },
  // Administration
  { key: "admin.roles",   label: "Gérer les rôles",           description: "Créer, modifier, supprimer les rôles",    group: "Administration" },
  { key: "admin.users",   label: "Gérer les utilisateurs",    description: "Créer et administrer les comptes",        group: "Administration" },
  { key: "reports.view",  label: "Voir les rapports",          description: "Accès aux statistiques et rapports",      group: "Rapports" },
];

const GROUPS = [...new Set(ALL_PERMISSIONS.map((p) => p.group))];

// ─── Props page ───────────────────────────────────────────────────────────────
type Props = {
  roles: Role[];
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  onAdd: (r: Role) => void;
  onEdit: (r: Role) => void;
  onDelete: (id: number) => void;
};

// ─── Couleurs disponibles ─────────────────────────────────────────────────────
const COLOR_OPTIONS: { value: Role["color"]; label: string; badge: string; dot: string }[] = [
  { value: "navy",   label: "Marine",  badge: "bg-slate-100 text-slate-700 ring-slate-300",    dot: "bg-slate-600"   },
  { value: "cyan",   label: "Cyan",    badge: "bg-cyan-50 text-cyan-700 ring-cyan-200",         dot: "bg-cyan-500"    },
  { value: "green",  label: "Vert",    badge: "bg-green-50 text-green-700 ring-green-200",      dot: "bg-green-500"   },
  { value: "orange", label: "Orange",  badge: "bg-orange-50 text-orange-700 ring-orange-200",  dot: "bg-orange-500"  },
  { value: "red",    label: "Rouge",   badge: "bg-red-50 text-red-700 ring-red-200",            dot: "bg-red-500"     },
  { value: "purple", label: "Violet",  badge: "bg-purple-50 text-purple-700 ring-purple-200",  dot: "bg-purple-500"  },
];

export function roleBadgeClass(color: Role["color"]) {
  return COLOR_OPTIONS.find((c) => c.value === color)?.badge ?? COLOR_OPTIONS[0].badge;
}
export function roleDotClass(color: Role["color"]) {
  return COLOR_OPTIONS.find((c) => c.value === color)?.dot ?? COLOR_OPTIONS[0].dot;
}

// ─── Formulaire rôle ──────────────────────────────────────────────────────────
function RoleForm({
  initial,
  onSave,
  onCancel,
  submitLabel,
}: {
  initial: Omit<Role, "id">;
  onSave: (r: Omit<Role, "id">) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  const togglePerm = (key: string) =>
    setForm((p) => ({
      ...p,
      permissions: p.permissions.includes(key)
        ? p.permissions.filter((k) => k !== key)
        : [...p.permissions, key],
    }));

  const toggleGroup = (group: string) => {
    const groupKeys = ALL_PERMISSIONS.filter((p) => p.group === group).map((p) => p.key);
    const allActive = groupKeys.every((k) => form.permissions.includes(k));
    setForm((p) => ({
      ...p,
      permissions: allActive
        ? p.permissions.filter((k) => !groupKeys.includes(k))
        : [...new Set([...p.permissions, ...groupKeys])],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Le nom du rôle est obligatoire."); return; }
    onSave(form);
  };

  const badge = COLOR_OPTIONS.find((c) => c.value === form.color)!;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Infos de base */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={lbl}>Nom du rôle *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Médecin du travail" className={inp} />
        </div>

        <div>
          <label className={lbl}>Couleur du badge</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, color: opt.value })}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition
                  ${form.color === opt.value ? "border-medwork-cyan bg-cyan-50 text-medwork-navy" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={lbl}>Description</label>
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du rôle et de ses responsabilités…" className={inp} />
        </div>
      </div>

      {/* Permissions par groupe */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Permissions</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm({ ...form, permissions: ALL_PERMISSIONS.map((p) => p.key) })} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">Tout cocher</button>
            <button type="button" onClick={() => setForm({ ...form, permissions: [] })} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">Tout décocher</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {GROUPS.map((group) => {
            const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === group);
            const allActive = groupPerms.every((p) => form.permissions.includes(p.key));
            const someActive = groupPerms.some((p) => form.permissions.includes(p.key));
            return (
              <div key={group} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* En-tête du groupe */}
                <div
                  className={`flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 transition
                    ${allActive ? "border-cyan-100 bg-cyan-50" : someActive ? "border-slate-100 bg-slate-50" : "border-slate-100 bg-slate-50"}`}
                  onClick={() => toggleGroup(group)}
                >
                  <input
                    type="checkbox"
                    checked={allActive}
                    ref={(el) => { if (el) el.indeterminate = someActive && !allActive; }}
                    onChange={() => toggleGroup(group)}
                    className="h-4 w-4 rounded accent-medwork-cyan"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={`text-xs font-bold uppercase tracking-wide ${allActive ? "text-medwork-cyan" : "text-slate-500"}`}>
                    {group}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400">
                    {groupPerms.filter((p) => form.permissions.includes(p.key)).length}/{groupPerms.length}
                  </span>
                </div>
                {/* Permissions du groupe */}
                <div className="divide-y divide-slate-50">
                  {groupPerms.map((perm) => {
                    const isSub = perm.key.startsWith("visits.edit.");
                    return (
                      <label key={perm.key} className={`flex cursor-pointer items-start gap-3 py-2.5 transition hover:bg-slate-50 ${isSub ? "pl-10 pr-4 bg-slate-50/50" : "px-4"}`}>
                        <input
                          type="checkbox"
                          checked={form.permissions.includes(perm.key)}
                          onChange={() => togglePerm(perm.key)}
                          className="mt-0.5 h-4 w-4 rounded accent-medwork-cyan"
                        />
                        <span>
                          <p className={`text-xs font-semibold ${isSub ? "text-slate-500" : "text-slate-700"}`}>{perm.label}</p>
                          <p className="text-[10px] text-slate-400">{perm.description}</p>
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

      {/* Aperçu */}
      <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Aperçu :</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badge.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
          {form.name || "Nom du rôle…"}
        </span>
        <span className="text-xs text-slate-400">{form.permissions.length} permission{form.permissions.length > 1 ? "s" : ""}</span>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="rounded-xl bg-medwork-cyan px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Annuler</button>
      </div>
    </form>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function RolesPage({ roles, currentPage, onNavigate, onLogout, onAdd, onEdit, onDelete, userName, userRole, userPhoto, isSuperAdmin, permissions = [], searchData, onOpenWorker, onOpenVisit }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleAdd = (data: Omit<Role, "id">) => { onAdd({ id: Date.now(), ...data }); setShowAddForm(false); };
  const handleEdit = (data: Omit<Role, "id">) => { if (editingId === null) return; onEdit({ id: editingId, ...data }); setEditingId(null); };
  const handleDelete = (id: number) => { if (!window.confirm("Supprimer ce rôle ?")) return; onDelete(id); };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Rôles" onNavigate={onNavigate} searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin} onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Formulaire ajout */}
          {showAddForm ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-medwork-navy">Nouveau rôle</p>
              <RoleForm
                initial={{ name: "", description: "", color: "cyan", permissions: [] }}
                onSave={handleAdd}
                onCancel={() => setShowAddForm(false)}
                submitLabel="Créer le rôle"
              />
            </div>
          ) : (
            <div className="flex justify-end">
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90">
                <Icon d={icons.plus} size={15} />
                Nouveau rôle
              </button>
            </div>
          )}

          {/* Liste */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span className="font-bold text-medwork-navy">{roles.length}</span>{" "}
                rôle{roles.length > 1 ? "s" : ""} enregistré{roles.length > 1 ? "s" : ""}
              </p>
            </div>

            {roles.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-3xl mb-3">🛡️</p>
                <p className="font-semibold text-slate-600">Aucun rôle défini</p>
                <p className="mt-1 text-sm text-slate-400">Cliquez sur "Nouveau rôle" pour en créer un.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {roles.map((role) => (
                  <div key={role.id}>
                    {editingId !== role.id && (
                      <div className="flex items-start justify-between gap-4 px-6 py-4 transition hover:bg-slate-50/60">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${roleBadgeClass(role.color)}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${roleDotClass(role.color)}`} />
                              {role.name}
                            </span>
                            {role.name === "Super Admin" ? (
                              <span className="rounded-full bg-medwork-navy/10 px-2.5 py-0.5 text-[10px] font-bold text-medwork-navy">
                                ⚙️ Rôle système — accès total
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                {role.permissions.length} permission{role.permissions.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          {role.description && <p className="mt-1.5 text-xs text-slate-400 max-w-xl">{role.description}</p>}

                          {/* Résumé des groupes actifs */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {GROUPS.map((group) => {
                              const groupPerms = ALL_PERMISSIONS.filter((p) => p.group === group);
                              const active = groupPerms.filter((p) => role.permissions.includes(p.key)).length;
                              if (active === 0) return null;
                              return (
                                <span key={group} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                  {group} ({active}/{groupPerms.length})
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {role.name === "Super Admin" ? (
                            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">🔒 Système</span>
                          ) : (
                            <>
                              <button onClick={() => setEditingId(role.id)} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-500 hover:bg-amber-500 hover:text-white">✏️ Modifier</button>
                              <button onClick={() => handleDelete(role.id)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 shadow-sm transition hover:border-red-500 hover:bg-red-500 hover:text-white">🗑️ Supprimer</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {editingId === role.id && (
                      <div className="border-l-4 border-amber-400 bg-amber-50/30 px-6 py-5">
                        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-700">✏️ Modification — {role.name}</p>
                        <RoleForm
                          initial={{ name: role.name, description: role.description, color: role.color, permissions: role.permissions }}
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
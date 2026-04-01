import { useRef, useState } from "react";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";
import { roleBadgeClass, roleDotClass } from "./RolesPage";
import type { Role } from "./RolesPage";

// ─── Types ────────────────────────────────────────────────────────────────────
export type AppUser = {
  id: number;
  name: string;
  matricule: string;   // identifiant de connexion
  email: string;
  roleId: number;
  active: boolean;
  createdAt: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  signature?: string;  // data URL de la signature (uploadée par l'admin)
};

type Props = {
  users: AppUser[];
  roles: Role[];
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  onAdd: (u: AppUser) => void;
  onEdit: (u: AppUser) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number) => void;
  currentUserRoleId: number;
  currentUserIsSuperAdmin: boolean;
};

// ─── Formulaire utilisateur ───────────────────────────────────────────────────
// ─── Upload image helper ──────────────────────────────────────────────────────
function SignatureUploader({ current, onUpload }: { current?: string; onUpload: (dataUrl: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Veuillez sélectionner une image."); return; }
    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) onUpload(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        {/* Aperçu */}
        <div className="flex h-16 w-40 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
          {current ? <img src={current} alt="Signature" className="h-full w-full object-contain p-1" /> : <span className="text-2xl opacity-40">✍️</span>}
        </div>
        {/* Zone drop */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => ref.current?.click()}
          className={`flex-1 cursor-pointer rounded-xl border-2 border-dashed px-4 py-4 text-center transition
            ${dragging ? "border-medwork-cyan bg-cyan-50" : "border-slate-200 bg-slate-50 hover:border-medwork-cyan hover:bg-cyan-50/40"}`}
        >
          <p className="text-sm font-medium text-slate-600">
            Glissez ou <span className="text-medwork-cyan underline">cliquez pour choisir</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-400">PNG fond transparent recommandé · JPG accepté</p>
          {current && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onUpload(""); }} className="mt-1.5 text-xs text-red-400 hover:text-red-600 hover:underline">
              Supprimer la signature
            </button>
          )}
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

function UserForm({
  initial,
  roles,
  onSave,
  onCancel,
  submitLabel,
  isEdit,
  canUploadSignature = false,
}: {
  initial: Omit<AppUser, "id" | "createdAt">;
  roles: Role[];
  onSave: (data: Omit<AppUser, "id" | "createdAt">) => void;
  onCancel: () => void;
  submitLabel: string;
  isEdit: boolean;
  canUploadSignature?: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { alert("Le nom est obligatoire."); return; }
    if (!form.matricule.trim()) { alert("L'identifiant de connexion est obligatoire."); return; }
    if (!isEdit && !password.trim()) { alert("Le mot de passe est obligatoire pour un nouvel utilisateur."); return; }
    if (password && password !== confirmPassword) { alert("Les mots de passe ne correspondent pas."); return; }
    if (!form.roleId) { alert("Veuillez sélectionner un rôle."); return; }
    onSave(form);
  };

  const selectedRole = roles.find((r) => r.id === form.roleId);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Nom complet */}
        <div>
          <label className={lbl}>Nom complet *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Dr Mamadou Camara" className={inp} />
        </div>

        {/* Identifiant */}
        <div>
          <label className={lbl}>Identifiant de connexion *</label>
          <input type="text" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} placeholder="Ex: mcamara" className={inp} />
        </div>

        {/* Email */}
        <div>
          <label className={lbl}>Adresse e-mail</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Ex: m.camara@cbg.com" className={inp} />
        </div>

        {/* Rôle */}
        <div>
          <label className={lbl}>Rôle *</label>
          <select
            value={form.roleId}
            onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}
            className={inp}
          >
            <option value={0}>— Sélectionner un rôle —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Mot de passe */}
        <div>
          <label className={lbl}>{isEdit ? "Nouveau mot de passe" : "Mot de passe *"}</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Laisser vide pour ne pas modifier" : "Mot de passe…"}
              className={inp + " pr-10"}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Confirmer */}
        <div>
          <label className={lbl}>Confirmer le mot de passe</label>
          <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Répéter le mot de passe" className={inp} />
        </div>

        {/* Statut */}
        <div className="md:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded accent-medwork-cyan" />
            <span className="text-sm font-medium text-slate-700">Compte actif</span>
          </label>
        </div>
      </div>

      {/* Aperçu rôle */}
      {selectedRole && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rôle attribué :</p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${roleBadgeClass(selectedRole.color)}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${roleDotClass(selectedRole.color)}`} />
            {selectedRole.name}
          </span>
          <span className="text-xs text-slate-400">{selectedRole.permissions.length} permission{selectedRole.permissions.length > 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Signature — visible uniquement pour les admins */}
      {canUploadSignature && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span>✍️</span>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Signature du médecin</p>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Uploadez une image de la signature manuscrite. Elle apparaîtra sur les documents imprimés (compte rendu, certificat, ordonnance).
          </p>
          <SignatureUploader
            current={form.signature}
            onUpload={(dataUrl) => setForm({ ...form, signature: dataUrl || undefined })}
          />
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" className="rounded-xl bg-medwork-cyan px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Annuler</button>
      </div>
    </form>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function UserManagementPage({
  users, roles, currentPage, onNavigate, onLogout, userName, userRole, userPhoto, isSuperAdmin,
  onAdd, onEdit, onDelete, onToggleActive, currentUserRoleId, currentUserIsSuperAdmin,
  permissions = [],
  searchData,
  onOpenWorker,
  onOpenVisit,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const handleAdd = (data: Omit<AppUser, "id" | "createdAt">) => {
    onAdd({ id: Date.now(), createdAt: new Date().toLocaleDateString("fr-FR"), ...data });
    setShowAddForm(false);
  };

  const handleEdit = (data: Omit<AppUser, "id" | "createdAt">) => {
    if (editingId === null) return;
    const existing = users.find((u) => u.id === editingId);
    if (!existing) return;
    onEdit({ ...existing, ...data });
    setEditingId(null);
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    onDelete(id);
  };

  // Filtres
  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.matricule.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.roleId === filterRole;
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? u.active : !u.active);
    return matchSearch && matchRole && matchStatus;
  });

  const getRoleName = (id: number) => roles.find((r) => r.id === id);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} permissions={permissions} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title="Gestion des utilisateurs" onNavigate={onNavigate} searchData={searchData} permissions={permissions} isSuperAdmin={isSuperAdmin} onOpenWorker={onOpenWorker} onOpenVisit={onOpenVisit} />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Bandeau super admin */}
          {currentUserIsSuperAdmin && (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-3.5 shadow-sm">
              <span className="text-xl">⭐</span>
              <div>
                <p className="text-sm font-bold text-amber-800">Mode Administrateur suprême</p>
                <p className="text-xs text-amber-600">Vous avez accès à toutes les fonctionnalités sans restriction. Vous pouvez créer, modifier et supprimer tous les comptes.</p>
              </div>
            </div>
          )}

          {/* Formulaire ajout */}
          {showAddForm ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-medwork-navy">Nouvel utilisateur</p>
              <UserForm
                initial={{ name: "", matricule: "", email: "", roleId: roles[0]?.id ?? 0, active: true }}
                roles={roles}
                onSave={handleAdd}
                onCancel={() => setShowAddForm(false)}
                submitLabel="Créer l'utilisateur"
                isEdit={false}
                canUploadSignature={currentUserIsSuperAdmin}
              />
            </div>
          ) : (
            <div className="flex justify-end">
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 transition hover:opacity-90">
                <Icon d={icons.plus} size={15} />
                Nouvel utilisateur
              </button>
            </div>
          )}

          {/* Liste */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">

            {/* Barre de filtres */}
            <div className="flex flex-wrap items-end gap-4 border-b border-slate-100 px-6 py-4">
              {/* Recherche */}
              <div className="flex-1 min-w-[180px]">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Recherche</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon d={icons.search} size={14} />
                  </span>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, identifiant, e-mail…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20" />
                </div>
              </div>

              {/* Filtre rôle */}
              <div className="min-w-[150px]">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Rôle</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white">
                  <option value="all">Tous les rôles</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              {/* Filtre statut */}
              <div className="min-w-[140px]">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">Statut</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white">
                  <option value="all">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                </select>
              </div>

              <div className="ml-auto self-end pb-0.5">
                <span className="text-sm text-slate-400">
                  <span className="font-bold text-medwork-navy">{filtered.length}</span> utilisateur{filtered.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Tableau */}
            {filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-3xl mb-3">👤</p>
                <p className="font-semibold text-slate-600">Aucun utilisateur trouvé</p>
                <p className="mt-1 text-sm text-slate-400">Modifiez vos filtres ou créez un nouvel utilisateur.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((user) => {
                  const role = getRoleName(user.roleId);
                  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const isCurrentUser = user.roleId === currentUserRoleId;

                  return (
                    <div key={user.id}>
                      {editingId !== user.id && (
                        <div className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50/60">
                          {/* Avatar */}
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${user.isSuperAdmin ? "bg-gradient-to-br from-yellow-500 to-amber-600 ring-2 ring-yellow-300" : user.active ? "bg-medwork-navy" : "bg-slate-400"}`}>
                            {initials}
                          </div>

                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-slate-800">{user.name}</p>
                              {user.isSuperAdmin && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-50 to-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-300">
                                  ⭐ Administrateur suprême
                                </span>
                              )}
                              {!user.active && !user.isSuperAdmin && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Inactif</span>
                              )}
                              {isCurrentUser && (
                                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-medwork-cyan ring-1 ring-cyan-200">Connecté</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              <span className="font-mono">{user.matricule}</span>
                              {user.email && <> · {user.email}</>}
                              {" · "}Créé le {user.createdAt}
                              {user.signature && <> · <span className="text-amber-600 font-medium">✍️ Signature</span></>}
                            </p>
                          </div>

                          {/* Rôle */}
                          <div className="shrink-0">
                            {user.isSuperAdmin ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Accès illimité
                              </span>
                            ) : role ? (
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roleBadgeClass(role.color)}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${roleDotClass(role.color)}`} />
                                {role.name}
                              </span>
                            ) : (
                              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-500 ring-1 ring-red-200">Rôle manquant</span>
                            )}
                          </div>

                          {/* Actions — protégées pour le super admin */}
                          <div className="flex shrink-0 items-center gap-2">
                            {user.isSuperAdmin ? (
                              <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600 cursor-default">
                                🔐 Protégé
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => onToggleActive(user.id)}
                                  className={`rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition
                                    ${user.active
                                      ? "border-slate-200 text-slate-600 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600"
                                      : "border-green-200 text-green-700 hover:bg-green-500 hover:text-white hover:border-green-500"}`}
                                >
                                  {user.active ? "🔒 Désactiver" : "✅ Activer"}
                                </button>
                                <button onClick={() => setEditingId(user.id)} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-500 hover:bg-amber-500 hover:text-white">✏️ Modifier</button>
                                <button onClick={() => handleDelete(user.id)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-500 shadow-sm transition hover:border-red-500 hover:bg-red-500 hover:text-white">🗑️</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {editingId === user.id && (
                        <div className="border-l-4 border-amber-400 bg-amber-50/30 px-6 py-5">
                          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-700">✏️ Modification — {user.name}</p>
                          <UserForm
                            initial={{ name: user.name, matricule: user.matricule, email: user.email, roleId: user.roleId, active: user.active, signature: user.signature }}
                            roles={roles}
                            onSave={handleEdit}
                            onCancel={() => setEditingId(null)}
                            submitLabel="Enregistrer les modifications"
                            isEdit={true}
                            canUploadSignature={currentUserIsSuperAdmin}
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
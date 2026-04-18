// src/components/Navigation.tsx
// Ce fichier contient la barre latérale partagée par toutes les pages.
// Tu n'as pas besoin de comprendre le contenu — il suffit de le copier.

import { useEffect, useRef, useState } from "react";

// Liste de toutes les pages de l'application
export type AppPage =
  | "login"
  | "dashboard"
  | "workers"
  | "workerDetails"
  | "workerForm"
  | "visits"
  | "visitTypes"
  | "decisions"
  | "examTypes"
  | "roles"
  | "userManagement"
  | "profile"
  | "reports";

// ─── Icônes SVG ───────────────────────────────────────────────────────────────
export const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const icons = {
  dashboard:   "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10",
  workers:     "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  visits:      "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
  visitType:   "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2",
  decisions:   "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3",
  examTypes:   "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  users:       "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  roles:       "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  settings:    "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  folder:      "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  userGroup:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  chevLeft:    "M15 18l-6-6 6-6",
  chevRight:   "M9 18l6-6-6-6",
  chevDown:    "M6 9l6 6 6-6",
  logout:      "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  search:      "M21 21l-4.35-4.35 M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  plus:        "M12 5v14 M5 12h14",
  stethoscope: "M4.5 12a7.5 7.5 0 0 0 15 0 M4.5 12H3a9 9 0 0 0 18 0h-1.5 M12 19.5V21 M9 3h6 M10 3v4a2 2 0 0 0 4 0V3",
  userPlus:    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8v6 M22 11h-6",
  arrowLeft:   "M19 12H5 M12 19l-7-7 7-7",
  reports:     "M18 20V10 M12 20V4 M6 20v-6",
  download:    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
};

// Détermine quel élément du menu est surligné selon la page active
function getActiveItem(page: AppPage): AppPage {
  if (page === "workerDetails" || page === "workerForm") return "workers";
  return page;
}

// ─── Icône de profil + popover déconnexion ────────────────────────────────────
export function ProfilePopover({
  collapsed,
  userName = "Administrateur",
  userRole = "ADMIN",
  userPhoto,
  isSuperAdmin = false,
  onLogout,
  onNavigate,
}: {
  collapsed: boolean;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  onLogout: () => void;
  onNavigate?: (page: AppPage) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const Avatar = ({ size = "sm" }: { size?: "sm" | "lg" }) => {
    const cls = size === "lg"
      ? "h-10 w-10 shrink-0 rounded-full text-sm font-bold text-white"
      : "h-8 w-8 shrink-0 rounded-full text-xs font-bold text-white";
    if (userPhoto) {
      return <img src={userPhoto} alt={userName} className={`${cls} object-cover ring-2 ring-white/20`} />;
    }
    return (
      <span className={`flex items-center justify-center ${cls} ${isSuperAdmin ? "bg-gradient-to-br from-yellow-500 to-amber-600 ring-2 ring-yellow-300/60" : "bg-medwork-cyan ring-2 ring-white/20"}`}>
        {isSuperAdmin ? "⭐" : initials}
      </span>
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? `${userName} — ${userRole}` : undefined}
        className={`flex w-full items-center gap-3 rounded-xl p-2 transition hover:bg-white/10 ${open ? "bg-white/10" : ""}`}
      >
        <Avatar size="sm" />
        {!collapsed && (
          <span className="flex-1 overflow-hidden text-left">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="truncate text-[11px] text-slate-400">{userRole}</p>
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute z-50 w-56 rounded-xl border border-white/10 bg-[#1a2744] p-3 shadow-2xl ${collapsed ? "bottom-0 left-14" : "bottom-14 left-0 right-0"}`}>
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <Avatar size="lg" />
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="truncate text-[11px] text-slate-400">{userRole}</p>
              {isSuperAdmin && (
                <span className="mt-0.5 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">⭐ Suprême</span>
              )}
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => { setOpen(false); onNavigate("profile"); }}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <Icon d={icons.users} size={15} />
              Mon profil
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            <Icon d={icons.logout} size={15} />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Bouton "Nouveau" avec menu déroulant ─────────────────────────────────────
export function QuickActionMenu({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition"
        style={{ background: '#00aadd', border: 'none', cursor: 'pointer', fontSize: 13 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#0099cc'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#00aadd'; }}
      >
        <Icon d={icons.plus} size={14} />
        <span>Nouveau</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-100 bg-white p-1.5"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1)', top: 'calc(100% + 4px)' }}>
          {[
            { icon: "stethoscope" as const, label: "Nouvelle consultation", sub: "Créer une visite médicale", page: "visits" as AppPage },
            { icon: "userPlus" as const, label: "Nouveau travailleur", sub: "Ajouter un dossier", page: "workerForm" as AppPage },
          ].map(({ icon, label, sub, page }) => (
            <button key={label} onClick={() => { setOpen(false); onNavigate(page); }}
              className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-medwork-cyan">
                <Icon d={icons[icon]} size={14} />
              </span>
              <span>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Barre latérale ───────────────────────────────────────────────────────────
export function Sidebar({
  currentPage,
  onNavigate,
  onLogout,
  userName,
  userRole,
  userPhoto,
  isSuperAdmin = false,
  permissions = [],
}: {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  userName?: string;
  userRole?: string;
  userPhoto?: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const active = getActiveItem(currentPage);

  // Super admin voit tout, sinon on vérifie les permissions
  const can = (perm: string): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const parts = perm.split(".");
    for (let i = 1; i < parts.length; i++) {
      if (permissions.includes(parts.slice(0, i).join("."))) return true;
    }
    return false;
  };
  const canAny = (...perms: string[]) => perms.some(can);
  const canSome = (prefix: string) => isSuperAdmin || permissions.includes("*") || permissions.some(p => p === prefix || p.startsWith(prefix + "."));

  const NavItem = ({ page, icon, label, indent = false }: { page: AppPage; icon: keyof typeof icons; label: string; indent?: boolean }) => {
    const isActive = active === page;
    return (
      <button
        onClick={() => onNavigate(page)}
        title={collapsed ? label : undefined}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all ${collapsed ? "justify-center" : ""} ${isActive ? "bg-medwork-cyan/20 text-medwork-cyan" : "text-slate-400 hover:bg-white/8 hover:text-slate-200"}`}
        style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, border: 'none', cursor: 'pointer', position: 'relative', marginBottom: 1 }}
      >
        {isActive && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-medwork-cyan rounded-r" />}
        <span className="shrink-0 flex"><Icon d={icons[icon]} size={15} /></span>
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );
  };

  const SectionLabel = ({ label }: { label: string; icon: keyof typeof icons }) =>
    collapsed ? <div className="my-2 mx-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} /> : (
      <p className="mt-4 mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{label}</p>
    );

  return (
    <aside className={`relative flex h-screen flex-col bg-medwork-navy transition-all duration-200 ${collapsed ? "w-[60px]" : "w-[224px]"}`}
      style={{ borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>

      {/* Logo */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 border-b px-3`}
        style={{ borderColor: 'rgba(255,255,255,0.08)', justifyContent: collapsed ? 'center' : undefined }}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-medwork-cyan font-bold text-white text-sm">M</div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-white leading-tight">MédWork CBG</p>
            <p className="text-[10px] font-normal leading-tight" style={{ color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Médecine du travail</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5">
        <NavItem page="dashboard" icon="dashboard" label="Tableau de bord" />
        {canAny("workers.view", "visits.view") && <SectionLabel label="Dossier Médical" icon="folder" />}
        {can("workers.view") && <NavItem page="workers" icon="workers" label="Travailleurs" />}
        {can("visits.view")  && <NavItem page="visits"  icon="visits"  label="Visites médicales" />}
        {canAny("reports.view", "reports.prescriptions", "reports.aptitudes") && (
          <><SectionLabel label="Rapports" icon="reports" /><NavItem page="reports" icon="reports" label="Rapports" /></>
        )}
        {canAny("settings.visitTypes", "settings.decisions", "settings.examTypes") && <SectionLabel label="Paramètres" icon="settings" />}
        {can("settings.visitTypes") && <NavItem page="visitTypes" icon="visitType" label="Types de visite" />}
        {can("settings.decisions")  && <NavItem page="decisions"  icon="decisions" label="Décisions" />}
        {can("settings.examTypes")  && <NavItem page="examTypes"  icon="examTypes" label="Types d'examens" />}
        {canAny("admin.roles", "admin.users") && <SectionLabel label="Utilisateurs" icon="userGroup" />}
        {can("admin.roles") && <NavItem page="roles"          icon="roles"  label="Rôles" />}
        {can("admin.users") && <NavItem page="userManagement" icon="users"  label="Utilisateurs" />}
      </nav>

      {/* Profil */}
      <div className="shrink-0 p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <ProfilePopover collapsed={collapsed} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} onLogout={onLogout} onNavigate={onNavigate} />
      </div>

      {/* Toggle */}
      <button onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3 top-16 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-medwork-navy transition"
        style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color='#00aadd'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(0,170,221,0.5)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,0.5)'; (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,0.15)'; }}
      >
        <Icon d={collapsed ? icons.chevRight : icons.chevLeft} size={11} />
      </button>
    </aside>
  );
}

// ─── Types pour la recherche globale ─────────────────────────────────────────
export type SearchableData = {
  workers?:    { id: number; name: string; matricule: string; company?: string; department?: string; position?: string; status: string }[];
  visits?:     { id: number; ref?: string; type: string; date: string; doctor?: string; workerId: number; aptitude: string; treatment?: { molecule: string }[] }[];
  visitTypes?: { id: number; name: string; description: string }[];
  decisions?:  { id: number; label: string; color: string }[];
  users?:      { id: number; name: string; matricule: string; role?: { name: string } }[];
  workerMap?:  Record<number, string>;
};

type SearchResult = {
  id: string;
  category: string;
  categoryIcon: string;
  title: string;
  subtitle: string;
  action: () => void;
};

// ─── Modal de recherche globale ───────────────────────────────────────────────
function GlobalSearchModal({
  onClose,
  data,
  permissions,
  isSuperAdmin,
  onNavigate,
  onOpenWorker,
  onOpenVisit,
}: {
  onClose: () => void;
  data: SearchableData;
  permissions: string[];
  isSuperAdmin?: boolean;
  onNavigate: (page: AppPage) => void;
  onOpenWorker?: (id: number) => void;
  onOpenVisit?: (visitId: number, workerId: number) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const can = (perm: string): boolean => {
    if (isSuperAdmin || permissions.includes("*")) return true;
    if (permissions.includes(perm)) return true;
    const parts = perm.split(".");
    for (let i = 1; i < parts.length; i++) {
      if (permissions.includes(parts.slice(0, i).join("."))) return true;
    }
    return permissions.some(p => p === perm || p.startsWith(perm + "."));
  };

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const results: SearchResult[] = [];
  const q = query.trim().toLowerCase();

  if (q.length >= 2) {
    // ── Travailleurs ──
    if (can("workers.view")) {
      (data.workers ?? []).forEach((w) => {
        const match = [w.name, w.matricule, w.company, w.department, w.position, w.status]
          .filter(Boolean).some((s) => s!.toLowerCase().includes(q));
        if (match) results.push({
          id: `w-${w.id}`,
          category: "Travailleur", categoryIcon: "👷",
          title: w.name,
          subtitle: `${w.matricule} · ${w.position ?? ""} · ${w.department ?? ""}`,
          action: () => { onOpenWorker?.(w.id); onClose(); },
        });
      });
    }

    // ── Visites médicales ──
    if (can("visits.view")) {
      (data.visits ?? []).forEach((v) => {
        const wName = data.workerMap?.[v.workerId] ?? "";
        const prescriptions = (v.treatment ?? []).map((t) => t.molecule).join(" ");
        const match = [v.ref, v.type, v.date, v.doctor, v.aptitude, wName, prescriptions]
          .filter(Boolean).some((s) => s!.toLowerCase().includes(q));
        if (match) results.push({
          id: `v-${v.id}`,
          category: "Visite médicale", categoryIcon: "🩺",
          title: `${v.ref ? `[${v.ref}] ` : ""}${v.type}`,
          subtitle: `${wName} · ${v.date} · ${v.doctor ?? ""}`,
          action: () => { onOpenVisit?.(v.id, v.workerId); onClose(); },
        });
      });
    }

    // ── Types de visite ──
    if (can("settings.visitTypes")) {
      (data.visitTypes ?? []).forEach((vt) => {
        if ([vt.name, vt.description].some((s) => s?.toLowerCase().includes(q))) {
          results.push({
            id: `vt-${vt.id}`,
            category: "Type de consultation", categoryIcon: "📋",
            title: vt.name,
            subtitle: vt.description,
            action: () => { onNavigate("visitTypes"); onClose(); },
          });
        }
      });
    }

    // ── Décisions / Aptitudes ──
    if (can("settings.decisions")) {
      (data.decisions ?? []).forEach((d) => {
        if (d.label.toLowerCase().includes(q)) {
          results.push({
            id: `d-${d.id}`,
            category: "Décision médicale", categoryIcon: "✅",
            title: d.label,
            subtitle: "Paramétrage des décisions",
            action: () => { onNavigate("decisions"); onClose(); },
          });
        }
      });
    }

    // ── Utilisateurs ──
    if (can("admin.users")) {
      (data.users ?? []).forEach((u) => {
        if ([u.name, u.matricule, u.role?.name].some((s) => s?.toLowerCase().includes(q))) {
          results.push({
            id: `u-${u.id}`,
            category: "Utilisateur", categoryIcon: "👤",
            title: u.name,
            subtitle: `${u.matricule} · ${u.role?.name ?? ""}`,
            action: () => { onNavigate("userManagement"); onClose(); },
          });
        }
      });
    }

    // ── Prescriptions ──
    if (can("visits.view")) {
      const seen = new Set<string>();
      (data.visits ?? []).forEach((v) => {
        (v.treatment ?? []).forEach((t) => {
          if (!t.molecule.toLowerCase().includes(q)) return;
          const key = t.molecule.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          const wName = data.workerMap?.[v.workerId] ?? "";
          results.push({
            id: `p-${v.id}-${key}`,
            category: "Prescription", categoryIcon: "💊",
            title: t.molecule,
            subtitle: `Prescrit lors de ${v.type} · ${wName} · ${v.date}`,
            action: () => { onOpenVisit?.(v.id, v.workerId); onClose(); },
          });
        });
      });
    }

    // ── Rapports (accès direct) ──
    if (can("reports.view")) {
      const reportCards = [
        { id: "prescriptions", label: "Rapport prescriptions médicales",   keywords: ["prescription", "médicament", "ordonnance"] },
        { id: "aptitudes",     label: "Rapport suivi des aptitudes",        keywords: ["aptitude", "apte", "inapte", "restriction"] },
        { id: "activity",      label: "Rapport activité médicale",          keywords: ["activité", "visite", "statistique"] },
        { id: "workers",       label: "Rapport suivi des travailleurs",     keywords: ["travailleur", "embauche", "contrat"] },
      ];
      reportCards.forEach((r) => {
        if ([r.label, ...r.keywords].some((k) => k.toLowerCase().includes(q))) {
          results.push({
            id: `r-${r.id}`,
            category: "Rapport", categoryIcon: "📊",
            title: r.label,
            subtitle: "Module Rapports",
            action: () => { onNavigate("reports"); onClose(); },
          });
        }
      });
    }
  }

  // Grouper par catégorie
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  const CATEGORY_ORDER = ["Travailleur", "Visite médicale", "Prescription", "Utilisateur", "Type de consultation", "Décision médicale", "Rapport"];
  const sortedCategories = Object.keys(grouped).sort((a, b) =>
    (CATEGORY_ORDER.indexOf(a) + 1 || 99) - (CATEGORY_ORDER.indexOf(b) + 1 || 99)
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Barre de saisie */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 shrink-0 text-slate-400">
            <path d="M21 21l-4.35-4.35 M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un travailleur, une visite, une prescription…"
            className="flex-1 text-base text-slate-800 outline-none placeholder-slate-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
          )}
          <kbd className="hidden rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 sm:block">Esc</kbd>
        </div>

        {/* Résultats */}
        <div className="max-h-[60vh] overflow-y-auto">
          {q.length < 2 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">Tapez au moins 2 caractères pour lancer la recherche.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["Matricule", "Nom", "Réf. visite", "Médicament"].map((hint) => (
                  <span key={hint} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-400">{hint}</span>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm font-semibold text-slate-600">Aucun résultat pour « {query} »</p>
              <p className="mt-1 text-xs text-slate-400">Essayez un autre terme ou vérifiez l'orthographe.</p>
            </div>
          ) : (
            <div className="py-2">
              {sortedCategories.map((cat) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 px-5 py-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{grouped[cat][0].categoryIcon} {cat}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{grouped[cat].length}</span>
                  </div>
                  {grouped[cat].slice(0, 5).map((r) => (
                    <button
                      key={r.id}
                      onClick={r.action}
                      className="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm">
                        {r.categoryIcon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{r.title}</p>
                        <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-2 h-3.5 w-3.5 shrink-0 text-slate-300">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  ))}
                  {grouped[cat].length > 5 && (
                    <p className="px-5 py-1.5 text-xs text-slate-400">+{grouped[cat].length - 5} résultat{grouped[cat].length - 5 > 1 ? "s" : ""} supplémentaire{grouped[cat].length - 5 > 1 ? "s" : ""}</p>
                  )}
                </div>
              ))}
              <p className="border-t border-slate-100 px-5 py-2.5 text-[10px] text-slate-400">
                {results.length} résultat{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── En-tête de page ──────────────────────────────────────────────────────────
export function AppHeader({
  title,
  subtitle,
  onNavigate,
  left,
  searchData,
  permissions,
  isSuperAdmin,
  onOpenWorker,
  onOpenVisit,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onNavigate: (page: AppPage) => void;
  left?: React.ReactNode;
  searchData?: SearchableData;
  permissions?: string[];
  isSuperAdmin?: boolean;
  onOpenWorker?: (id: number) => void;
  onOpenVisit?: (visitId: number, workerId: number) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K pour ouvrir la recherche
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      {/* Modal rendu en dehors du header pour éviter les problèmes de z-index */}
      {searchOpen && (
        <GlobalSearchModal
          onClose={() => setSearchOpen(false)}
          data={searchData ?? {}}
          permissions={permissions ?? []}
          isSuperAdmin={isSuperAdmin}
          onNavigate={onNavigate}
          onOpenWorker={onOpenWorker}
          onOpenVisit={onOpenVisit}
        />
      )}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 bg-white px-6"
        style={{ borderBottom: '1px solid #e2e6ea' }}>
        <div className="flex shrink-0 items-center gap-3">
          {left}
          <div>
            <h2 className="text-base font-semibold text-medwork-navy leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 font-normal mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <button onClick={() => setSearchOpen(true)}
            className="flex w-full max-w-xs items-center gap-2 rounded-lg border bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition"
            style={{ borderColor: '#e2e6ea', fontSize: 13 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#00aadd'; (e.currentTarget as HTMLButtonElement).style.background='white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#e2e6ea'; (e.currentTarget as HTMLButtonElement).style.background='#f8fafc'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5 shrink-0">
              <path d="M21 21l-4.35-4.35 M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="hidden rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200 sm:block">⌘K</kbd>
          </button>
          <QuickActionMenu onNavigate={onNavigate} />
        </div>
      </header>
    </>
  );
}
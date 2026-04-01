import { useState, useEffect } from "react";
import { authAPI, workersAPI, visitsAPI, visitTypesAPI, decisionsAPI, rolesAPI, usersAPI, examTypesAPI, setToken, removeToken, getToken } from "./api";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WorkersPage, { type Worker } from "./pages/WorkersPage";
import WorkerDetailsPage from "./pages/WorkerDetailsPage";
import WorkerFormPage from "./pages/WorkerFormPage";
import VisitsPage from "./pages/VisitsPage";
import VisitTypesPage, { type VisitType, defaultExamConfig } from "./pages/VisitTypesPage";
import DecisionsPage, { type Decision } from "./pages/DecisionsPage";
import RolesPage, { type Role } from "./pages/RolesPage";
import UserManagementPage, { type AppUser } from "./pages/UserManagementPage";
import ProfilePage from "./pages/ProfilePage";
import ReportsPage from "./pages/ReportsPage";
import ExamTypesPage, { type ExamType } from "./pages/ExamTypesPage";
import { Sidebar, AppHeader } from "./components/Navigation";
import type { AppPage } from "./components/Navigation";
import type { WorkerVisit } from "./types/visit";

function App() {
  const [page, setPage] = useState<AppPage>("login");

  // Sauvegarder la page courante pour la restaurer après F5
  useEffect(() => {
    if (page !== "login") {
      sessionStorage.setItem("medwork_page", page);
    }
  }, [page]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [currentUserRoleId, setCurrentUserRoleId] = useState<number>(1);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [pendingOpenForm, setPendingOpenForm] = useState(false);
  const [pendingEditVisitId, setPendingEditVisitId] = useState<number | undefined>(undefined);
  const [pendingOpenVisitId, setPendingOpenVisitId] = useState<number | undefined>(undefined);

  // ── State — toutes les données viennent de l'API ────────────────────────────
  const [workers,     setWorkers]     = useState<Worker[]>([]);
  const [visitTypes,  setVisitTypes]  = useState<VisitType[]>([]);
  const [allVisits,   setAllVisits]   = useState<WorkerVisit[]>([]);
  const [decisions,   setDecisions]   = useState<Decision[]>([]);
  const [roles,       setRoles]       = useState<Role[]>([]);
  const [users,       setUsers]       = useState<AppUser[]>([]);
  const [userPhotos,  setUserPhotos]  = useState<Record<number, string>>({});
  const [examTypes,   setExamTypes]   = useState<ExamType[]>([]);

  // ── Restauration de session au démarrage (F5) ────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then(async (user: any) => {
        setCurrentUserData(user);
        setCurrentUserRoleId(user.roleId);
        setCurrentUserIsSuperAdmin(user.isSuperAdmin ?? false);
        setCurrentUserId(user.id);
        await loadAllData();
        const savedPage = sessionStorage.getItem("medwork_page") as AppPage | null;
        const safePage = savedPage && savedPage !== "login" ? savedPage : "dashboard";
        setPage(safePage);
      })
      .catch((err: any) => {
        // Déconnecter uniquement si le serveur répond 401 (token invalide/expiré)
        // Une erreur réseau (fetch failed, backend down) = status undefined → garder la session
        if (err?.status === 401) {
          removeToken();
          sessionStorage.removeItem("medwork_page");
          setLoading(false);
        } else {
          // Erreur réseau — backend peut-être pas encore démarré, garder la session
          console.warn("Backend inaccessible au démarrage:", err?.message);
          const savedPage = sessionStorage.getItem("medwork_page") as AppPage | null;
          const safePage = savedPage && savedPage !== "login" ? savedPage : "dashboard";
          setPage(safePage);
          setLoading(false);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers types de visite ─────────────────────────────────────────────────
  const handleAddVisitType = async (vt: VisitType) => {
    try { const c = await visitTypesAPI.create(vt); setVisitTypes((p) => [...p, { ...vt, id: c.id }]); }
    catch (err) { console.error("Erreur création type visite:", err); }
  };
  const handleEditVisitType = async (vt: VisitType) => {
    try { await visitTypesAPI.update(vt.id, vt); setVisitTypes((p) => p.map((t) => t.id === vt.id ? vt : t)); }
    catch (err) { console.error("Erreur modification type visite:", err); }
  };
  const handleDeleteVisitType = async (id: number) => {
    try { await visitTypesAPI.delete(id); setVisitTypes((p) => p.filter((t) => t.id !== id)); }
    catch (err) { console.error("Erreur suppression type visite:", err); }
  };

  // ── Handlers décisions ───────────────────────────────────────────────────────
  const handleAddDecision = async (d: Decision) => {
    try { const c = await decisionsAPI.create(d); setDecisions((p) => [...p, { ...d, id: c.id }]); }
    catch (err) { console.error("Erreur création décision:", err); }
  };
  const handleEditDecision = async (d: Decision) => {
    try { await decisionsAPI.update(d.id, d); setDecisions((p) => p.map((x) => x.id === d.id ? d : x)); }
    catch (err) { console.error("Erreur modification décision:", err); }
  };
  const handleDeleteDecision = async (id: number) => {
    try { await decisionsAPI.delete(id); setDecisions((p) => p.filter((x) => x.id !== id)); }
    catch (err) { console.error("Erreur suppression décision:", err); }
  };

  const handleAddExamType = async (et: Omit<ExamType, "id">) => {
    try { const c = await examTypesAPI.create(et); setExamTypes((p) => [...p, { ...et, id: c.id }]); }
    catch (err: any) { console.error("Erreur création examen:", err); alert("Erreur : " + (err?.message ?? "Impossible de créer l'examen.")); }
  };
  const handleEditExamType = async (et: ExamType) => {
    try { await examTypesAPI.update(et.id, et); setExamTypes((p) => p.map((x) => x.id === et.id ? et : x)); }
    catch (err) { console.error("Erreur modification examen:", err); }
  };
  const handleDeleteExamType = async (id: number) => {
    try { await examTypesAPI.delete(id); setExamTypes((p) => p.filter((x) => x.id !== id)); }
    catch (err) { console.error("Erreur suppression examen:", err); }
  };

  // ── Handlers rôles ───────────────────────────────────────────────────────────
  const handleAddRole = async (r: Role) => {
    try { const c = await rolesAPI.create(r); setRoles((p) => [...p, { ...r, id: c.id }]); }
    catch (err) { console.error("Erreur création rôle:", err); }
  };
  const handleEditRole = async (r: Role) => {
    try { await rolesAPI.update(r.id, r); setRoles((p) => p.map((x) => x.id === r.id ? r : x)); }
    catch (err) { console.error("Erreur modification rôle:", err); }
  };
  const handleDeleteRole = async (id: number) => {
    try { await rolesAPI.delete(id); setRoles((p) => p.filter((x) => x.id !== id)); }
    catch (err) { console.error("Erreur suppression rôle:", err); }
  };

  // ── Handlers utilisateurs ────────────────────────────────────────────────────
  const handleAddUser = async (u: AppUser) => {
    try {
      const created = await usersAPI.create({ ...u, password: (u as any).password });
      setUsers((p) => [...p, { ...u, id: created.id }]);
    } catch (err) { console.error("Erreur création utilisateur:", err); }
  };
  const handleEditUser = async (u: AppUser) => {
    try {
      await usersAPI.update(u.id, { ...u, password: (u as any).password });
      setUsers((p) => p.map((x) => x.id === u.id ? u : x));
      // Mettre à jour la signature si modifiée
      if (u.signature !== undefined) {
        await usersAPI.updateSignature(u.id, u.signature ?? "");
      }
    } catch (err) { console.error("Erreur modification utilisateur:", err); }
  };
  const handleDeleteUser = async (id: number) => {
    try {
      await usersAPI.delete(id);
      setUsers((p) => p.filter((x) => x.id !== id));
    } catch (err) { console.error("Erreur suppression utilisateur:", err); }
  };
  const handleToggleActiveUser = async (id: number) => {
    try {
      const updated = await usersAPI.toggleActive(id);
      setUsers((p) => p.map((x) => x.id === id ? { ...x, active: updated.active } : x));
    } catch (err) { console.error("Erreur activation/désactivation:", err); }
  };
  const handlePhotoChange = async (dataUrl: string) => {
    try {
      await usersAPI.updatePhoto(dataUrl);
      setUserPhotos((p) => ({ ...p, [currentUserObj?.id ?? 0]: dataUrl }));
    } catch (err) { console.error("Erreur mise à jour photo:", err); }
  };

  // ── Handlers visites ─────────────────────────────────────────────────────────
  const handleAddVisit = async (visit: WorkerVisit) => {
    try {
      const created = await visitsAPI.create({
        workerId: visit.workerId, date: visit.date, type: visit.type,
        doctor: visit.doctor, aptitudeDoctor: visit.aptitudeDoctor,
        aptitude: visit.aptitude, nextVisit: visit.nextVisit,
        note: visit.note, restrictions: visit.restrictions,
        biology: visit.biology, complementaryExams: visit.complementaryExams,
        recommendations: visit.recommendations,
        clinicalExam: visit.clinicalExam, physicalExam: visit.physicalExam,
        complaints: visit.complaints, diagnoses: visit.diagnoses,
        treatments: visit.treatment,
      });
      setAllVisits((prev) => [{ ...created, treatment: created.treatment ?? [] }, ...prev]);
      setWorkers((pw) => pw.map((w) => w.id === visit.workerId ? { ...w, lastVisit: visit.date } : w));
      if (selectedWorker?.id === visit.workerId) {
        setSelectedWorker((pw) => pw ? { ...pw, lastVisit: visit.date } : pw);
      }
    } catch (err) { console.error("Erreur création visite:", err); }
  };

  const handleEditVisit = async (visit: WorkerVisit) => {
    try {
      const updated = await visitsAPI.update(visit.id, {
        date: visit.date, type: visit.type, doctor: visit.doctor,
        aptitudeDoctor: visit.aptitudeDoctor, aptitude: visit.aptitude,
        nextVisit: visit.nextVisit, note: visit.note, restrictions: visit.restrictions,
        biology: visit.biology, complementaryExams: visit.complementaryExams,
        recommendations: visit.recommendations,
        clinicalExam: visit.clinicalExam,
        physicalExam: visit.physicalExam,
        complaints: visit.complaints,
        diagnoses: visit.diagnoses,
        treatments: visit.treatment,
        functionalEval: visit.functionalEvaluation, // backend attend "functionalEval"
      });
      // Fusionner la réponse backend avec les données locales pour s'assurer
      // que tous les sous-objets (clinicalExam, physicalExam, etc.) sont à jour
      const merged: WorkerVisit = {
        ...visit,           // données locales complètes
        ...updated,         // réponse backend (peut écraser certains champs)
        workerId: visit.workerId,
        treatment: updated.treatment ?? visit.treatment ?? [],
        complaints: updated.complaints ?? visit.complaints ?? [],
        diagnoses: updated.diagnoses ?? visit.diagnoses ?? [],
        clinicalExam: updated.clinicalExam ?? visit.clinicalExam,
        physicalExam: updated.physicalExam ?? visit.physicalExam,
        functionalEvaluation: updated.functionalEvaluation ?? visit.functionalEvaluation,
      };
      setAllVisits((prev) => prev.map((v) => v.id === visit.id ? merged : v));
    } catch (err: any) {
      console.error("Erreur modification visite:", err);
      alert("Erreur : " + (err?.message ?? "Impossible de modifier la visite."));
    }
  };

  const handleCloseVisit = async (visitId: number) => {
    try {
      await visitsAPI.close(visitId);
      setAllVisits((prev) => prev.map((v) => v.id === visitId ? { ...v, closed: true } : v));
    } catch (err) { console.error("Erreur clôture visite:", err); }
  };

  const handleDeleteVisit = async (visitId: number) => {
    try {
      await visitsAPI.delete(visitId);
      setAllVisits((prev) => prev.filter((v) => v.id !== visitId));
    } catch (err: any) {
      console.error("Erreur suppression visite:", err);
      alert("Erreur : " + (err?.message ?? "Impossible de supprimer la visite."));
    }
  };

  // ── Handlers navigation ───────────────────────────────────────────────────────
  const handleNavigate = (target: AppPage) => {
    if (target !== "workerDetails") setSelectedWorker(null);
    if (target !== "workerForm")    setWorkerToEdit(null);
    if (target !== "workerDetails") setPendingOpenForm(false);
    if (target !== "workerDetails") setPendingEditVisitId(undefined);
    if (target !== "workerDetails") setPendingOpenVisitId(undefined);
    setPage(target);
  };

  const handleNewVisitForWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setPendingOpenForm(true);
    setPendingEditVisitId(undefined);
    setPendingOpenVisitId(undefined);
    setPage("workerDetails");
  };

  const handleEditVisitFromList = (visit: WorkerVisit, worker: Worker) => {
    setSelectedWorker(worker);
    setPendingOpenForm(false);
    setPendingEditVisitId(visit.id);
    setPendingOpenVisitId(undefined);
    setPage("workerDetails");
  };

  const handleOpenVisitFromList = async (visit: WorkerVisit, workerArg: Worker) => {
    // Chercher le worker complet dans le state
    let fullWorker = workers.find((w) => w.id === (workerArg.id ?? visit.workerId));

    // Si pas trouvé (données pas encore chargées), recharger et réessayer
    if (!fullWorker) {
      try {
        const data = await workersAPI.list();
        const mapped = data.map((wk: any) => ({
          id: wk.id, name: wk.name, matricule: wk.matricule,
          department: wk.department ?? "", position: wk.position ?? "",
          company: wk.company ?? "", residence: wk.residence ?? "",
          contractStatus: wk.contractStatus ?? "actif",
          status: wk.status ?? "Aucune visite", lastVisit: wk.lastVisit ?? "—",
        }));
        setWorkers(mapped);
        fullWorker = mapped.find((w: Worker) => w.id === visit.workerId);
      } catch { /* ignore */ }
    }

    setSelectedWorker(fullWorker ?? workerArg);
    setPendingOpenForm(false);
    setPendingEditVisitId(undefined);
    setPendingOpenVisitId(visit.id);
    setPage("workerDetails");
  };

  const handleUpdateStatus = (workerId: number, newStatus: string) => {
    setWorkers((prev) => prev.map((w) => w.id === workerId ? { ...w, status: newStatus } : w));
    if (selectedWorker?.id === workerId) {
      setSelectedWorker((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
  };

  // ── Chargement des données depuis l'API ──────────────────────────────────────
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [w, v, vt, d, r, u, et] = await Promise.all([
        workersAPI.list(),
        visitsAPI.list(),
        visitTypesAPI.list().catch(() => []),
        decisionsAPI.list().catch(() => []),
        rolesAPI.list().catch(() => []),
        usersAPI.list().catch(() => []),
        examTypesAPI.list().catch(() => []),
      ]);
      setWorkers(w.map((wk: any) => ({
        id: wk.id, name: wk.name, matricule: wk.matricule,
        department: wk.department ?? "", position: wk.position ?? "",
        company: wk.company ?? "", residence: wk.residence ?? "",
        contractStatus: wk.contractStatus ?? "actif",
        status: wk.status ?? "Aucune visite",
        lastVisit: wk.lastVisit ?? "—",
      })));
      setAllVisits(v.map((visit: any) => ({
        ...visit, workerId: visit.workerId,
        treatment: visit.treatment ?? [],
        complaints: visit.complaints ?? [],
        diagnoses: visit.diagnoses ?? [],
      })));
      setVisitTypes(vt.map((t: any) => ({
        id: t.id, name: t.name, description: t.description ?? "",
        periodicity: t.periodicity, mandatory: t.mandatory,
        examConfig: (t.examConfig && Object.keys(t.examConfig).length > 0)
          ? t.examConfig
          : defaultExamConfig(),
        editRules: t.editRules ?? {},
        viewSections: (t.viewSections ?? {}) as Record<string, string[]>,
        hiddenSections: t.hiddenSections ?? {},
        examTypeIds: t.examTypeIds ?? [],
      })));
      setDecisions(d.map((dec: any) => ({
        id: dec.id, label: dec.label, color: dec.color,
        description: dec.description ?? "",
        requiresRestriction: dec.requiresRestriction,
      })));
      setRoles(r.map((role: any) => ({
        id: role.id, name: role.name, description: role.description ?? "",
        color: role.color, permissions: role.permissions ?? [],
      })));
      setUsers(u.map((user: any) => ({
        id: user.id, name: user.name, matricule: user.matricule,
        email: user.email ?? "", roleId: user.roleId,
        active: user.active, isSuperAdmin: user.isSuperAdmin ?? false,
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR") : "—",
        signature: user.signature,
      })));
      setExamTypes((et ?? []).map((e: any) => ({
        id: e.id, name: e.name, unit: e.unit ?? "",
        valueType: e.valueType ?? "numeric",
        normalMin: e.normalMin ?? null, normalMax: e.normalMax ?? null,
        referenceRanges: e.referenceRanges ?? [],
        normalValues: e.normalValues ?? null,
        possibleValues: e.possibleValues ?? null,
        description: e.description ?? "",
        active: e.active ?? true,
      })));
    } catch (err) {
      console.error("Erreur chargement données :", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    sessionStorage.removeItem("medwork_page");
    setPage("login");
  };

  const handleSaveWorker = async (worker: Worker) => {
    try {
      const exists = workers.some((w) => w.id === worker.id);
      if (exists) {
        const updated = await workersAPI.update(worker.id, worker);
        setWorkers((prev) => prev.map((w) => w.id === worker.id ? { ...w, ...updated } : w));
      } else {
        const created = await workersAPI.create(worker);
        setWorkers((prev) => [{ ...worker, id: created.id }, ...prev]);
      }
      setWorkerToEdit(null);
      setPage("workers");
    } catch (err: any) {
      console.error("Erreur sauvegarde travailleur:", err);
      alert("Erreur : " + (err?.message ?? "Impossible de sauvegarder le travailleur."));
    }
  };

  const handleDeleteWorker = async (id: number) => {
    try {
      await workersAPI.delete(id);
      setWorkers((prev) => prev.filter((w) => w.id !== id));
      setAllVisits((prev) => prev.filter((v) => v.workerId !== id));
      if (selectedWorker?.id === id) setSelectedWorker(null);
    } catch (err) { console.error("Erreur suppression travailleur:", err); }
  };

  const handleSetContractStatus = async (id: number, status: Worker["contractStatus"]) => {
    try {
      await workersAPI.setContractStatus(id, status ?? "actif");
      setWorkers((prev) => prev.map((w) => w.id === id ? { ...w, contractStatus: status } : w));
    } catch (err) { console.error("Erreur statut contrat:", err); }
  };

  // ── Affichage de chargement ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-medwork-cyan border-t-transparent mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-600">Chargement des données…</p>
        </div>
      </div>
    );
  }

  // ── Pages sans barre latérale ────────────────────────────────────────────────
  if (page === "login") return (
    <LoginPage
      onLogin={async (matricule: string, password: string) => {
        try {
          const result = await authAPI.login(matricule, password);
          setToken(result.token);
          const user = result.user;
          setCurrentUserData(user);
          setCurrentUserRoleId(user.roleId);
          setCurrentUserIsSuperAdmin(user.isSuperAdmin ?? false);
          setCurrentUserId(user.id);
          await loadAllData();
          setPage("dashboard");
        } catch (err: any) {
          throw err;
        }
      }}
    />
  );

  // ── Utilisateur connecté et props partagés pour la sidebar ──────────────────
  const currentUserObj  = users.find((u) => u.id === currentUserId) ?? (currentUserData ? {
    id: currentUserData.id, name: currentUserData.name,
    matricule: currentUserData.matricule, email: currentUserData.email ?? "",
    roleId: currentUserData.roleId, active: currentUserData.active,
    isSuperAdmin: currentUserData.isSuperAdmin ?? false,
    createdAt: "—", signature: currentUserData.signature,
  } : null);
  const currentUserName  = currentUserObj?.name ?? "Utilisateur";
  const currentUserRole  = roles.find((r) => r.id === currentUserRoleId)?.name ?? currentUserData?.role?.name ?? "";
  const currentUserPhoto = currentUserObj?.photo ?? userPhotos[currentUserId] ?? currentUserData?.photo;
  // Permissions toujours récupérées depuis le state roles (données fraîches du backend)
  // Fallback sur currentUserData.role.permissions si roles pas encore chargé
  const resolvedPermissions: string[] = currentUserIsSuperAdmin
    ? ["*"]
    : (() => {
        // 1. Chercher dans le state roles (données les plus fraîches)
        const fromRoles = roles.find((r) => r.id === currentUserRoleId)?.permissions;
        if (fromRoles && fromRoles.length > 0) return fromRoles;
        // 2. Fallback sur currentUserData (données du token JWT)
        const fromToken = currentUserData?.role?.permissions;
        if (fromToken && fromToken.length > 0) return fromToken;
        return [];
      })();

  // Props Sidebar communes à toutes les pages
  // Données pour la recherche globale
  const workerMap: Record<number, string> = {};
  workers.forEach((w) => { workerMap[w.id] = w.name; });

  const searchData = {
    workers,
    visits: allVisits,
    visitTypes,
    decisions,
    users,
    workerMap,
  };

  const searchProps = {
    searchData,
    permissions: resolvedPermissions,
    isSuperAdmin: currentUserIsSuperAdmin,
    onOpenWorker: (id: number) => {
      const w = workers.find((wk) => wk.id === id);
      if (w) { setSelectedWorker(w); setPage("workerDetails"); }
    },
    onOpenVisit: (visitId: number, workerId: number) => {
      const w = workers.find((wk) => wk.id === workerId);
      if (w) { setSelectedWorker(w); setPendingOpenVisitId(visitId); setPage("workerDetails"); }
    },
  };

  const sidebarProps = {
    onNavigate: handleNavigate,
    onLogout: handleLogout,
    userName: currentUserName,
    userRole: currentUserRole,
    userPhoto: currentUserPhoto,
    isSuperAdmin: currentUserIsSuperAdmin,
    permissions: resolvedPermissions,
    ...searchProps,
  };

  // ── Pages avec barre latérale ────────────────────────────────────────────────
  if (page === "dashboard") {
    return <DashboardPage currentPage="dashboard" workers={workers} allVisits={allVisits} decisions={decisions} {...sidebarProps} />;
  }

  if (page === "reports") {
    return (
      <ReportsPage
        allVisits={allVisits}
        workers={workers}
        decisions={decisions}
        currentPage="reports"
        {...sidebarProps}
      />
    );
  }

  if (page === "workerForm") {
    return (
      <WorkerFormPage
        workerToEdit={workerToEdit}
        onBack={() => setPage("workers")}
        onSave={handleSaveWorker}
        {...sidebarProps}
      />
    );
  }

  if (page === "profile") {
    // Créer un utilisateur minimal si les données ne sont pas encore chargées
    const profileUser = currentUserObj ?? {
      id: currentUserId,
      name: currentUserName,
      matricule: "",
      email: "",
      roleId: currentUserRoleId,
      active: true,
      isSuperAdmin: currentUserIsSuperAdmin,
      createdAt: "—",
    };
    return (
      <ProfilePage
        currentUser={profileUser}
        roles={roles}
        currentPage="profile"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSave={handleEditUser}
        userPhoto={currentUserPhoto}
        onPhotoChange={handlePhotoChange}
        userSignature={currentUserObj?.signature}
        userName={currentUserName}
        userRole={currentUserRole}
        permissions={resolvedPermissions}
        isSuperAdmin={currentUserIsSuperAdmin}
      />
    );
  }

  if (page === "workers") {
    return (
      <WorkersPage
        workers={workers}
        currentPage="workers"
        onSelect={(worker) => { setSelectedWorker(worker); setPage("workerDetails"); }}
        onCreate={() => { if (resolvedPermissions.includes("*") || resolvedPermissions.includes("workers.create")) { setWorkerToEdit(null); setPage("workerForm"); } }}
        onEdit={(worker) => { if (resolvedPermissions.includes("*") || resolvedPermissions.includes("workers.edit")) { setWorkerToEdit(worker); setPage("workerForm"); } }}
        onDelete={handleDeleteWorker}
        onSetContractStatus={handleSetContractStatus}
        {...sidebarProps}
      />
    );
  }

  if (page === "workerDetails") {
    if (!selectedWorker) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <p className="text-slate-500 mb-4">Aucun travailleur sélectionné.</p>
            <button onClick={() => setPage("workers")} className="rounded-xl bg-medwork-cyan px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              ← Retour aux travailleurs
            </button>
          </div>
        </div>
      );
    }
    const workerVisits = allVisits
      .filter((v) => v.workerId === selectedWorker?.id)
      .sort((a, b) => b.id - a.id);

    return (
      <WorkerDetailsPage
        worker={selectedWorker}
        currentPage="workerDetails"
        onUpdateStatus={handleUpdateStatus}
        visits={workerVisits}
        onAddVisit={handleAddVisit}
        onEditVisit={handleEditVisit}
        onCloseVisit={handleCloseVisit}
        onDeleteVisit={handleDeleteVisit}
        initialOpenForm={pendingOpenForm}
        initialEditVisitId={pendingEditVisitId}
        initialOpenVisitId={pendingOpenVisitId}
        visitTypeNames={visitTypes.map((vt) => vt.name)}
        visitTypes={visitTypes}
        decisions={decisions}
        examTypes={examTypes}
        currentUserRoleId={currentUserIsSuperAdmin ? undefined : currentUserRoleId}
        allUsers={users}
        {...sidebarProps}
      />
    );
  }

  if (page === "userManagement") {
    return (
      <UserManagementPage
        users={users}
        roles={roles}
        currentPage="userManagement"
        onAdd={handleAddUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onToggleActive={handleToggleActiveUser}
        currentUserRoleId={currentUserRoleId}
        currentUserIsSuperAdmin={currentUserIsSuperAdmin}
        {...sidebarProps}
      />
    );
  }

  if (page === "roles") {
    return (
      <RolesPage
        roles={roles}
        currentPage="roles"
        onAdd={handleAddRole}
        onEdit={handleEditRole}
        onDelete={handleDeleteRole}
        {...sidebarProps}
      />
    );
  }

  if (page === "decisions") {
    return (
      <DecisionsPage
        decisions={decisions}
        currentPage="decisions"
        onAdd={handleAddDecision}
        onEdit={handleEditDecision}
        onDelete={handleDeleteDecision}
        {...sidebarProps}
      />
    );
  }

  if (page === "examTypes") {
    return (
      <ExamTypesPage
        examTypes={examTypes}
        currentPage="examTypes"
        onAdd={handleAddExamType}
        onEdit={handleEditExamType}
        onDelete={handleDeleteExamType}
        {...sidebarProps}
      />
    );
  }

  if (page === "visitTypes") {
    return (
      <VisitTypesPage
        visitTypes={visitTypes}
        currentPage="visitTypes"
        onAdd={handleAddVisitType}
        onEdit={handleEditVisitType}
        onDelete={handleDeleteVisitType}
        roles={roles}
        examTypes={examTypes}
        {...sidebarProps}
      />
    );
  }

  if (page === "visits") {
    return (
      <VisitsPage
        allVisits={allVisits}
        workers={workers}
        currentPage="visits"
        onNewVisitForWorker={handleNewVisitForWorker}
        onSelectWorker={(worker) => {
          const full = workers.find((w) => w.id === worker.id) ?? worker;
          setSelectedWorker(full);
          setPage("workerDetails");
        }}
        onEditVisit={handleEditVisitFromList}
        {...sidebarProps}
        onOpenVisit={handleOpenVisitFromList}
      />
    );
  }

  // ── Pages en cours de développement ─────────────────────────────────────────
  return <PlaceholderPage currentPage={page} {...sidebarProps} />;
}

// ─── Noms de pages ────────────────────────────────────────────────────────────
const PAGE_LABELS: Record<AppPage, string> = {
  login: "Connexion", dashboard: "Tableau de bord général",
  workers: "Travailleurs", workerDetails: "Fiche travailleur", workerForm: "Formulaire travailleur",
  visits: "Visites médicales", visitTypes: "Types de visite médicale",
  decisions: "Décisions", roles: "Rôles", userManagement: "Gestion des utilisateurs",
  profile: "Mon profil", reports: "Rapports",
  examTypes: "Types d'examens",
};

function PlaceholderPage({ currentPage, onNavigate, onLogout, userName, userRole, userPhoto, isSuperAdmin }: { currentPage: AppPage; onNavigate: (p: AppPage) => void; onLogout: () => void; userName?: string; userRole?: string; userPhoto?: string; isSuperAdmin?: boolean }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} userName={userName} userRole={userRole} userPhoto={userPhoto} isSuperAdmin={isSuperAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader title={PAGE_LABELS[currentPage]} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="rounded-2xl bg-white p-12 shadow-sm text-center">
            <p className="text-5xl mb-4">🚧</p>
            <p className="text-lg font-semibold text-medwork-navy">{PAGE_LABELS[currentPage]}</p>
            <p className="mt-2 text-sm text-slate-400">Cette section est en cours de développement.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
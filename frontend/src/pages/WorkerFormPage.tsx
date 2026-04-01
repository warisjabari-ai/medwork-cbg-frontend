import { useState, type ChangeEvent, type FormEvent } from "react";
import type { Worker } from "./WorkersPage";
import { Sidebar, AppHeader, Icon, icons } from "../components/Navigation";
import type { AppPage } from "../components/Navigation";

type Props = {
  workerToEdit: Worker | null;
  onBack: () => void;
  onSave: (worker: Worker) => void;
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

export default function WorkerFormPage({
  workerToEdit,
  onBack,
  onSave,
  onNavigate,
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
  const [formData, setFormData] = useState<Worker>({
    id: workerToEdit?.id || Date.now(),
    name: workerToEdit?.name || "",
    matricule: workerToEdit?.matricule || "",
    department: workerToEdit?.department || "",
    position: workerToEdit?.position || "",
    company: workerToEdit?.company || "CBG",
    status: workerToEdit?.status || "Apte",
    lastVisit: workerToEdit?.lastVisit || "",
    residence: workerToEdit?.residence || "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.matricule || !formData.department || !formData.position || !formData.company) {
      alert("Merci de remplir les champs obligatoires.");
      return;
    }
    onSave(formData);
  };

  const isEdit = !!workerToEdit;
  const title = isEdit ? "Modifier la fiche travailleur" : "Nouveau travailleur";

  const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  const fields = [
    { name: "name",       label: "Nom complet *",    placeholder: "Ex: Mamadou Diallo" },
    { name: "matricule",  label: "Matricule *",       placeholder: "Ex: CBG-001" },
    { name: "company",    label: "Entreprise *",      placeholder: "Ex: CBG" },
    { name: "department", label: "Département *",     placeholder: "Ex: D0000" },
    { name: "position",   label: "Poste *",           placeholder: "Ex: Opérateur" },
    { name: "residence",  label: "Résidence",         placeholder: "Ex: Kamsar" },
    { name: "lastVisit",  label: "Dernière visite",   placeholder: "Ex: 25/03/2026" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        currentPage="workerForm"
        onNavigate={onNavigate}
        onLogout={onLogout}
        userName={userName}
        userRole={userRole}
        userPhoto={userPhoto}
        isSuperAdmin={isSuperAdmin} permissions={permissions}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          title={title}
          onNavigate={onNavigate}
          left={
            <button
              onClick={onBack}
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

        <main className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">

            {/* Informations personnelles */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                Informations du travailleur
              </h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {fields.map(({ name, label, placeholder }) => (
                  <div key={name}>
                    <label className={lbl}>{label}</label>
                    <input
                      type="text"
                      name={name}
                      value={(formData as Record<string, string>)[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      className={inp}
                    />
                  </div>
                ))}
              </div>

              {/* Info : statut automatique */}
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3">
                <span className="mt-0.5 text-medwork-cyan">ℹ️</span>
                <p className="text-xs text-cyan-800">
                  Le <strong>statut médical</strong> est calculé automatiquement à partir de l'aptitude de la dernière visite médicale enregistrée. Il n'est pas modifiable ici.
                </p>
              </div>
            </div>

            {/* Aperçu du statut */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">
                Aperçu de la fiche
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ["Nom complet",   formData.name       || "—"],
                  ["Matricule",     formData.matricule  || "—"],
                  ["Entreprise",    formData.company    || "—"],
                  ["Département",   formData.department || "—"],
                  ["Poste",         formData.position   || "—"],
                  ["Résidence",     formData.residence  || "—"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Statut médical</p>
                  <p className="mt-1 text-sm font-semibold text-slate-400 italic">Calculé depuis les visites</p>
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-medwork-cyan px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 shadow-md shadow-cyan-900/20"
              >
                {isEdit ? "Enregistrer les modifications" : "Créer le travailleur"}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>

          </form>
        </main>
      </div>
    </div>
  );
}
// src/types/visit.ts
// Tous les types liés aux visites médicales, partagés entre les pages.

export type TreatmentItem       = { molecule: string; quantity: string; posology: string };
export type ImagingExam         = { name: string; result: string };
export type DiagnosisItem       = { label: string; isHistory: boolean };
export type ComplaintItem       = { label: string; duration: string };
export type TestVisuel          = { distanceOD: string; distanceOG: string; presOD: string; presOG: string; withGlasses: string };
export type FunctionalEvaluation = {
  ecg: string; spirometry: string; audiogram: string;
  hearingProtectionUsed: string; hearingProtectionType: string;
  visualTest: TestVisuel; colorVisionOD: string; colorVisionOG: string;
  imaging: ImagingExam[];
};
export type ClinicalExam = {
  weight: string; height: string; bmi: string; temperature: string;
  bloodPressure: string; pulse: string; respiratoryRate: string;
};
export type PhysicalExam = {
  orl: string; digestive: string; cardiology: string; neurology: string;
  pulmonary: string; uroGenital: string; locomotor: string; others: string;
};
export type Visit = {
  id: number;
  ref: string;             // Numéro de référence unique Ex: "VIS-2026-00042"
  date: string;
  type: string;
  doctor: string;          // Médecin ayant réalisé la consultation / signé l'ordonnance
  aptitudeDoctor: string;  // Médecin ayant pris la décision d'aptitude (peut être différent)
  aptitude: string;
  nextVisit: string;
  note: string;
  restrictions: string;
  clinicalExam: ClinicalExam;
  physicalExam: PhysicalExam;
  biology: string;
  functionalEvaluation: FunctionalEvaluation;
  complaints: ComplaintItem[];
  diagnoses: DiagnosisItem[];
  treatment: TreatmentItem[];
  complementaryExams: string;
  recommendations: string;
  closed: boolean;
};

// VisitFormData exclut id et ref (générés automatiquement)
export type VisitFormData = Omit<Visit, "id" | "ref">;

// WorkerVisit = une visite médicale avec l'id du travailleur concerné
export type WorkerVisit = Visit & { workerId: number };

// Génère un numéro de référence unique de visite
// Format : VIS-AAAA-NNNNN (ex: VIS-2026-00042)
export function generateVisitRef(existingRefs: string[]): string {
  const year = new Date().getFullYear();
  const prefix = `VIS-${year}-`;
  const nums = existingRefs
    .filter((r) => r.startsWith(prefix))
    .map((r) => parseInt(r.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

// Formulaire vide pour créer une nouvelle visite
export function emptyForm(): VisitFormData {
  return {
    date: "", type: "Visite périodique", doctor: "", aptitudeDoctor: "", aptitude: "",
    nextVisit: "", note: "", restrictions: "",
    clinicalExam: { weight: "", height: "", bmi: "", temperature: "", bloodPressure: "", pulse: "", respiratoryRate: "" },
    physicalExam: { orl: "", digestive: "", cardiology: "", neurology: "", pulmonary: "", uroGenital: "", locomotor: "", others: "" },
    biology: "",
    complaints: [],
    functionalEvaluation: {
      ecg: "", spirometry: "", audiogram: "", hearingProtectionUsed: "Non", hearingProtectionType: "",
      visualTest: { distanceOD: "", distanceOG: "", presOD: "", presOG: "", withGlasses: "Sans précision" },
      colorVisionOD: "", colorVisionOG: "",
      imaging: [],
    },
    diagnoses: [],
    treatment: [],
    complementaryExams: "",
    recommendations: "",
    closed: false,
  };
}
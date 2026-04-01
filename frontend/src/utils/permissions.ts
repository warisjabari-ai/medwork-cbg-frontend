// src/utils/permissions.ts
// Source de vérité unique pour toute la gestion des permissions

export type AccessLevel = "visible" | "readonly" | "hidden";

// ─── Fonction principale : créer un vérificateur de permissions ───────────────
// Retourne { can, canAny, canSome } utilisables dans tous les composants
export function createCan(permissions: string[], isSuperAdmin = false) {
  const perms = permissions;

  /**
   * L'utilisateur peut-il faire cette action ?
   * Gère la hiérarchie : visits.edit → visits.edit.biology
   * Gère les sous-permissions : visits.edit.biology ≠ visits.edit (sens strict)
   */
  function can(perm: string): boolean {
    if (isSuperAdmin || perms.includes("*")) return true;
    if (perms.includes(perm)) return true;
    // Parent → enfant : si on a visits.edit, on a aussi visits.edit.biology
    const parts = perm.split(".");
    for (let i = 1; i < parts.length; i++) {
      if (perms.includes(parts.slice(0, i).join("."))) return true;
    }
    return false;
  }

  /**
   * L'utilisateur a-t-il au moins une des permissions listées ?
   */
  function canAny(...permList: string[]): boolean {
    return permList.some((p) => can(p));
  }

  /**
   * L'utilisateur a-t-il au moins UNE permission commençant par ce préfixe ?
   * Ex: canSome("visits.edit") → vrai si visits.edit.biology ou visits.edit
   */
  function canSome(prefix: string): boolean {
    if (isSuperAdmin || perms.includes("*")) return true;
    if (perms.includes(prefix)) return true;
    return perms.some((p) => p.startsWith(prefix + "."));
  }

  return { can, canAny, canSome };
}

// ─── Résolution du niveau d'accès d'un champ selon le rôle ───────────────────
// Gère à la fois l'ancien format (string) et le nouveau (FieldRuleConfig)
export function resolveFieldAccess(
  fieldConfig: any,
  field: string,
  roleId?: number
): AccessLevel {
  if (!fieldConfig || !fieldConfig[field]) return "visible";
  const rule = fieldConfig[field];
  // Ancien format : string simple
  if (typeof rule === "string") return rule as AccessLevel;
  // Nouveau format : { default, byRole }
  const rid = roleId !== undefined ? String(roleId) : undefined;
  if (rid && rule.byRole?.[rid] !== undefined) return rule.byRole[rid];
  return rule.default ?? "visible";
}

// ─── Sections d'une visite et leurs permissions requises ─────────────────────
export const SECTION_PERM_MAP: Record<string, string> = {
  info:            "visits.edit.info",
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

// ─── Résolution de l'accès à une section ─────────────────────────────────────
// Retourne : "edit" | "readonly" | "hidden"
// - edit : visible et modifiable
// - readonly : visible mais non modifiable
// - hidden : non visible du tout
export function resolveSectionAccess(
  section: string,
  permissions: string[],
  isSuperAdmin: boolean,
  editRuleAllows: boolean, // résultat de resolveAllowedSections
): "edit" | "readonly" | "hidden" {
  const { can } = createCan(permissions, isSuperAdmin);
  const perm = SECTION_PERM_MAP[section];

  // Si l'utilisateur peut éditer cette section
  if (can(perm) && editRuleAllows) return "edit";

  // Si l'utilisateur peut voir les visites → lecture seule
  if (can("visits.view")) return "readonly";

  // Sinon : caché
  return "hidden";
}

// ─── ExamConfig : section activée dans ce type de visite ─────────────────────
export function isSectionEnabled(examConfig: any, section: string): boolean {
  if (!examConfig) return true; // Par défaut : tout affiché
  switch (section) {
    case "clinicalExam":    return examConfig.clinicalExam?.enabled !== false;
    case "complaints":      return examConfig.complaints !== false;
    case "physicalExam":    return examConfig.physicalExam?.enabled !== false;
    case "biology":         return examConfig.biology !== false;
    case "functional":      return examConfig.functionalEvaluation?.enabled !== false;
    case "diagnoses":       return examConfig.diagnoses !== false;
    case "treatment":       return examConfig.treatment !== false;
    case "complementary":   return examConfig.complementaryExams !== false;
    case "recommendations": return examConfig.recommendations !== false;
    default:                return true;
  }
}
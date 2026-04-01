// src/api.ts
// Client API centralisé — toutes les communications avec le backend

const BASE_URL = (import.meta.env.VITE_API_URL || 'https://medwork-cbg-backend-production.up.railway.app') + '/api';

export function getToken(): string | null {
  return localStorage.getItem("medwork_token");
}
export function setToken(token: string) {
  localStorage.setItem("medwork_token", token);
}
export function removeToken() {
  localStorage.removeItem("medwork_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Erreur réseau" }));
    const error = new Error(err.error || `Erreur ${response.status}`) as any;
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const authAPI = {
  login: (matricule: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify({ matricule, password }) }),
  me: () => request<any>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request("/auth/change-password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
};

export const workersAPI = {
  list: (params?: { search?: string; contractStatus?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>(`/workers${q ? "?" + q : ""}`);
  },
  get: (id: number) => request<any>(`/workers/${id}`),
  create: (data: any) => request<any>("/workers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/workers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  setContractStatus: (id: number, contractStatus: string) =>
    request<any>(`/workers/${id}/contract-status`, { method: "PATCH", body: JSON.stringify({ contractStatus }) }),
  delete: (id: number) => request(`/workers/${id}`, { method: "DELETE" }),
};

export const visitsAPI = {
  list: (params?: { workerId?: number; search?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>(`/visits${q ? "?" + q : ""}`);
  },
  get: (id: number) => request<any>(`/visits/${id}`),
  create: (data: any) => request<any>("/visits", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/visits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  close: (id: number) => request<any>(`/visits/${id}/close`, { method: "PATCH" }),
  delete: (id: number) => request(`/visits/${id}`, { method: "DELETE" }),
};

export const visitTypesAPI = {
  list: () => request<any[]>("/visit-types"),
  create: (data: any) => request<any>("/visit-types", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/visit-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/visit-types/${id}`, { method: "DELETE" }),
};

export const decisionsAPI = {
  list: () => request<any[]>("/decisions"),
  create: (data: any) => request<any>("/decisions", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/decisions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/decisions/${id}`, { method: "DELETE" }),
};

export const rolesAPI = {
  list: () => request<any[]>("/roles"),
  create: (data: any) => request<any>("/roles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/roles/${id}`, { method: "DELETE" }),
};

export const usersAPI = {
  list: () => request<any[]>("/users"),
  create: (data: any) => request<any>("/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  toggleActive: (id: number) => request<any>(`/users/${id}/toggle-active`, { method: "PATCH" }),
  updateSignature: (userId: number, signature: string) =>
    request<any>(`/users/${userId}/signature`, { method: "PATCH", body: JSON.stringify({ signature }) }),
  updatePhoto: (photo: string) =>
    request("/uploads/photo", { method: "PATCH", body: JSON.stringify({ photo }) }),
  delete: (id: number) => request(`/users/${id}`, { method: "DELETE" }),
};

export const reportsAPI = {
  prescriptions: (params?: any) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>(`/reports/prescriptions${q ? "?" + q : ""}`);
  },
  aptitudes: (params?: any) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any[]>(`/reports/aptitudes${q ? "?" + q : ""}`);
  },
  activity: (params?: any) => {
    const q = new URLSearchParams(params as any).toString();
    return request<any>(`/reports/activity${q ? "?" + q : ""}`);
  },
};

export const medicalHistoryAPI = {
  get: (workerId: number) =>
    request<{ antecedents: any[]; vaccinations: any[]; expositions: any[] }>(`/workers/${workerId}/medical-history`),

  createAntecedent: (workerId: number, data: any) =>
    request<any>(`/workers/${workerId}/medical-history/antecedents`, { method: "POST", body: JSON.stringify(data) }),
  updateAntecedent: (workerId: number, id: number, data: any) =>
    request<any>(`/workers/${workerId}/medical-history/antecedents/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAntecedent: (workerId: number, id: number) =>
    request(`/workers/${workerId}/medical-history/antecedents/${id}`, { method: "DELETE" }),
  syncAntecedents: (workerId: number, diagnoses: any[], visitRef: string, visitDate: string) =>
    request<{ added: number; antecedents: any[] }>(
      `/workers/${workerId}/medical-history/antecedents/sync`,
      { method: "POST", body: JSON.stringify({ diagnoses, visitRef, visitDate }) }
    ),

  createVaccination: (workerId: number, data: any) =>
    request<any>(`/workers/${workerId}/medical-history/vaccinations`, { method: "POST", body: JSON.stringify(data) }),
  updateVaccination: (workerId: number, id: number, data: any) =>
    request<any>(`/workers/${workerId}/medical-history/vaccinations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteVaccination: (workerId: number, id: number) =>
    request(`/workers/${workerId}/medical-history/vaccinations/${id}`, { method: "DELETE" }),

  createExposition: (workerId: number, data: any) =>
    request<any>(`/workers/${workerId}/medical-history/expositions`, { method: "POST", body: JSON.stringify(data) }),
  updateExposition: (workerId: number, id: number, data: any) =>
    request<any>(`/workers/${workerId}/medical-history/expositions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExposition: (workerId: number, id: number) =>
    request(`/workers/${workerId}/medical-history/expositions/${id}`, { method: "DELETE" }),
};

// ─── Types d'examens biologiques ─────────────────────────────────────────────
export const examTypesAPI = {
  list: () => request<any[]>("/exam-types"),
  create: (data: any) => request<any>("/exam-types", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: any) => request<any>(`/exam-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => request(`/exam-types/${id}`, { method: "DELETE" }),
  getResults: (visitId: number) => request<any[]>(`/exam-types/results/${visitId}`),
  saveResults: (visitId: number, results: { examTypeId: number; value: string }[]) =>
    request<any[]>(`/exam-types/results/${visitId}`, { method: "POST", body: JSON.stringify({ results }) }),
};
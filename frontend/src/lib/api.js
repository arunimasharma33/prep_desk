const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let authToken = null;
export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem("prepdesk_token", token);
  else localStorage.removeItem("prepdesk_token");
}
export function loadStoredToken() {
  authToken = localStorage.getItem("prepdesk_token");
  return authToken;
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, isForm = false, rawResponse = false } = {}) {
  const headers = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (rawResponse) {
    if (!res.ok) {
      let detail = "Request failed";
      try { detail = (await res.json()).detail || detail; } catch { /* noop */ }
      throw new ApiError(detail, res.status);
    }
    return res;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const detail = data?.detail || "Something went wrong. Please try again.";
    throw new ApiError(typeof detail === "string" ? detail : JSON.stringify(detail), res.status);
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  verifyOtp: (payload) => request("/api/auth/verify-otp", { method: "POST", body: payload }),
  resendOtp: (payload) => request("/api/auth/resend-otp", { method: "POST", body: payload }),
  forgotPassword: (payload) => request("/api/auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload) => request("/api/auth/reset-password", { method: "POST", body: payload }),
  me: () => request("/api/auth/me"),

  // resume upload / extraction
  extractResume: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/resume/extract", { method: "POST", body: form, isForm: true });
  },

  // analysis
  analyze: (payload) => request("/api/analyze", { method: "POST", body: payload }),
  getAnalysis: (id) => request(`/api/analyze/${id}`),
  listAnalyses: () => request("/api/history/analyses"),
  deleteAnalysis: (id) => request(`/api/analyze/${id}`, { method: "DELETE" }),

  // plan
  createPlan: (payload) => request("/api/plan", { method: "POST", body: payload }),
  getPlan: (id) => request(`/api/plan/${id}`),
  listPlans: () => request("/api/plan"),
  updateProgress: (id, day, completed) =>
    request(`/api/plan/${id}/progress`, { method: "PATCH", body: { day, completed } }),
  deletePlan: (id) => request(`/api/plan/${id}`, { method: "DELETE" }),

  // resume builder
  listTemplates: () => request("/api/resume/templates"),
  improveResume: (payload) => request("/api/resume/improve", { method: "POST", body: payload }),
  saveResume: (payload) => request("/api/resume", { method: "POST", body: payload }),
  listResumes: () => request("/api/resume"),
  getResume: (id) => request(`/api/resume/${id}`),
  deleteResume: (id) => request(`/api/resume/${id}`, { method: "DELETE" }),
  downloadResumePdf: (payload) => request("/api/resume/pdf", { method: "POST", body: payload, rawResponse: true }),
  downloadSavedResumePdf: (id) => request(`/api/resume/${id}/pdf`, { rawResponse: true }),
  previewResume: (payload) => request("/api/resume/preview", { method: "POST", body: payload }),

  health: () => request("/api/health"),
};

export { ApiError };

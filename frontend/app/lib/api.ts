// In the browser, use the relative /api path (handled by Nginx). 
// On the server (Next.js SSR), use the internal Docker network URL.
const API_URL = typeof window !== "undefined" 
  ? (process.env.NEXT_PUBLIC_API_URL === "http://localhost:8000" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "/api"))
  : (process.env.INTERNAL_API_URL || "http://backend:8000");

let inMemoryToken: string | null = null;

export function setToken(token: string | null) {
  inMemoryToken = token;
}

export function getToken() {
  return inMemoryToken;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Une erreur est survenue");
  }
  return response.json();
}

export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<unknown> {
  const headers = new Headers(options.headers || {});
  
  if (inMemoryToken) {
    headers.set("Authorization", `Bearer ${inMemoryToken}`);
  }

  const config: RequestInit = {
    cache: "no-store",
    ...options,
    headers,
    credentials: "include",
  };

  let response = await fetch(`${API_URL}${endpoint}`, config);

  if (response.status === 401) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      setToken(data.access_token);
      headers.set("Authorization", `Bearer ${data.access_token}`);

      response = await fetch(`${API_URL}${endpoint}`, {
        ...config,
        headers,
      });
    } else {
      // Both access and refresh tokens are invalid
      // Only hard-redirect if we had an in-memory token (i.e. session expired mid-session)
      // On a cold visit with no token, just throw so AuthContext can handle gracefully
      const hadActiveToken = !!inMemoryToken;
      setToken(null);
      if (hadActiveToken && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }
  }

  return handleResponse(response);
}

export const api = {
  login: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    return handleResponse(response);
  },

  register: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  logout: async () => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setToken(null);
    return handleResponse(response);
  },

  getMe: async () => {
    return fetchWithAuth("/auth/me");
  },

  registerInvite: async (data: Record<string, unknown>) => {
    const response = await fetch(`${API_URL}/auth/register-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getCompany: async () => {
    return fetchWithAuth("/companies/me");
  },

  createClientCompany: async (data: Record<string, unknown>) => {
    const response = await fetchWithAuth("/companies/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response;
  },

  updateCompany: async (data: Record<string, unknown>) => {
    const response = await fetchWithAuth("/companies/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response;
  },

  activateTrial: async () => {
    return fetchWithAuth("/companies/activate-trial", {
      method: "POST",
    });
  },

  getExpenses: async (params: Record<string, string | number | undefined> = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });

    const query = searchParams.toString();
    return fetchWithAuth(`/expenses${query ? `?${query}` : ""}`);
  },

  getExpense: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}`);
  },

  createExpense: async (data: Record<string, unknown>) => {
    return fetchWithAuth("/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateExpense: async (expenseId: string, data: Record<string, unknown>) => {
    return fetchWithAuth(`/expenses/${expenseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deleteExpense: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}`, {
      method: "DELETE",
    });
  },

  submitExpense: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}/submit`, {
      method: "POST",
    });
  },

  cancelExpense: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}/cancel`, {
      method: "POST",
    });
  },

  uploadAttachments: async (expenseId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return fetchWithAuth(`/expenses/${expenseId}/attachments`, {
      method: "POST",
      body: formData,
    });
  },

  deleteAttachment: async (expenseId: string, attachmentId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  },

  getAdvances: async (params: Record<string, string | undefined> = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return fetchWithAuth(`/advances${query ? `?${query}` : ""}`);
  },

  getAdvance: async (advanceId: string) => {
    return fetchWithAuth(`/advances/${advanceId}`);
  },

  createAdvance: async (data: Record<string, unknown>) => {
    return fetchWithAuth("/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  approveAdvance: async (advanceId: string) => {
    return fetchWithAuth(`/advances/${advanceId}/approve`, {
      method: "POST",
    });
  },

  validateFinancialAdvance: async (advanceId: string) => {
    return fetchWithAuth(`/advances/${advanceId}/validate-financial`, {
      method: "POST",
    });
  },

  disburseAdvance: async (advanceId: string) => {
    return fetchWithAuth(`/advances/${advanceId}/disburse`, {
      method: "POST",
    });
  },

  rejectAdvance: async (advanceId: string) => {
    return fetchWithAuth(`/advances/${advanceId}/reject`, {
      method: "POST",
    });
  },

  reconcileAdvance: async (advanceId: string) => {
    return fetchWithAuth(`/advances/${advanceId}/reconcile`, {
      method: "POST",
    });
  },

  getUsers: async () => {
    return fetchWithAuth("/users");
  },

  createUser: async (data: Record<string, unknown>) => {
    const response = await fetchWithAuth("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response;
  },

  inviteUser: async (data: Record<string, unknown>) => {
    const response = await fetchWithAuth("/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response;
  },

  updateUserRole: async (userId: string, data: Record<string, unknown>) => {
    return fetchWithAuth(`/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateUserScope: async (userId: string, data: { scope_type: string; scope_id?: string | null }) => {
    return fetchWithAuth(`/users/${userId}/scope`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  activateUser: async (userId: string) => {
    return fetchWithAuth(`/users/${userId}/activate`, { method: "PATCH" });
  },

  deactivateUser: async (userId: string) => {
    return fetchWithAuth(`/users/${userId}/deactivate`, { method: "PATCH" });
  },

  approveExpense: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}/approve`, { method: "POST" });
  },

  rejectExpense: async (expenseId: string, data: { comment: string }) => {
    return fetchWithAuth(`/expenses/${expenseId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  payExpense: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}/mark-as-paid`, { method: "POST" });
  },

  validateFinancialExpense: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}/validate-financial`, { method: "POST" });
  },

  addExpenseComment: async (expenseId: string, data: { comment: string }) => {
    return fetchWithAuth(`/expenses/${expenseId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  getExpenseLogs: async (expenseId: string) => {
    return fetchWithAuth(`/expenses/${expenseId}/logs`);
  },

  getDashboardSummary: async (query?: string) => {
    return fetchWithAuth(`/dashboard/summary${query ? `?${query}` : ""}`);
  },

  getDashboardByCategory: async (query?: string) => {
    return fetchWithAuth(`/dashboard/by-category${query ? `?${query}` : ""}`);
  },

  getDashboardMonthlyTrend: async (query?: string) => {
    return fetchWithAuth(`/dashboard/monthly-trend${query ? `?${query}` : ""}`);
  },

  getDashboardRecentExpenses: async (query?: string) => {
    return fetchWithAuth(`/dashboard/recent-expenses${query ? `?${query}` : ""}`);
  },

  exportExpensesExcel: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/expenses/excel${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/expenses/excel${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Excel");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_export_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportExpensesPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/expenses/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/expenses/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_report_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportExpensesCsv: async (query?: string) => {
    return api.exportExpensesExcel(query);
  },

  exportPayrollExcel: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/payroll/excel${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/payroll/excel${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Excel Paie");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_reimbursements_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportPayrollPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/payroll/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/payroll/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export PDF Paie");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_reimbursements_report_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportAdvancesPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/advances/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/advances/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export PDF Avances");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advances_reconciliation_report_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportRejectedExpensesPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/rejections/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/rejections/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export PDF des rejets");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rejected_expenses_report_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportAttachmentsZip: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/attachments/zip${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/attachments/zip${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors du téléchargement du ZIP");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowbon_attachments_${new Date().toISOString().split("T")[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // ─── Ledger/Comptabilité Exports ──────────────────────────────────────────
  exportLedgerExcel: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/ledger/excel${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/ledger/excel${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Grand Livre Excel");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportLedgerPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/ledger/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/ledger/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Grand Livre PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // ─── Treasury/Trésorerie Exports ──────────────────────────────────────────
  exportTreasuryExcel: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/treasury/excel${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/treasury/excel${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Trésorerie Excel");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treasury_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportTreasuryPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/treasury/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/treasury/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Trésorerie PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treasury_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // ─── Projects Exports ─────────────────────────────────────────────────────
  exportProjectsExcel: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/projects/excel${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/projects/excel${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Projets Excel");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportProjectsPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/projects/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/projects/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Projets PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `projects_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // ─── Departments Exports ──────────────────────────────────────────────────
  exportDepartmentsExcel: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/departments/excel${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/departments/excel${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Départements Excel");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `departments_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportDepartmentsPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/departments/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/departments/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Départements PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `departments_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // ─── Audit/Workflow Exports ───────────────────────────────────────────────
  exportAuditExcel: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/audit/excel${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/audit/excel${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Audit Excel");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_workflow_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  exportAuditPdf: async (query?: string) => {
    const headers = new Headers();
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const config: RequestInit = { credentials: "include", headers };
    let response = await fetch(`${API_URL}/exports/audit/pdf${query ? `?${query}` : ""}`, config);
    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setToken(data.access_token);
        headers.set("Authorization", `Bearer ${data.access_token}`);
        response = await fetch(`${API_URL}/exports/audit/pdf${query ? `?${query}` : ""}`, { credentials: "include", headers });
      } else {
        window.location.href = "/login";
        throw new Error("Session expirée");
      }
    }
    if (!response.ok) {
      throw new Error("Erreur lors de l'export Audit PDF");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_workflow_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  getCategories: async (onlyActive?: boolean) => {
    return fetchWithAuth(`/categories${onlyActive ? "?only_active=true" : ""}`);
  },

  addCategory: async (data: { name: string; code?: string }) => {
    return fetchWithAuth("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: string, data: { name?: string; code?: string; is_active?: boolean }) => {
    return fetchWithAuth(`/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // ─── Notifications ───────────────────────────────────────────────────────────
  getNotifications: async (page = 1, limit = 20) => {
    return fetchWithAuth(`/notifications?page=${page}&limit=${limit}`);
  },

  getUnreadCount: async () => {
    return fetchWithAuth("/notifications/unread-count");
  },

  markNotificationRead: async (id: string) => {
    return fetchWithAuth(`/notifications/${id}/read`, { method: "POST" });
  },

  markAllNotificationsRead: async () => {
    return fetchWithAuth("/notifications/read-all", { method: "POST" });
  },

  getNotifPreferences: async () => {
    return fetchWithAuth("/notifications/preferences");
  },

  updateNotifPreferences: async (data: {
    notify_in_app?: boolean;
    notify_email?: boolean;
    notify_on_created?: boolean;
    notify_on_approved?: boolean;
    notify_on_rejected?: boolean;
    notify_on_paid?: boolean;
  }) => {
    return fetchWithAuth("/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // ─── Super Admin ─────────────────────────────────────────────────────────────

  getSuperAdminStats: async () => {
    return fetchWithAuth("/super-admin/stats");
  },

  getSuperAdminCompanies: async () => {
    return fetchWithAuth("/super-admin/companies");
  },

  updateCompanySubscription: async (
    companyId: string,
    data: { subscription_plan?: string; subscription_status?: string; max_users?: number }
  ) => {
    return fetchWithAuth(`/super-admin/companies/${companyId}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  impersonateCompany: async (companyId: string) => {
    return fetchWithAuth(`/super-admin/impersonate/${companyId}`, { method: "POST" });
  },

  getSuperAdminAuditLogs: async () => {
    return fetchWithAuth("/super-admin/audit-logs");
  },

  purgeCompany: async (companyId: string) => {
    return fetchWithAuth(`/super-admin/companies/${companyId}`, {
      method: "DELETE",
    });
  },

  // ─── Exercices Comptables ─────────────────────────────────────────────────────

  getFiscalYears: async () => {
    return fetchWithAuth("/fiscal-years");
  },

  getActiveFiscalYear: async () => {
    return fetchWithAuth("/fiscal-years/active");
  },

  createFiscalYear: async (data: { label: string; start_date: string; end_date: string }) => {
    return fetchWithAuth("/fiscal-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  closeFiscalYear: async (fiscalYearId: string) => {
    return fetchWithAuth(`/fiscal-years/${fiscalYearId}/close`, {
      method: "POST",
    });
  },

  // ─── Boîte de Suggestions ───────────────────────────────────────────────────

  getSuggestions: async () => {
    return fetchWithAuth("/suggestions");
  },

  createSuggestion: async (data: {
    title: string;
    content: string;
    category: string;
    is_anonymous: boolean;
  }) => {
    return fetchWithAuth("/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateSuggestion: async (
    id: string,
    data: { status?: string; admin_response?: string }
  ) => {
    return fetchWithAuth(`/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deleteSuggestion: async (id: string) => {
    return fetchWithAuth(`/suggestions/${id}`, {
      method: "DELETE",
    });
  },

  // ─── Caisses (Cash Register) ───────────────────────────────────────────────
  listCaisses: async () => {
    return fetchWithAuth("/caisses");
  },

  createCaisse: async (data: { name: string; currency?: string; account_type?: string; bank_name?: string; account_number?: string; accounting_account_id?: string; cashier_ids?: string[] }) => {
    return fetchWithAuth("/caisses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  assignCashiersToCaisse: async (caisseId: string, cashierIds: string[]) => {
    return fetchWithAuth(`/caisses/${caisseId}/cashiers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashier_ids: cashierIds }),
    });
  },

  getCaisseTransactions: async (caisseId: string) => {
    return fetchWithAuth(`/caisses/${caisseId}/transactions`);
  },

  replenishCaisse: async (caisseId: string, data: { amount: number; description?: string; source?: string; attachment_url?: string; attachment_name?: string }) => {
    return fetchWithAuth(`/caisses/${caisseId}/replenish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  withdrawCaisse: async (caisseId: string, data: { amount: number; description?: string; source?: string; attachment_url?: string; attachment_name?: string }) => {
    return fetchWithAuth(`/caisses/${caisseId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  uploadCashJustificatif: async (caisseId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetchWithAuth(`/caisses/${caisseId}/upload`, {
      method: "POST",
      body: formData,
    });
  },

  listCashSources: async () => {
    return fetchWithAuth("/caisses/sources");
  },

  createCashSource: async (data: { name: string; type?: string }) => {
    return fetchWithAuth("/caisses/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deleteCashSource: async (sourceId: string) => {
    return fetchWithAuth(`/caisses/sources/${sourceId}`, {
      method: "DELETE",
    });
  },

  // ─── Départements ────────────────────────────────────────────────────────────

  getDepartments: async () => {
    return fetchWithAuth("/departments");
  },

  createDepartment: async (data: { name: string; description?: string }) => {
    return fetchWithAuth("/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateDepartment: async (id: string, data: { name?: string; description?: string; is_active?: boolean }) => {
    return fetchWithAuth(`/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateUserDepartments: async (userId: string, departmentIds: string[], primaryDepartmentId?: string) => {
    const params = new URLSearchParams();
    departmentIds.forEach(id => params.append("department_ids", id));
    if (primaryDepartmentId) params.set("primary_department_id", primaryDepartmentId);
    return fetchWithAuth(`/users/${userId}/departments?${params.toString()}`, {
      method: "PUT",
    });
  },

  // ─── Accounting ───────────────────────────────────────────────
  listAccountingAccounts: async () => {
    return fetchWithAuth("/accounting/accounts");
  },

  getAccountingPlan: async () => {
    return fetchWithAuth("/accounting/plan");
  },

  createAccountingPlanItem: async (data: { account_code: string; account_name: string; category_name: string; category_description?: string; account_type?: string }) => {
    return fetchWithAuth("/accounting/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deletePlanItemMapping: async (categoryId: string) => {
    return fetchWithAuth(`/accounting/plan/item?category_id=${categoryId}`, {
      method: "DELETE",
    });
  },

  listLedgerEntries: async () => {
    return fetchWithAuth("/accounting/ledger");
  },

  // ─── Projects ─────────────────────────────────────────────────
  listProjects: async (includeInactive = false) => {
    return fetchWithAuth(`/projects?include_inactive=${includeInactive}`);
  },

  listProjectMembers: async (projectId: string) => {
    return fetchWithAuth(`/projects/${projectId}/members`);
  },

  createProject: async (data: { name: string; code?: string; description?: string }) => {
    return fetchWithAuth("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateProject: async (projectId: string, data: { name?: string; code?: string; description?: string; is_active?: boolean }) => {
    return fetchWithAuth(`/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  deleteProject: async (projectId: string) => {
    return fetchWithAuth(`/projects/${projectId}`, { method: "DELETE" });
  },

  // ─── Multi-Company ─────────────────────────────────────────────
  getMyCompanies: async () => {
    return fetchWithAuth("/users/me/companies");
  },

  switchCompany: async (companyId: string) => {
    return fetchWithAuth(`/auth/switch-company?company_id=${companyId}`, {
      method: "POST",
    });
  },

  // ─── Treasury ────────────────────────────────────────────────
  getTreasuryAccounts: async (isActive?: boolean) => {
    const params = isActive !== undefined ? `?is_active=${isActive}` : "";
    return fetchWithAuth(`/treasury/accounts${params}`);
  },

  createTreasuryAccount: async (data: {
    name: string; user_label: string; type: string;
    currency: string; opening_balance?: number; accounting_account_id?: string;
  }) => {
    return fetchWithAuth("/treasury/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  updateTreasuryAccount: async (id: string, data: {
    name?: string; user_label?: string; is_active?: boolean; accounting_account_id?: string;
  }) => {
    return fetchWithAuth(`/treasury/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  getTreasuryTransactions: async (params?: {
    account_id?: string; type?: string; status?: string;
    from_date?: string; to_date?: string; skip?: number; limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.account_id) q.append("account_id", params.account_id);
    if (params?.type) q.append("type", params.type);
    if (params?.status) q.append("status", params.status);
    if (params?.from_date) q.append("from_date", params.from_date);
    if (params?.to_date) q.append("to_date", params.to_date);
    if (params?.skip !== undefined) q.append("skip", String(params.skip));
    if (params?.limit !== undefined) q.append("limit", String(params.limit));
    return fetchWithAuth(`/treasury/transactions?${q.toString()}`);
  },

  createTreasuryTransaction: async (data: {
    treasury_account_id: string; type: string; amount: number;
    currency: string; source_type: string; description?: string;
    category_id?: string; project_id?: string; department_id?: string;
    linked_expense_id?: string; linked_advance_id?: string;
    from_treasury_account_id?: string; to_treasury_account_id?: string;
    reference?: string; external_reference?: string;
  }) => {
    return fetchWithAuth("/treasury/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  validateTreasuryTransaction: async (id: string, data: { status: "VALIDATED" | "REJECTED"; description?: string }) => {
    return fetchWithAuth(`/treasury/transactions/${id}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
};

export default api;

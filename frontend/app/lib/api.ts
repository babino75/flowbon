const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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
      setToken(null);
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

  getDashboardRecentExpenses: async (status?: string) => {
    return fetchWithAuth(`/dashboard/recent-expenses${status ? `?status=${status}` : ""}`);
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

  getCategories: async (onlyActive?: boolean) => {
    return fetchWithAuth(`/categories${onlyActive ? "?only_active=true" : ""}`);
  },

  addCategory: async (data: { name: string; code?: string }) => {
    return fetchWithAuth("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: string, data: { name?: string; code?: string; is_active?: boolean }) => {
    return fetchWithAuth(`/categories/${id}`, {
      method: "PATCH",
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
};



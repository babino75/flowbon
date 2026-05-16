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
};

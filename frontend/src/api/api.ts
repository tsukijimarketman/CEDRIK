import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required for cookies
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  // Ensure credentials are sent with every request
  // Flask-JWT-Extended CSRF cookie/header names
  // It sets a non-HttpOnly cookie named `csrf_access_token` to be sent back as `X-CSRF-TOKEN`
  xsrfCookieName: "csrf_access_token",
  xsrfHeaderName: "X-CSRF-TOKEN",
  withXSRFToken: true,
});

// Ensure CSRF header is set even in cross-site scenarios
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    if (typeof document !== "undefined") {
      const token = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("csrf_access_token="))
        ?.split("=")?.[1];
      if (token) {
        const decoded = decodeURIComponent(token);
        if (config.headers instanceof AxiosHeaders) {
          config.headers.set("X-CSRF-TOKEN", decoded);
        } else {
          const h = new AxiosHeaders(config.headers);
          h.set("X-CSRF-TOKEN", decoded);
          config.headers = h;
        }
      }
    }
  } catch (_e) {
    // ignore cookie parsing errors
  }
  return config;
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.error(
        "Authentication error:",
        error.response?.data?.msg || "Not authenticated"
      );
      // You might want to redirect to login or refresh the token here
    }
    return Promise.reject(error);
  }
);

// Reusable pagination response type
export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  total: number;
};

export const authApi = {
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    role?: string;
  }) => {
    return api.post("/auth/register", userData);
  },
  login: async (credentials: { email: string; password: string }) => {
    return api.post("/auth/login", credentials);
  },
  logout: async () => {
    return api.get("/auth/logout");
  },
  me: async () => {
    return api.get("/auth/me");
  },
  updateMe: async (data: { username?: string; password?: string; currentPassword?: string; }) => {
    return api.put("/auth/me", data);
  },
  listUsers: async () => {
    return api.get<UserRecord[]>("/auth/users");
  },
  updateUser: async (
    userId: string,
    data: {
      username?: string;
      email?: string;
      role?: string;
      status?: "active" | "inactive";
    }
  ) => {
    return api.put(`/auth/users/${userId}`, data);
  },
};

// Memory Types
export type MemoryItem = {
  id: string;
  title: string;
  mem_type: string;
  text: string;
  file_id: string;
  permission: string[];
  tags: string[];
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type MemoryCreateRequest = {
  title: string;
  text: string;
  tags: string[];
  file?: File | null;
};

export type MemoryGetRequest = {
  title?: string;
  mem_type?: string;
  tags?: string[];
};

export type MemoryGetParams = {
  archive?: boolean;
  offset?: number;
  maxItems?: number;
  asc?: boolean;
};

// Memory API
export const memoryApi = {
  // Create a new memory (text or file)
  create: async (data: MemoryCreateRequest) => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("text", data.text);

    // Handle tags array
    if (data.tags && data.tags.length > 0) {
      data.tags.forEach((tag) => {
        formData.append("tags", tag);
      });
    }

    // Handle file if provided
    if (data.file) {
      formData.append("file", data.file);
    }

    return api.post("/memory/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Get memories with optional filters
  get: async (filters?: MemoryGetRequest, params?: MemoryGetParams) => {
    const queryParams: Record<string, string> = {};

    if (params?.archive !== undefined) {
      queryParams.archive = params.archive ? "1" : "0";
    }
    if (params?.offset !== undefined) {
      queryParams.offset = params.offset.toString();
    }
    if (params?.maxItems !== undefined) {
      queryParams.maxItems = params.maxItems.toString();
    }
    if (params?.asc !== undefined) {
      queryParams.asc = params.asc ? "1" : "0";
    }
    if (filters?.tags !== undefined) {
      queryParams.tags = filters.tags.join(",");
    }
    if (filters?.title !== undefined) {
      queryParams.title = filters.title;
    }

    if (filters?.mem_type !== undefined) {
      queryParams.mem_type = filters.mem_type;
    }

    return api.get<PaginatedResponse<MemoryItem>>("/memory/get", {
      params: queryParams
    });
  },

  // Get available memory types
  getMemTypes: async () => {
    return api.get<string[]>("/memory/mem-types");
  },

  // Update an existing memory
  update: async (memoryId: string, data: Partial<MemoryCreateRequest>) => {
    const formData = new FormData();

    if (data.title) {
      formData.append("title", data.title);
    }
    if (data.text) {
      formData.append("text", data.text);
    }

    // Handle tags array
    if (data.tags && data.tags.length > 0) {
      data.tags.forEach((tag) => {
        formData.append("tags", tag);
      });
    }

    // Handle file if provided
    if (data.file) {
      formData.append("file", data.file);
    }

    return api.put(`/memory/update/${memoryId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Delete a memory
  delete: async (memoryId: string) => {
    return api.delete(`/memory/delete/${memoryId}`);
  },

  // Restore a soft-deleted memory
  restore: async (memoryId: string) => {
    return api.put(`/memory/restore/${memoryId}`);
  },

  // Permanently delete a memory (hard delete)
  permanentDelete: async (memoryId: string) => {
    return api.delete(`/memory/permanent-delete/${memoryId}`);
  },
};

// Dedicated OTP API for signup flow (reuses the same backend endpoint for now)
export const otpApi = {
  signupOtp: async (email: string) => {
    return api.post("/auth/signup-otp", { email });
  },
};

export const passwordApi = {
  forgotPassword: async (email: string) => {
    return api.post("/auth/forgot-password", { email });
  },

  resetPassword: async (email: string, newPassword: string) => {
    return api.post("/auth/reset-password", {
      email,
      newPassword,
    });
  },
};
////
export type UserRecord = {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

//conversation
//title
//created_at

export type ChatSidebarTitle = {
  conversation: string;
  title: string;
  created_at: Date;
};

export type ChatSidebarNewChat = {
  conversation: string;
  title: string;
  created_at: Date;
};

export type ChatSidebarOpen = {
  text: string;
  created_at: Date;
};

export const sidebarTitleApi = {
  sidebarConversationGetTitle: async () => {
    const res = await api.get<ChatSidebarTitle[]>("/conversation/get");
    res.data = res.data.map((x) => ({
      ...x,
      created_at: new Date(x.created_at),
    }));
    return res;
  },
  updateChatTitle: (conversationId: string, title: string) =>
    api.put(`/conversation/update_title/${conversationId}`, { title }),
};

export const sidebarConversationOpen = {
  conversationOpen: async (id) => {
    const res = await api.get<ChatSidebarOpen[]>("/conversation/get/" + id);
    res.data = res.data.map((x) => ({
      ...x,
      created_at: new Date(x.created_at),
    }));
    return res;
  },
};

export const sidebarConversationCreate = {
  newChat: async () => {
    const res = await api.post<ChatSidebarNewChat>("/conversation/create");
    return res;
  },
};

export const sidebarConversationDelete = {
  chatDelete: async (conversationId: string) => {
    const res = await api.delete(`/conversation/delete/${conversationId}`);
    return res;
  },
};

// AI Chat API
export type ChatPrompt = {
  role: string;
  content: string;
};

export type ChatRequest = {
  conversation?: string | null;
  content: string;
  file: File | null;
  agent?: "professor" | "hacker";
};

export type ChatResponse = {
  conversation: string;
  reply: string;
  title?: string;
};

export const aiApi = {
  chat: async (data: ChatRequest) => {
    const formData = new FormData();
    formData.append("conversation", data.conversation || "");
    formData.append("content", data.content);

    // Only append file if it exists (not null)
    if (data.file) {
      formData.append("file", data.file);
    }

    // ✅ Send agent parameter to backend
    if (data.agent) {
      formData.append("agent", data.agent);
    }

    // ✅ Send overrides as JSON string
    const overrides = {};
    formData.append("overrides", JSON.stringify(overrides));

    return api.post<ChatResponse>("/ai/chat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

export type AuditLogRecord = {
  id: string;
  type: string;
  data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  user?: {
    id?: string;
    username?: string;
    email?: string;
    role?: string;
  } | null; // 👈 added this
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type AuditLogQuery = {
  archive: boolean;
  offset: number,
  maxItems: number,
  sort: string,
  sortAsc: boolean,
  query: string
}

export const auditApi = {
  list: async (options: AuditLogQuery) => {
    const params: Record<string, string> = {};
    params.archive = options.archive ? "true" : "false";
    params.offset = options.offset ? `${options.offset}` : "0";
    params.maxItems = options.maxItems ? `${options.maxItems}` : "0";
    if (options.sort != undefined || options.sort.length != 0) {
      params.sort = `${options.sort}-${options.sortAsc ? "asc" : "desc" }`;
    }
    if (options.query != undefined || options.query.length != 0) {
      params.username = options.query;
      params.type = options.query;
      params.ip = options.query;
    }

    const res = await api.get<PaginatedResponse<AuditLogRecord>>("/audit/get", {
      params,
    });
    return res;
  },
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;

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
  updateMe: async (data: { username?: string; password?: string }) => {
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
};

export type ChatResponse = {
  reply: string;
};

export const aiApi = {
  chat: async (data: ChatRequest) => {
    let formData = new FormData();
    formData.append("conversation", data.conversation || "");
    formData.append("content", data.content);
    formData.append("file", data.file);
    return api.post<ChatResponse>("/ai/chat", formData, {
      headers: {
        "Content-Type": undefined, // let axios set content-type
      },
    });
  },
};

export type AuditLogRecord = {
  id: string;
  type: string;
  data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export const auditApi = {
  list: async (options?: { archive?: boolean }) => {
    const params: Record<string, string> = {};
    if (options?.archive !== undefined) {
      params.archive = options.archive ? "true" : "false";
    }
    const res = await api.get<{ items: AuditLogRecord[]; page: number; total: number }>("/audit/get", {
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

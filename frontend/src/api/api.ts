import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  xsrfCookieName: "csrf_access_token",
  xsrfHeaderName: "X-CSRF-TOKEN",
  withXSRFToken: true,
});

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

// ===== TYPE DECLARATIONS (declare all types before usage) =====

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  total: number;
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
  deletedAt?: Date;
  deletedAtDir?: "gte" | "lte";
};

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
  } | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

export type AuditLogQuery = {
  archive: boolean;
  offset: number;
  maxItems: number;
  sort: string;
  sortAsc: boolean;
  query: string;
};

// ===== API IMPLEMENTATIONS =====

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

export const memoryApi = {
  create: async (data: MemoryCreateRequest) => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("text", data.text);

    if (data.tags && data.tags.length > 0) {
      data.tags.forEach((tag) => {
        formData.append("tags", tag);
      });
    }

    if (data.file) {
      formData.append("file", data.file);
    }

    return api.post("/memory/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

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
    if (params?.deletedAt && params?.deletedAtDir) {
      queryParams[`deleted_at-${params.deletedAtDir}`] = params.deletedAt.toISOString();
    }

    return api.get<PaginatedResponse<MemoryItem>>("/memory/get", {
      params: queryParams
    });
  },

  getMemTypes: async () => {
    return api.get<string[]>("/memory/mem-types");
  },

  update: async (memoryId: string, data: Partial<MemoryCreateRequest>) => {
    const formData = new FormData();

    if (data.title) {
      formData.append("title", data.title);
    }
    if (data.text) {
      formData.append("text", data.text);
    }

    if (data.tags && data.tags.length > 0) {
      data.tags.forEach((tag) => {
        formData.append("tags", tag);
      });
    }

    if (data.file) {
      formData.append("file", data.file);
    }

    return api.put(`/memory/update/${memoryId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  delete: async (memoryId: string) => {
    return api.delete(`/memory/delete/${memoryId}`);
  },

  restore: async (memoryId: string) => {
    return api.put(`/memory/restore/${memoryId}`);
  },

  permanentDelete: async (memoryId: string) => {
    return api.delete(`/memory/permanent-delete/${memoryId}`);
  },
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
  conversationOpen: async (id: string) => {
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

export const aiApi = {
  chat: async (data: ChatRequest, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append("conversation", data.conversation || "");
    formData.append("content", data.content);

    if (data.file) {
      formData.append("file", data.file);
    }

    if (data.agent) {
      formData.append("agent", data.agent);
    }

    const overrides = {};
    formData.append("overrides", JSON.stringify(overrides));

    return api.post<ChatResponse>("/ai/chat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      signal,
    });
  },

  chatStream: async (
  data: ChatRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<{ conversation: string }> => {
  const formData = new FormData();
  formData.append("conversation", data.conversation || "");
  formData.append("content", data.content);

  if (data.file) {
    formData.append("file", data.file);
  }

  if (data.agent) {
    formData.append("agent", data.agent);
  }

  const overrides = {};
  formData.append("overrides", JSON.stringify(overrides));

  let csrfToken = "";
  if (typeof document !== "undefined") {
    const token = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("csrf_access_token="))
      ?.split("=")?.[1];
    if (token) {
      csrfToken = decodeURIComponent(token);
    }
  }

  const response = await fetch(`${API_BASE_URL}/ai/chat-stream`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let conversationId = "";

  if (!reader) {
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log("✅ Stream reader completed");
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));

          if (data.type === "content") {
            onChunk(data.content);
          } else if (data.type === "done") {
            conversationId = data.conversation || "";
            console.log("✅ Received 'done' event with conversation:", conversationId);
            // ✅ DON'T break here - let the stream finish naturally
          } else if (data.type === "error") {
            throw new Error(data.content);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log("✅ Returning from chatStream with conversation:", conversationId);
  return { conversation: conversationId };
},
};

export const auditApi = {
  list: async (options: AuditLogQuery) => {
    const params: Record<string, string> = {};
    params.archive = options.archive ? "true" : "false";
    params.offset = options.offset ? `${options.offset}` : "0";
    params.maxItems = options.maxItems ? `${options.maxItems}` : "0";
    if (options.sort != undefined || options.sort.length != 0) {
      params.sort = `${options.sort}-${options.sortAsc ? "asc" : "desc"}`;
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

// Response interceptor (single, combined version)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error(
        "Authentication error:",
        error.response?.data?.msg || "Not authenticated"
      );
    }
    
    if (error.response) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;
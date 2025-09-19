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
};

// AI Chat API
export type ChatPrompt = {
  role: string;
  content: string;
};

export type ChatRequest = {
  conversation?: string | null;
  prompt: ChatPrompt;
};

export type ChatResponse = {
  reply: string;
};

export const aiApi = {
  chat: async (data: ChatRequest) => api.post<ChatResponse>("/ai/chat", data),
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

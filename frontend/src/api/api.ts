import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required for cookies
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  // Ensure credentials are sent with every request
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  withXSRFToken: true,
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

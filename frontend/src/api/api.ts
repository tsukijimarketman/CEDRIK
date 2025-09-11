import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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
    return api.post("/auth/logout");
  },
  verify: async () => {
    return api.get("/auth/verify");
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

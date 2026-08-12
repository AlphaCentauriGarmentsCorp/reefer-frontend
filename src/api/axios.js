import axios from "axios";

// One axios instance. baseURL from VITE_API_URL (…/api); services add /v1.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: false, // Bearer-token auth, separate origin
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const res = error.response;
    return Promise.reject({
      status: res?.status ?? 0,
      message: res?.data?.message || (res ? `Request failed (${res.status})` : "Network error"),
      errors: res?.data?.errors || null,
      response: res,
    });
  }
);

export default api;

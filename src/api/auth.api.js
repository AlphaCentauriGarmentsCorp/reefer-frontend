import api from "./axios";

export const loginApi = (data) => api.post("/login", data);
export const logout = () => api.post("/logout");
export const meApi = () => api.get("/me");

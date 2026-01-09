import api from "./axios";

export const loginApi = (data) => api.post("/login", data);
export const logout = () => api.post("/logout");
export const verifyOtpApi = (payload) => api.post("/auth/verify-otp", payload);
export const resendOtpApi = () => api.post("/auth/resend-otp");
export const meApi = () => api.get("/me");

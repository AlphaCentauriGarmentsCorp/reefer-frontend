import api from "./axios";

export const authApi = {
  // Login
  login: async (payload) => {
    try {
      const response = await api.post("/login/reefer", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Register
  register: async (payload) => {
    try {
      const response = await api.post("/register/reefer", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP
  verifyOtp: async (payload) => {
    try {
      const response = await api.post("/auth/verify-otp", payload);

      if (response.data?.token) {
        localStorage.setItem("token", response.data.token);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Resend OTP
  resendOtp: async () => {
    try {
      const response = await api.post("/auth/resend-otp");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await api.post("/logout");
      localStorage.removeItem("token");
    } catch (error) {
      throw error;
    }
  },

  meApi: async () => {
    try {
      await api.get("/me");
    } catch (error) {
      throw error;
    }
  },
};

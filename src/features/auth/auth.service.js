import { loginApi } from "../../api/auth.api";

export const loginService = async (payload) => {
  const { data } = await loginApi(payload);
  return data;
};

export const registerService = async (payload) => {
  const { data } = await register(payload);
  return data;
};

export const verifyOtpService = async (payload) => {
  const { data } = await verifyOtpApi(payload);
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
  return data;
};

export const resendOtpService = async () => {
  const { data } = await resendOtpApi();
  return data;
};

export const logoutService = async () => {
  await logoutApi();
  localStorage.removeItem("token");
};

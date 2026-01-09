import { loginApi } from "../../api/auth.api";

export const loginService = async (credentials) => {
  const response = await loginApi(credentials);
  return response.data;
};

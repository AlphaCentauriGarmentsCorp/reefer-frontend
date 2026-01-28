// import { loginApi } from "../../api/auth";

// export const loginService = async (payload) => {
//   const { data } = await loginApi(payload);
//   return data;
// };

<<<<<<< Updated upstream
export const verifyOtpService = async (payload) => {
  const { data } = await verifyOtpApi(payload);
  if (data.token) {
    localStorage.setItem("token", data.token);
  }
  return data;
};
=======
// export const registerService = async (payload) => {
//   const { data } = await register(payload);
//   return data;
// };

// export const verifyOtpService = async (payload) => {
//   const { data } = await verifyOtpApi(payload);
//   if (data.token) {
//     localStorage.setItem("token", data.token);
//   }
//   return data;
// };
>>>>>>> Stashed changes

// export const resendOtpService = async () => {
//   const { data } = await resendOtpApi();
//   return data;
// };

<<<<<<< Updated upstream
export const logoutService = async () => {
  await logoutApi();
  localStorage.removeItem("token");
};

=======
// export const logoutService = async () => {
//   await logoutApi();
//   localStorage.removeItem("token");
// };
>>>>>>> Stashed changes

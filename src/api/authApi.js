import api from "./axios";

/*
 * Bearer-token auth against ash-ai-backend's /api/v2 surface.
 *
 * That backend serves several storefronts from one Laravel app, so REEFER has its own
 * front door — login/reefer, register/reefer — while the token-bearing routes (logout,
 * me) are shared across all of them. The version lives here rather than in VITE_API_URL
 * because the catalogue endpoints are still on /v1; keeping the base URL version-free
 * lets the two move independently.
 *
 * One behavioural difference from the standalone Reefer_Backend this UI was written
 * against: register does NOT return a token. It creates the account and mails an OTP,
 * and the account cannot be used until verifyOtp succeeds — that is the call that
 * returns the token. Any sign-up flow here needs an OTP step between the two.
 */
export const authApi = {
  login: async (payload) => {
    const res = await api.post("/v2/login/reefer", {
      email: payload.email,
      password: payload.password,
    });
    if (res.data?.token) localStorage.setItem("token", res.data.token);
    return res.data;
  },

  // Answers { message, user } — deliberately tokenless. See verifyOtp.
  register: async (payload) => {
    const res = await api.post("/v2/register/reefer", {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.password_confirmation ?? payload.password,
    });
    return res.data;
  },

  // The real end of registration: { user, token, token_type, message }.
  verifyOtp: async (payload) => {
    const res = await api.post("/v2/verify-otp", {
      email: payload.email,
      otp: payload.otp,
    });
    if (res.data?.token) localStorage.setItem("token", res.data.token);
    return res.data;
  },

  resendOtp: async (payload) =>
    (await api.post("/v2/resend-otp", { email: payload.email })).data,

  logout: async () => {
    try {
      await api.post("/v2/logout");
    } finally {
      // Dropped even if the call fails — a token the server already rejected is
      // worse than no token, because it keeps the UI believing it is signed in.
      localStorage.removeItem("token");
    }
  },

  // /me answers with the user object itself, not { user: … } — response()->json()
  // on a bare JsonResource serialises without the "data" envelope.
  meApi: async () => (await api.get("/v2/me")).data,

  /*
   * Not available on this backend.
   *
   * Reefer_Backend served /v1/auth/google, /forgot-password and /reset-password;
   * ash-ai-backend's v2 group has no equivalent. These stay as loud stubs rather
   * than being deleted so the pages that import them still build — and so the
   * failure is a legible message instead of a 404 on a URL nobody recognises.
   */
  google: async () => {
    throw { status: 501, message: "Google sign-in is not available on this backend yet.", errors: null };
  },
  forgotPassword: async () => {
    throw { status: 501, message: "Password reset is not available on this backend yet.", errors: null };
  },
  resetPassword: async () => {
    throw { status: 501, message: "Password reset is not available on this backend yet.", errors: null };
  },
};

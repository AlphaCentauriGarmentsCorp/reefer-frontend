import api from "./axios";

// Bearer-token auth against Reefer_Backend (/v1/auth/*). register/login return
// { message, token, user } and the token is stored for the axios interceptor.
export const authApi = {
  login: async (payload) => {
    const res = await api.post("/v1/auth/login", { email: payload.email, password: payload.password });
    if (res.data?.token) localStorage.setItem("token", res.data.token);
    return res.data;
  },
  register: async (payload) => {
    const res = await api.post("/v1/auth/register", { name: payload.name, email: payload.email, password: payload.password });
    if (res.data?.token) localStorage.setItem("token", res.data.token);
    return res.data;
  },
  // Sign in / sign up with a Google Identity Services ID token. The credential is
  // the only thing sent: the server re-verifies the JWT against Google and takes
  // every identity fact out of the verified claims, so there is nothing this layer
  // could usefully add — and anything it did add would be ignored. Returns
  // { message, token, user, created } where `created` marks a brand-new account.
  google: async (credential) => {
    const res = await api.post("/v1/auth/google", { credential });
    if (res.data?.token) localStorage.setItem("token", res.data.token);
    return res.data;
  },
  logout: async () => {
    try {
      await api.post("/v1/auth/logout");
    } finally {
      localStorage.removeItem("token");
    }
  },
  meApi: async () => (await api.get("/v1/auth/me")).data.user,

  // Unauthenticated on purpose — someone locked out of their account cannot
  // present a token. The server answers sendLink identically whether or not the
  // address exists, so callers must not branch on the result either.
  forgotPassword: async (payload) => (await api.post("/v1/auth/forgot-password", { email: payload.email })).data,
  resetPassword: async (payload) => {
    const res = await api.post("/v1/auth/reset-password", {
      email: payload.email,
      token: payload.token,
      password: payload.password,
      password_confirmation: payload.password_confirmation,
    });
    // A reset rotates the token, so the caller lands signed in rather than
    // bouncing back to a sign-in form with the password they just chose.
    if (res.data?.token) localStorage.setItem("token", res.data.token);
    return res.data;
  },
};

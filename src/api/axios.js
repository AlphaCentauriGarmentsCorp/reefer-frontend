import axios from "axios";

/*
 * The one axios instance for the REEFER storefront.
 *
 * This SPA is served from its own origin and talks to a shared Laravel backend
 * (ash-ai-backend) that hosts two APIs: the ERP owns /api/v2/*, the storefront
 * owns /api/storefront/v1/*. Every module under src/api/ asks for "/v1/..." and
 * the "…/api/storefront" half comes from here — the version prefix lives next to
 * the endpoints, the host lives in the environment.
 *
 * VITE_API_URL is accepted in either form, on purpose:
 *   http://127.0.0.1:8000/api             ->  …/api/storefront   (/storefront added)
 *   http://127.0.0.1:8000/api/storefront  ->  unchanged          (never doubled)
 * That forgiveness is the point. A deploy configured with the shorter form would
 * otherwise 404 every single call, silently, from a build that looks healthy.
 *
 * Vite inlines VITE_* at BUILD time, not run time: changing it means a rebuild
 * (or a dev-server restart). Editing it on an already-built server does nothing.
 */
const ROOT = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
const STOREFRONT_BASE = /\/storefront$/.test(ROOT) ? ROOT : `${ROOT}/storefront`;

//
// axios here is 0.27, not the 1.x the source was built against. Checked against
// the installed 0.27.2 rather than assumed, because the two differ in how headers
// are carried: in 0.27 a request interceptor still sees the UNFLATTENED shape
// ({ common, get, post, …, plus the instance's own keys }) and dispatchRequest
// collapses it afterwards, with the top-level keys winning. Assigning
// `config.headers.Authorization` below therefore lands on the wire either way —
// no AxiosHeaders instance, no `.set()`, nothing to change. Same for baseURL
// joining, null/undefined param dropping, and error.response, all of which behave
// identically in 0.27. Do not "modernise" this to the 1.x header API: that would
// break it on the version this app actually installs.
const api = axios.create({
  baseURL: STOREFRONT_BASE,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: false, // Bearer-token auth, separate origin
});

// Auth is a Bearer token in localStorage under "token" — not a cookie, not a
// session. That is exactly why withCredentials stays false: nothing here depends
// on the browser attaching anything cross-origin, so the API never has to be
// configured to trust this origin with credentials.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// One normalised error shape for the whole app, so no caller has to know axios:
// they read err.status / err.message / err.errors. `message` is already
// presentable (the backend writes shopper-facing text for 422s), with a fallback
// for the case that matters most — a request that never reached the server at all
// (CORS refused, wrong host, backend down), which arrives with no response and
// is reported as status 0.
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

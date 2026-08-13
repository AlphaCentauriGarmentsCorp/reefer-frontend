// The single door to the ERP API. Nothing else in the app may call fetch or
// axios directly.
//
// Replaces two things from the static app:
//   * `const API_BASE = window.location.origin + "/api"` repeated at the top of
//     every page — the SPA is served from its own origin, so the base URL comes
//     from VITE_API_URL instead.
//   * `authFetch()` / `authDownload()` in js/auth-guard.js — the Bearer token is
//     attached by a request interceptor now, so no caller has to remember it.

import axios from 'axios';

// VITE_API_URL is the STOREFRONT's base (…/api), because the shop and the stock
// manager are now one SPA on one origin with one dev server. The stock module hangs
// off /stocks on that same backend, so the segment is appended here rather than kept
// in a second env var — one value to change, and no way for the two halves to drift
// onto different hosts.
//
//     VITE_API_URL=http://127.0.0.1:8000/api   ->   …/api/stocks/inventory
//
// Every call site stays a BARE path ("/inventory", "/auth/login"), exactly as it was
// when this ran standalone. That is deliberate: the page-level route paths were
// prefixed with /stocks, the endpoint paths were not, and confusing the two produces
// …/api/stocks/stocks/inventory.
export const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/stocks';

// Same localStorage key the static pages used, so an existing browser session
// carries over and the two apps can't disagree about who is logged in.
export const SESSION_KEY = 'ash_session';

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // A corrupt blob used to throw out of getSession() and take the page with
    // it; treat it as "logged out" instead.
    return null;
  }
}

export function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// A 401 means the token this app is holding is dead. The static pages handled
// that on the next page load (requireAuth() bounced you to login.html) and
// authDownload() called logout() outright. An SPA never reloads, so the
// interceptor raises this event and AuthContext performs the same redirect.
export const UNAUTHORIZED_EVENT = 'ash:unauthorized';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const session = readSession();
  if (session && session.token) {
    config.headers.Authorization = 'Bearer ' + session.token;
  }
  return config;
});

// Every API error reaching a component is `{ status, message, data, isNetworkError }`.
//
//   status          HTTP status, or 0 when the request never got a response.
//   message         What the page should show. The Laravel API reports failures
//                   as `{ "error": "..." }` (see AuthController / routes/api.php),
//                   which is exactly what the old pages read via
//                   `data.error || "<fallback>"`.
//   data            The raw response body, for the few responses that carry more
//                   than an error string (login's 403s also return `status`).
//   isNetworkError  True when the backend could not be reached at all — the case
//                   the old pages reported as "Could not reach the backend...".
function normaliseError(error) {
  const response = error.response;

  if (!response) {
    return {
      status: 0,
      message: error.message || 'Network error',
      data: null,
      isNetworkError: true,
      original: error,
    };
  }

  const data = response.data;
  let message = null;
  if (data && typeof data === 'object') {
    message = data.error || data.message || null;
  } else if (typeof data === 'string' && data.trim()) {
    message = data;
  }

  return {
    status: response.status,
    message: message || 'Server responded with status ' + response.status,
    data: data ?? null,
    isNetworkError: false,
    original: error,
  };
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalised = normaliseError(error);
    if (normalised.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(normalised);
  },
);

// Port of authDownload() in js/auth-guard.js. A plain <a href> carries no
// Authorization header, so an auth-protected export answers 401 "Not logged
// in." — pull the bytes with the token attached, then hand them to the browser
// as a normal download. The filename comes from Content-Disposition when the
// server sends one.
export async function downloadFile(url, fallbackName) {
  let response;
  try {
    response = await client.get(url, { responseType: 'blob' });
  } catch (err) {
    // Same swallow-and-tell handling as the original: a 401 has already been
    // turned into a logout by the interceptor above, anything else gets the
    // one-line alert rather than an unhandled rejection.
    if (err.status !== 401) {
      window.alert('Download failed (' + err.status + '). Please try again.');
    }
    return;
  }

  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);

  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = match ? match[1] : fallbackName || 'download';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default client;

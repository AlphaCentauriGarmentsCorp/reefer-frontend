// Port of js/auth-guard.js.
//
// The static app re-derived the session on every page load: each page called
// requireAuth() (or requireAdmin()), which read localStorage and bounced you to
// login.html when there was no token. Here that state is held once, in context,
// and the bouncing is done by ProtectedRoute.
//
// escapeHtml() from auth-guard.js has no port: JSX escapes interpolated text by
// itself, which is what that helper existed to do.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import client, {
  SESSION_KEY,
  UNAUTHORIZED_EVENT,
  clearSession,
  readSession,
  writeSession,
} from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Read synchronously on the first render: a logged-in user reloading the page
  // must never flash the login screen on the way to their dashboard.
  const [session, setSession] = useState(() => readSession());

  // The API answered 401, so the token we hold is dead. Drop it — ProtectedRoute
  // sees the empty session and redirects to /login, which is what requireAuth()
  // did on the next page load in the static app.
  useEffect(() => {
    function onUnauthorized() {
      setSession(null);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Two tabs share one localStorage. If the other tab logs out, this one should
  // not keep pretending it has a session.
  useEffect(() => {
    function onStorage(event) {
      if (event.key === SESSION_KEY) setSession(readSession());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // POST /api/auth/login → { token, user: { username, full_name, role } }.
  // The whole payload is what the static login page stored under "ash_session",
  // so it is stored whole here too.
  const login = useCallback(async (username, password) => {
    const { data } = await client.post('/auth/login', { username, password });
    writeSession(data);
    setSession(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session ? session.user : null,
      token: session ? session.token : null,
      isAuthenticated: !!(session && session.token),
      isAdmin: !!(session && session.user && session.user.role === 'admin'),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

export default AuthContext;

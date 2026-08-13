// Route-level replacement for the requireAuth() / requireAdmin() call that sat
// at the top of every protected page's inline <script>.
//
//   requireAuth()  — no token in localStorage → window.location = "login.html"
//   requireAdmin() — logged in but role !== "admin" → "dashboard.html"
//
// `replace` on both redirects so the guarded URL doesn't sit in the history
// stack waiting for the Back button to bounce off it again.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ requireAdmin = false, children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Where they were headed rides along, so a login triggered by an expired
    // token can return them there instead of always dumping them on /dashboard.
    return <Navigate to="/stocks/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/stocks/dashboard" replace />;
  }

  return children ?? <Outlet />;
}

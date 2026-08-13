/*
 * The stock manager, mounted inside the storefront SPA.
 *
 * This is the whole ERP behind one route subtree. It keeps its own auth, its own
 * layout and its own stylesheet, and shares only the origin and the build with the
 * shop around it.
 *
 * Three things make that coexistence safe:
 *
 * 1. `.stocks-root` — every rule in theme.css and the page stylesheets was rewritten
 *    to sit under this class. The admin theme styles `body`, `table`, `h1` and the
 *    like, which unscoped would repaint the storefront. It cannot escape this div.
 *
 * 2. A SEPARATE SESSION. The shop stores its customer token under `token`; this
 *    stores a staff session under `ash_session`. Different keys, different backend
 *    tables (users vs stock_users), different login screens — signing into one has
 *    no effect on the other, which is correct: a shopper is not a warehouse user.
 *
 * 3. NO STOREFRONT CHROME. Storefront pages each render their own <Nav/> and
 *    <Footer/>; these render AppLayout's sidebar instead. Nothing is inherited, so
 *    nothing has to be suppressed.
 *
 * Routing note: the pages' internal links were prefixed with /stocks, while their API
 * calls were left bare (client.js appends /stocks to the base). Those two look
 * identical as strings — "/inventory" is both a page and an endpoint — and conflating
 * them yields …/api/stocks/stocks/inventory.
 */

import { Routes, Route, Navigate } from 'react-router-dom';

import './theme.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Catalog from './pages/Catalog';
import AdminUsers from './pages/AdminUsers';
import Scan from './pages/Scan';

export default function StocksApp() {
  return (
    // The class is what scopes the stylesheet; the sizing makes this div the page,
    // since theme.css's `body` rule (a full-height flex row holding the sidebar and
    // the main column) was rewritten onto `.stocks-root`.
    <div className="stocks-root" style={{ minHeight: '100vh' }}>
      <AuthProvider>
        <Routes>
          {/* Public: no session yet, so no sidebar either. */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="orders" element={<Orders />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="scan" element={<Scan />} />
            </Route>

            {/* Admin-only. Guarded a second time rather than relying on the sidebar
                simply not showing the link — a hidden link is not access control. */}
            <Route element={<ProtectedRoute requireAdmin />}>
              <Route element={<AppLayout />}>
                <Route path="admin-users" element={<AdminUsers />} />
              </Route>
            </Route>
          </Route>

          {/* Bare /stocks and anything unrecognised land on the dashboard, which
              bounces to /stocks/login when there is no session. */}
          <Route index element={<Navigate to="/stocks/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/stocks/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

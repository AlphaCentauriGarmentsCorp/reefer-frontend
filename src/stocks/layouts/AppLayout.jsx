// The application shell: the sidebar every protected page used to repeat in its
// own markup, plus the <div class="main"> the page content lives in.
//
// This is three of the old files folded into one place:
//   * the <div class="sidebar"> block copied into dashboard/orders/inventory/
//     catalog/admin-users .html — identical in each except for which item
//     carried `active` (and two of them had a stale, shorter Orders list).
//   * js/sidebar-nav.js — the accordion behaviour and the active-subitem sync.
//   * renderSessionBar() in js/auth-guard.js — the admin-only nav item and the
//     user card pinned to the bottom.
//
// Class names are unchanged so theme.css keeps applying.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Every page in this module is mounted under /stocks (App.jsx routes /stocks/*
// here). Link targets AND the comparisons that decide which item is highlighted
// both have to carry that prefix, so both are built through this one helper.
//
// Keeping them separate is what broke the sidebar once already: the link hrefs
// were prefixed while the paths sitting in arrays and equality checks were not,
// which left the sub-items pointing at /orders?tab=… — a path the storefront
// around us does not route, so all nine fell through to its 404 — and left every
// active-state check comparing '/dashboard' against '/stocks/dashboard', so no
// item ever highlighted and no group ever auto-expanded.
//
// Note this is for ROUTES only. API paths stay bare ('/inventory'), because
// client.js appends /stocks to the base URL itself; running an endpoint through
// here yields …/api/stocks/stocks/inventory.
const BASE = '/stocks';
const route = (path) => BASE + path;

// Group ids match the old element ids (subs-dashboard / subs-orders /
// subs-catalog) so this file reads against sidebar-nav.js one-to-one.
const GROUP_FOR_PATH = {
  [route('/dashboard')]: 'subs-dashboard',
  [route('/orders')]: 'subs-orders',
  [route('/catalog')]: 'subs-catalog',
};

// Dashboard subtabs are hash-driven views of one page, not separate routes —
// dashboard.html owns them via `setDashboardView((location.hash || "#finance")
// .slice(1))`, which is why sidebar-nav.js skipped `.dash-subnav` when it
// highlighted subitems. Same mapping here, including the two legacy hashes.
const DASH_VIEWS = ['finance', 'orders', 'intel'];

export function dashboardViewFromHash(hash) {
  let view = (hash || '#finance').slice(1);
  // "overview" is the pre-split hash — Finance and Order Analytics used to be
  // two sections of one page. Map it forward so old bookmarks land somewhere
  // sensible.
  if (view === 'overview' || view === 'analytics') view = 'finance';
  return DASH_VIEWS.includes(view) ? view : 'finance';
}

const DASH_SUBITEMS = [
  { view: 'finance', label: 'Finance' },
  { view: 'orders', label: 'Order Analytics' },
  { view: 'intel', label: 'Inventory Intelligence' },
];

// The full nine. dashboard.html and orders.html both listed all nine; the
// copies in inventory.html, catalog.html and admin-users.html had gone stale at
// seven (no Return Requests / Returned Orders) even though orders.html renders
// both tabs. One list, and it's the complete one.
const ORDER_SUBITEMS = [
  { tab: 'all', label: 'All Orders' },
  { tab: 'new', label: 'New Orders' },
  { tab: 'in_process', label: 'In Process' },
  { tab: 'to_pickup', label: 'To Pickup' },
  { tab: 'shipped', label: 'Shipped Orders' },
  { tab: 'completed', label: 'Completed Orders' },
  { tab: 'cancelled', label: 'Cancelled Orders' },
  { tab: 'return_requested', label: 'Return Requests' },
  { tab: 'returned', label: 'Returned Orders' },
];

const CATALOG_SUBITEMS = [
  { to: route('/catalog'), label: 'Catalog' },
  { to: route('/catalog?push=1'), label: 'Push Product' },
];

// `.main.panel-open` shifts the content left to make room for a right-hand
// detail panel (orders, inventory and catalog each open one). Those pages used
// `document.querySelector(".main").classList.add("panel-open")`; the shell owns
// that element now, so it hands the toggle down instead.
const AppShellContext = createContext({ panelOpen: false, setPanelOpen: () => {} });

export function useAppShell() {
  return useContext(AppShellContext);
}

function initials(fullName) {
  return (fullName || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();

  const [panelOpen, setPanelOpen] = useState(false);

  // Collapsed by default, one open at a time. sidebar-nav.js re-derived this on
  // every page load: "expand whichever group actually matches where we landed
  // ... instead of leaving every group collapsed and stranding the user".
  // Keying the effect on pathname alone reproduces that, including the detail
  // that a client-side view switch (orders.html's status pills rewriting
  // ?tab=, dashboard.html's hash) re-highlighted the subitem without touching
  // which group was expanded.
  const [openGroup, setOpenGroup] = useState(() => GROUP_FOR_PATH[location.pathname] ?? null);

  useEffect(() => {
    setOpenGroup(GROUP_FOR_PATH[location.pathname] ?? null);
  }, [location.pathname]);

  // Reset when the route changes — a panel belongs to the page that opened it.
  useEffect(() => {
    setPanelOpen(false);
  }, [location.pathname]);

  const shell = useMemo(() => ({ panelOpen, setPanelOpen }), [panelOpen]);

  const here = location.pathname + location.search;
  const dashView = dashboardViewFromHash(location.hash);

  // A caret click toggles its own group and collapses the others; clicking the
  // parent link of the page you are already on does the same instead of
  // navigating.
  function toggleGroup(event, groupId) {
    event.preventDefault();
    event.stopPropagation();
    setOpenGroup((current) => (current === groupId ? null : groupId));
  }

  function parentLinkProps(groupId, path) {
    if (location.pathname !== path) return {};
    return { onClick: (event) => toggleGroup(event, groupId) };
  }

  function navItemClass(path) {
    return 'nav-item' + (location.pathname === path ? ' active' : '');
  }

  function subItemsClass(groupId) {
    return 'nav-subitems' + (openGroup === groupId ? '' : ' collapsed');
  }

  function caretClass(groupId) {
    return 'nav-caret' + (openGroup === groupId ? '' : ' collapsed');
  }

  function handleLogout() {
    logout();
    navigate(route('/login'), { replace: true });
  }

  return (
    <AppShellContext.Provider value={shell}>
      <div className="sidebar">
        <div className="logo-row">
          <div className="logo-box">⚙️</div>
          <div>
            <div className="brand">ASH AI</div>
            <div className="brand-sub">Smart Apparel ERP</div>
          </div>
        </div>
        <div className="sidebar-divider" />

        <Link
          className={navItemClass(route('/dashboard'))}
          to={route("/dashboard")}
          {...parentLinkProps('subs-dashboard', route('/dashboard'))}
        >
          <span className="icon">📊</span>
          Dashboard
          <span
            className={caretClass('subs-dashboard')}
            onClick={(event) => toggleGroup(event, 'subs-dashboard')}
          >
            ▾
          </span>
        </Link>
        <div className={subItemsClass('subs-dashboard')} id="subs-dashboard">
          {DASH_SUBITEMS.map((item) => (
            <Link
              key={item.view}
              className={
                'nav-subitem dash-subnav' +
                (location.pathname === route('/dashboard') && dashView === item.view ? ' active' : '')
              }
              to={route('/dashboard#') + item.view}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-section-label">Orders</div>
        <Link
          className={navItemClass(route('/orders'))}
          to={route("/orders")}
          {...parentLinkProps('subs-orders', route('/orders'))}
        >
          <span className="icon">📦</span>
          Orders Queue
          <span
            className={caretClass('subs-orders')}
            onClick={(event) => toggleGroup(event, 'subs-orders')}
          >
            ▾
          </span>
        </Link>
        <div className={subItemsClass('subs-orders')} id="subs-orders">
          {ORDER_SUBITEMS.map((item) => {
            const to = route('/orders?tab=') + item.tab;
            return (
              <Link
                key={item.tab}
                className={'nav-subitem' + (here === to ? ' active' : '')}
                to={to}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="nav-section-label">Inventory</div>
        <Link className={navItemClass(route('/inventory'))} to={route("/inventory")}>
          <span className="icon">🧵</span>
          Inventory
        </Link>

        <div className="nav-section-label">Products</div>
        <Link
          className={navItemClass(route('/catalog'))}
          to={route("/catalog")}
          {...parentLinkProps('subs-catalog', route('/catalog'))}
        >
          <span className="icon">👕</span>
          Product Catalog
          <span
            className={caretClass('subs-catalog')}
            onClick={(event) => toggleGroup(event, 'subs-catalog')}
          >
            ▾
          </span>
        </Link>
        <div className={subItemsClass('subs-catalog')} id="subs-catalog">
          {CATALOG_SUBITEMS.map((item) => (
            <Link
              key={item.to}
              className={'nav-subitem' + (here === item.to ? ' active' : '')}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Admin-only, appended after the other sections — exactly where
            renderSessionBar() put it. */}
        {isAdmin && (
          <>
            <div className="nav-section-label">Admin</div>
            <Link id="admin-nav-link" className={navItemClass(route('/admin-users'))} to={route("/admin-users")}>
              <span className="icon">🛡️</span>
              User Approvals
            </Link>
          </>
        )}

        <div className="sidebar-divider" style={{ marginTop: '14px' }} />

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials(user && user.full_name)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user ? user.full_name : ''}</div>
            <div className="sidebar-user-role">{user ? user.role : ''}</div>
          </div>
          <button
            id="logout-link"
            type="button"
            className="sidebar-logout-btn"
            title="Logout"
            onClick={handleLogout}
          >
            ⎋
          </button>
        </div>
      </div>

      <div className={'main' + (panelOpen ? ' panel-open' : '')}>
        <Outlet />
      </div>
    </AppShellContext.Provider>
  );
}

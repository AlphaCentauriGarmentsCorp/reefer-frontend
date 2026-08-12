import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "/reefer-logo.jpg";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";

// The fixed top nav, ported from the mockup. Links now point at React routes.
const links = [
  { label: "SHOP", to: "/shop" },
  { label: "LOOKBOOK", to: "/lookbook" },
  { label: "ABOUT", to: "/about" },
  { label: "FAQ", to: "/faq" },
  // A router link, not a bare "#drop" anchor: the section only exists on Home, so
  // from any other page this has to navigate first (App's Shell does the scroll).
  { label: "THE DROP", to: "/#drop" },
];

// The mockup highlights SHOP on both Shop and All Products (All Products is a
// Shop sub-page) and highlights nothing at all on home, cart, PDP, account and
// sizing guide — so this is a route map, not a `to === pathname` test.
const activeFor = { "/shop": "SHOP", "/products": "SHOP", "/lookbook": "LOOKBOOK", "/about": "ABOUT", "/faq": "FAQ" };

const MOBILE_QUERY = "(max-width: 860px)"; // same breakpoint the drawer CSS uses

/**
 * The mockup's cursor ring and the magnetic pull on [data-magnet] buttons, run off
 * one rAF loop. Mounted from Nav so every page gets it exactly once.
 */
function PointerFX() {
  // Both effects chase a pointer position, so on touch they'd measure and restyle
  // 60x/sec for something nobody can see. Reduced-motion users opt out of the lot.
  const [fine] = useState(
    () =>
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const ringRef = useRef(null);

  useEffect(() => {
    if (!fine) return;
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: -100, y: -100, scale: 1 };
    const pulled = new WeakMap();
    let hot = false;
    let raf;

    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      hot = !!(e.target.closest && e.target.closest("a, button"));
    };
    document.addEventListener("mousemove", onMove, { passive: true });

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const el = ringRef.current;
      if (el) {
        ring.x += (mouse.x - ring.x) * 0.18;
        ring.y += (mouse.y - ring.y) * 0.18;
        ring.scale += ((hot ? 1.9 : 1) - ring.scale) * 0.15;
        el.style.transform = `translate(${ring.x - 18}px,${ring.y - 18}px) scale(${ring.scale.toFixed(3)})`;
        el.style.opacity = hot ? "1" : "0.6";
      }
      const dpr = window.devicePixelRatio || 1;
      document.querySelectorAll("[data-magnet]").forEach((m) => {
        const r = m.getBoundingClientRect();
        const dx = mouse.x - (r.left + r.width / 2);
        const dy = mouse.y - (r.top + r.height / 2);
        const tight = m.hasAttribute("data-magnet-tight");
        const near = Math.hypot(dx, dy) < (tight ? 40 : 110);
        const pull = tight ? 0.12 : 0.3;
        const st = pulled.get(m) || { x: 0, y: 0 };
        st.x += ((near ? dx * pull : 0) - st.x) * 0.2;
        st.y += ((near ? dy * pull : 0) - st.y) * 0.2;
        pulled.set(m, st);
        const rx = Math.round(st.x * dpr) / dpr;
        const ry = Math.round(st.y * dpr) / dpr;
        m.style.transform = rx || ry ? `translate(${rx}px,${ry}px)` : "";
      });
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
    };
  }, [fine]);

  if (!fine) return null;
  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 36,
        height: 36,
        border: "2px solid #F97B0C",
        borderRadius: 999,
        pointerEvents: "none",
        zIndex: 300,
        transform: "translate(-100px, -100px)",
        willChange: "transform",
      }}
    />
  );
}

export default function Nav() {
  const { user } = useAuth();
  const { count } = useCart();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  const burgerRef = useRef(null);
  const closeRef = useRef(null);

  const active = activeFor[location.pathname];
  const signInTo =
    location.pathname === "/sign-in"
      ? "/sign-in"
      : `/sign-in?return=${encodeURIComponent(location.pathname + location.search)}`;

  const openDrawer = () => {
    setMounted(true);
    setOpen(true);
  };
  const closeDrawer = () => {
    setOpen(false);
    burgerRef.current?.focus();
  };

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => {
      setNarrow(e.matches);
      // Growing back to desktop hides the drawer; without this the page would stay
      // scroll-locked behind something the user can no longer see or close.
      if (!e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("rf-drawer-open", open);
    return () => document.body.classList.remove("rf-drawer-open");
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Take the closed panel out of the tab order — but only once it has finished
      // sliding out, or the transition would be cut short.
      const timer = setTimeout(() => setMounted(false), 340);
      return () => clearTimeout(timer);
    }
    closeRef.current?.focus(); // land keyboard users inside the menu
    const onKey = (e) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const navlink = (l) => {
    const isActive = l.label === active;
    return (
      <Link
        key={l.label}
        to={l.to}
        // The active entry drops .rf-navlink: the mockup omits style-hover on it.
        className={isActive ? undefined : "rf-navlink"}
        style={{ color: isActive ? "#F97B0C" : "#101010", textDecoration: "none" }}
      >
        {l.label}
      </Link>
    );
  };

  const drawerVisibility = { visibility: mounted ? "visible" : "hidden" };

  return (
    <>
      <PointerFX />
      <nav
        className="rf-nav"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: "#F6F1E7",
          borderBottom: "2px solid #101010",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 32px",
          gap: 24,
        }}
      >
        {/* Logo cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
          <button
            ref={burgerRef}
            type="button"
            className="rf-burger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={openDrawer}
          >
            <span />
            <span />
            <span />
          </button>
          <Link
            to="/"
            style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#101010" }}
          >
            <img src={logo} alt="Reefer" style={{ width: 36, height: 36, borderRadius: 6, display: "block" }} />
            <span className="rf-wordmark" style={{ fontFamily: "Anton, sans-serif", fontSize: 22, letterSpacing: "0.06em" }}>
              REEFER
            </span>
            {/* Non-essential on a phone, and it pushes CART off a narrow bar. */}
            {!narrow && (
              <span
                className="rf-navmeta"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: "#6B6357",
                  borderLeft: "1px solid #C9C0B0",
                  paddingLeft: 12,
                }}
              >
                MNL · EST. 2024
              </span>
            )}
          </Link>
        </div>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, fontWeight: 700, fontSize: 12, letterSpacing: "0.14em" }}>
          <div className="rf-navlinks" style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {links.map(navlink)}
          </div>

          <div className="rf-accountchip" style={{ position: "relative" }}>
            {user ? (
              <Link
                to="/account"
                data-magnet=""
                data-magnet-tight=""
                style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.02em", whiteSpace: "nowrap", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "9px 16px", boxShadow: "4px 4px 0 #F97B0C", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ width: 20, height: 20, borderRadius: 999, background: "#F97B0C", color: "#101010", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>
                  {(user.name || "U").trim()[0].toUpperCase()}
                </span>
                ACCOUNT
              </Link>
            ) : (
              <Link
                to={signInTo}
                data-magnet=""
                data-magnet-tight=""
                style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.02em", whiteSpace: "nowrap", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "9px 16px", boxShadow: "4px 4px 0 #F97B0C", textDecoration: "none", display: "block" }}
              >
                SIGN IN
              </Link>
            )}
          </div>

          <Link
            to="/cart"
            data-magnet=""
            data-magnet-tight=""
            style={{
              fontFamily: "Anton, sans-serif",
              fontSize: 15,
              letterSpacing: "0.03em",
              background: "#101010",
              color: "#F6F1E7",
              border: "2px solid #101010",
              padding: "9px 18px",
              boxShadow: "4px 4px 0 #F97B0C",
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            CART
            <span
              style={{
                background: "#F97B0C",
                color: "#101010",
                minWidth: 20,
                height: 20,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                padding: "0 6px",
              }}
            >
              {count}
            </span>
          </Link>
        </div>
      </nav>

      {/* Mobile drawer — siblings of <nav> so its z-index isn't trapped in the nav's
          stacking context. Styling lives in index.css (.rf-drawer*). */}
      <div className="rf-drawer-backdrop" style={drawerVisibility} onClick={closeDrawer} aria-hidden="true" />
      <aside className="rf-drawer" role="dialog" aria-modal="true" aria-label="Menu" style={drawerVisibility}>
        <div className="rf-drawer-head">
          <span className="rf-drawer-title">MENU</span>
          <button ref={closeRef} type="button" className="rf-drawer-close" aria-label="Close menu" onClick={closeDrawer}>
            ×
          </button>
        </div>
        <nav className="rf-drawer-links">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className="rf-drawer-link"
              onClick={closeDrawer}
              style={l.label === active ? { color: "#F97B0C" } : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="rf-drawer-foot">
          <Link className="rf-drawer-account" to={user ? "/account" : signInTo} onClick={closeDrawer}>
            {user ? "MY ACCOUNT" : "SIGN IN"} →
          </Link>
        </div>
      </aside>
    </>
  );
}

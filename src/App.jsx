import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import AllProducts from "./pages/AllProducts";
import ProductDetail from "./pages/ProductDetail";
import Lookbook from "./pages/Lookbook";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import SizingGuide from "./pages/SizingGuide";
import SignIn from "./pages/SignIn";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import Nav from "./components/layout/Nav";
import Footer from "./components/layout/Footer";
import Seo, { withBrand } from "./components/Seo";
import logo from "/reefer-logo.jpg";

// Timings, colours and the pulsing mark come straight from the mockup's
// page-transition.js. Its <a> click interceptor has no job here — react-router
// owns navigation — so the curtain hangs off the location change instead.
const OUT_MS = 380; // curtain covers before the new page mounts
const IN_MS = 560; // curtain lifts once it has
const CONTENT_IN_MS = 620;
const EASE = "cubic-bezier(.65,0,.35,1)";

const CURTAIN_CSS = `
@keyframes rfCurtainIn{from{opacity:0}to{opacity:1}}
@keyframes rfCurtainOut{from{opacity:1}to{opacity:0}}
@keyframes rfCurtainPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(249,123,12,.45)}50%{transform:scale(.82);box-shadow:0 0 0 14px rgba(249,123,12,0)}}
`;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Curtain({ phase }) {
  if (phase === "idle") return null;
  const covering = phase === "out";
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "#101010",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // blocks the outgoing page while it is covered; the arriving one is free
        pointerEvents: covering ? "auto" : "none",
        animation: `${covering ? "rfCurtainIn" : "rfCurtainOut"} ${covering ? OUT_MS : IN_MS}ms ${EASE} both`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          background: "#F97B0C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 0 0 rgba(249,123,12,0.45)",
          animation: "rfCurtainPulse 1s ease-in-out infinite",
        }}
      >
        <img src={logo} alt="" style={{ width: 46, height: 46, borderRadius: 8, display: "block", objectFit: "cover" }} />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />
      <section
        className="rf-section"
        style={{ maxWidth: 1100, margin: "0 auto", padding: "190px 32px 130px", display: "flex", flexDirection: "column", gap: 24 }}
      >
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>//404 LOST AT SEA</span>
        <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(52px, 10vw, 140px)", lineHeight: 0.86, margin: 0, textTransform: "uppercase" }}>
          Gone with
          <br />
          the tide<span style={{ color: "#F97B0C" }}>.</span>
        </h1>
        <p style={{ margin: 0, maxWidth: 560, fontSize: 18, lineHeight: 1.6, color: "#6B6357" }}>
          This page washed out with the last drop. No restocks, no reruns — but the water is still moving over here.
        </p>
        <div className="rf-line" style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <Link
            to="/products"
            className="rf-cta"
            style={{ fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", textDecoration: "none", padding: "16px 30px", border: "2px solid #101010", boxShadow: "6px 6px 0 #F97B0C", display: "inline-block" }}
          >
            SHOP EVERYTHING →
          </Link>
          <Link
            to="/"
            className="rf-cta"
            style={{ fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.08em", background: "none", color: "#101010", textDecoration: "none", padding: "16px 30px", border: "2px solid #101010", display: "inline-block" }}
          >
            BACK TO SHORE
          </Link>
        </div>
        <div style={{ borderTop: "2px solid #101010", marginTop: 22, paddingTop: 18, display: "flex", flexWrap: "wrap", gap: 20 }}>
          {[
            { label: "THE DROP", to: "/#drop" },
            { label: "SIZING GUIDE", to: "/sizing-guide" },
            { label: "FAQ", to: "/faq" },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="rf-navlink" style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", color: "#6B6357", textDecoration: "underline" }}>
              {l.label}
            </Link>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}

// One table for the route tree AND its tab titles, so a static page never has to
// carry <Seo> itself. `title: null` hands the title to the page — ProductDetail
// only knows it once the product has loaded.
const PAGES = [
  { path: "/", element: <Home />, title: "Ride the wave", description: "Small-batch streetwear printed in Quezon City. Tees, hoodies, shorts and bags from the current REEFER MNL drop." },
  { path: "/shop", element: <Shop />, title: "Shop by collection", description: "Every REEFER MNL collection in one place — tees, hoodies, shorts, base layer, bags and socks, plus new arrivals and best sellers." },
  { path: "/products", element: <AllProducts />, title: "Shop everything", description: "The full REEFER MNL catalogue. Filter by type, audience, size and tag — once a colourway sells out, it's gone." },
  { path: "/product/:slug", element: <ProductDetail />, title: null },
  { path: "/lookbook", element: <Lookbook />, title: "Lookbook", description: "Season 03 shot around Metro Manila — how the drop actually wears." },
  { path: "/about", element: <About />, title: "About", description: "A small Quezon City print shop making streetwear in short runs. No restocks, no reruns." },
  { path: "/faq", element: <FAQ />, title: "FAQ", description: "Shipping, payment, returns and sizing — the answers we get asked for most." },
  { path: "/sizing-guide", element: <SizingGuide />, title: "Sizing guide", description: "Flat measurements and fit notes for every REEFER MNL cut, so you order the right size once." },
  { path: "/cart", element: <Cart />, title: "Your cart", description: "Review your picks before checkout." },
  { path: "/sign-in", element: <SignIn />, title: "Sign in", description: "Sign in to track orders, save favorites and check out faster." },
  { path: "/forgot-password", element: <ForgotPassword />, title: "Forgot password", description: "Send yourself a reset link for your REEFER MNL account." },
  // the emailed link lands here carrying ?token=&email=
  { path: "/reset-password", element: <ResetPassword />, title: "Reset password", description: "Choose a new password for your REEFER MNL account." },
  { path: "/checkout", element: <Checkout />, title: "Checkout", description: "Shipping details and payment — GCash, Maya or cash on delivery." },
  { path: "/account", element: <Account />, title: "Your account", description: "Orders, favorites, addresses and account settings." },
  { path: "*", element: <NotFound />, title: "Page not found", description: "That page washed out with the last drop." },
];

function Shell() {
  const location = useLocation();
  const navType = useNavigationType();
  // The page tree lags the URL by one curtain: `shown` is what is on screen.
  const [shown, setShown] = useState(location);
  // Every mockup page arrived under a curtain that lifted, so the app boots the same.
  const [phase, setPhase] = useState(() => (reducedMotion() ? "idle" : "in")); // idle | out | in
  const offsets = useRef(new Map());
  const lastScroll = useRef({ path: "", hash: "" });

  // The setState-in-effect here is the point of the component, not an oversight:
  // `shown` deliberately LAGS the URL by one curtain, so it cannot be derived
  // during render — the commit has to wait for a timer.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (location.pathname === shown.pathname) {
      setShown(location); // same page, only the query/hash moved — no curtain
      // A navigation that lands back on the page we started from (Back pressed
      // before the swap fired) cancels the pending timer without ever committing
      // a new page. Lift the curtain here or it stays covering the screen.
      setPhase((p) => (p === "out" ? "in" : p));
      return;
    }
    offsets.current.set(shown.key, window.scrollY); // for a later Back
    if (reducedMotion()) {
      setShown(location);
      return;
    }
    setPhase("out");
    const swap = setTimeout(() => {
      setShown(location);
      setPhase("in");
    }, OUT_MS + 40);
    return () => clearTimeout(swap);
  }, [location, shown.pathname, shown.key]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Retiring the curtain lives on its own timer: committing the new page
  // re-runs the effect above, which would otherwise cancel it.
  useEffect(() => {
    if (phase !== "in") return;
    const done = setTimeout(() => setPhase("idle"), IN_MS + 120);
    return () => clearTimeout(done);
  }, [phase]);

  // Backstop. The curtain is an opaque, click-blocking, full-screen layer, so a
  // missed transition would strand the whole site. Nothing should reach this.
  useEffect(() => {
    if (phase !== "out") return;
    const bail = setTimeout(() => setPhase("in"), OUT_MS + 1500);
    return () => clearTimeout(bail);
  }, [phase]);

  // The mockup navigated with location.href, so every page arrived at the top.
  // Here the swap happens under an opaque curtain, so the jump is never seen.
  useLayoutEffect(() => {
    const prev = lastScroll.current;
    if (prev.path === shown.pathname && prev.hash === shown.hash) return; // filters etc.
    const samePage = prev.path === shown.pathname;
    const firstPaint = prev.path === "";
    lastScroll.current = { path: shown.pathname, hash: shown.hash };

    const target = shown.hash && document.getElementById(shown.hash.slice(1));
    if (target) {
      target.scrollIntoView(samePage ? { behavior: "smooth" } : { behavior: "instant", block: "start" });
      return;
    }
    if (firstPaint) return; // a reload keeps whatever position the browser restored
    const back = navType === "POP" ? offsets.current.get(shown.key) : undefined;
    window.scrollTo({ top: back ?? 0, left: 0, behavior: "instant" });
  }, [shown, navType]);

  // Titled off `shown`, not `location`: the title should turn over with the page,
  // not while the curtain is still covering the one before it.
  const page = matchRoutes(PAGES, shown)?.[0]?.route;

  return (
    <>
      <style>{CURTAIN_CSS}</style>
      {page?.title && <Seo title={withBrand(page.title)} description={page.description} />}
      {/* opacity only — a transform here would break the fixed nav and wave canvas */}
      <div
        style={{
          opacity: phase === "out" ? 0.35 : 1,
          transition: `opacity ${phase === "out" ? OUT_MS : CONTENT_IN_MS}ms ${EASE}`,
        }}
      >
        {/* Rendered against `shown`, not the live location: the tree must keep
            painting the OLD page until the curtain has finished covering it. */}
        <Routes location={shown}>
          {PAGES.map((p) => (
            <Route key={p.path} path={p.path} element={p.element} />
          ))}
        </Routes>
      </div>
      <Curtain phase={phase} />
    </>
  );
}

// The storefront owns "/" again, so it owns the router too — nothing above it in
// main.jsx provides one. (While it was mounted at /store inside the old team app
// the host router supplied history and this returned a bare <Shell />.)
export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

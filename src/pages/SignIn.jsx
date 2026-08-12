import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { authApi } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";

const field = { fontFamily: "Archivo, sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 14px", border: "2px solid #101010", background: "#FFFDF8", color: "#101010" };
const label = { fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357" };
const quietLink = { fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357", textDecoration: "underline" };

const SUBMERGE_MS = 1700;

// Width of the art panel. Used twice — once to size the panel, once to pad the card
// column clear of it — so the two can never drift apart. In vw rather than % because
// the panel is fixed (sized against the viewport) while the padding is not, and a
// percentage would resolve against a slightly narrower box once a scrollbar shows.
const ART_WIDTH = "36vw";

// How much of the wave survives where it crosses the photo. On the cream side the
// pool stays a solid body; over the art panel it drops to this, low enough that the
// front layers read as a tint over the tee rather than a lid on it — the deep navy
// band fills to the bottom edge, so anything much higher than this reads as opaque
// however translucent the crests above it look.
const ART_WAVE_ALPHA = 0.38;

const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpColor = (c1, c2, t) =>
  `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
const clamp01 = (n) => Math.max(0, Math.min(1, n));

// The gate appends ?reason=… explaining what the visitor was trying to do. It lands
// in the DOM as text, so keep it to a short plain sentence rather than trusting
// whatever a crafted URL puts in the query string.
function sanitizeReason(raw) {
  if (!raw) return "";
  return raw.length > 90 ? "" : raw.replace(/[<>]/g, "");
}

// localStorage mirror of the cart, shape {'slug|size': qty} — the shape /cart/merge
// accepts. Anything added before signing in would otherwise be silently replaced by
// the account's own cart on the next page.
const LOCAL_CART_KEY = "reefer-cart";

function localCartItems() {
  try {
    const map = JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || "{}") || {};
    return Object.keys(map)
      .map((key) => {
        const [slug, size] = key.split("|");
        return { slug, size: size || "OS", qty: Number(map[key]) || 0 };
      })
      .filter((line) => line.slug && line.qty > 0);
  } catch {
    return [];
  }
}

async function mergeLocalCart() {
  const items = localCartItems();
  if (!items.length) return;
  await api.post("/v1/cart/merge", { items });
  // Drop the mirror once it is on the account. It exists only to carry a guest's
  // additions across sign-in; keeping it would hand this cart to whoever signs in
  // on this browser next.
  localStorage.removeItem(LOCAL_CART_KEY);
}

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const requestedReturn = searchParams.get("return") || "/";
  // In-app paths only: a ?return= pointing off-site would be an open redirect.
  const returnTo = requestedReturn.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : "/";
  const gateReason = sanitizeReason(searchParams.get("reason"));

  // The gate's CREATE ACCOUNT button links here with ?mode=create, so the page opens
  // on the right tab instead of making people find it.
  const [mode, setMode] = useState(() => (searchParams.get("mode") === "create" ? "create" : "signin"));
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isCreate = mode === "create";

  const waveRef = useRef(null);
  const artRef = useRef(null);
  const cardRef = useRef(null);
  const fillRef = useRef(null);
  const diveRef = useRef(null);
  const submerge = useRef({ active: false, start: 0, rise: 0, done: false });
  // Kept in a ref so the animation loop never navigates through a stale closure.
  const finish = useRef(() => {});
  finish.current = () => navigate(returnTo);

  useEffect(() => {
    const canvas = waveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    document.addEventListener("mousemove", onMove, { passive: true });

    // base = vertical rest position (share of viewport); amp = wave height;
    // speed = drift; len = wavelength; color = fill (back → front).
    const layers = [
      { base: 0.7, amp: 26, speed: 0.7, len: 0.006, color: "rgba(20,33,61,0.08)" },
      { base: 0.76, amp: 34, speed: 1.0, len: 0.0045, color: "rgba(249,123,12,0.22)" },
      { base: 0.83, amp: 42, speed: 1.35, len: 0.0035, color: "#F97B0C" },
      { base: 0.93, amp: 30, speed: 1.7, len: 0.005, color: "#14213D" },
    ];

    let t = 0;
    let raf;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const mx = mouse.x / Math.max(1, w) - 0.5;
      const my = mouse.y / Math.max(1, h) - 0.5;

      if (submerge.current.active) {
        const rise = submerge.current.rise;
        // Water line climbs from ~72% of the screen up past the top edge.
        const waterLine = h * 0.72 - rise * (h * 1.08);
        // Solid body, tinted from navy toward the loading-screen black as it rises.
        ctx.fillStyle = lerpColor([20, 33, 61], [16, 16, 16], rise);
        ctx.fillRect(0, waterLine, w, h - waterLine + 2);
        const crests = [
          { amp: 22, speed: 1.2, len: 0.006, color: `rgba(249,123,12,${(0.5 * (1 - rise)).toFixed(3)})`, off: 0 },
          { amp: 30, speed: 1.5, len: 0.004, color: lerpColor([20, 33, 61], [16, 16, 16], rise), off: 10 },
        ];
        for (const L of crests) {
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 6) {
            const y =
              waterLine +
              L.off +
              Math.sin(x * L.len + t * L.speed) * L.amp +
              Math.sin(x * L.len * 2.1 + t * L.speed * 1.5) * L.amp * 0.4;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fillStyle = L.color;
          ctx.fill();
        }
        return;
      }

      for (const L of layers) {
        const amp = L.amp * (1 + Math.abs(mx) * 0.9);
        const yBase = h * (L.base + my * 0.03);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 6) {
          const y =
            yBase +
            Math.sin(x * L.len + t * L.speed) * amp +
            Math.sin(x * L.len * 2.3 + t * L.speed * 1.6 + 2) * amp * 0.35 +
            Math.sin((x - mouse.x) * 0.004) * amp * 0.25 * mx * 2;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = L.color;
        ctx.fill();
      }

      // Let the photo read through where the pool crosses it. Cheaper than drawing
      // every layer twice at two opacities: destination-out scales the alpha of what
      // is already on the canvas by (1 - source alpha), so the stack dims as one body
      // and keeps its internal layering rather than each layer being flattened on its
      // own. Measured off the panel instead of computed from ART_WIDTH so the edge
      // lands exactly on its border (vw counts the scrollbar, the canvas does not),
      // and so it falls to 0 by itself once the media query hides the panel.
      const artRight = artRef.current ? artRef.current.getBoundingClientRect().right : 0;
      if (artRight > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = `rgba(0,0,0,${1 - ART_WAVE_ALPHA})`;
        ctx.fillRect(0, 0, artRight, h);
        ctx.restore();
      }
    };

    // Sink the card while the pool rises over it, then hand over to the return page.
    const tickSubmerge = () => {
      const s = submerge.current;
      if (!s.active) return;
      const raw = Math.min(1, (performance.now() - s.start) / SUBMERGE_MS);
      s.rise = easeInOutCubic(raw);
      const rise = s.rise;

      const card = cardRef.current;
      if (card) {
        card.style.transition = "none";
        card.style.transform = `translateY(${(rise * 90).toFixed(1)}px) scale(${(1 - rise * 0.12).toFixed(3)})`;
        card.style.filter = `blur(${(rise * 9).toFixed(1)}px)`;
        card.style.opacity = String(Math.max(0, 1 - rise * 1.25));
      }
      canvas.style.zIndex = "500"; // the water has to occlude the card, not sit behind it

      if (fillRef.current) fillRef.current.style.opacity = String(clamp01((rise - 0.72) / 0.28));
      if (diveRef.current) diveRef.current.style.opacity = String(clamp01((rise - 0.85) / 0.15));

      if (raw >= 1 && !s.done) {
        s.done = true;
        setTimeout(() => finish.current(), 260);
      }
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      t += 0.016;
      tickSubmerge();
      draw();
    };

    if (reduceMotion) draw(); // one static frame, no animation
    else loop();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
    };
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pick = (next) => () => {
    setMode(next);
    setError("");
  };

  const enterApp = (account) => {
    setUser(account);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      navigate(returnTo);
      return;
    }
    submerge.current = { active: true, start: performance.now(), rise: 0, done: false };
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submerge.current.active) return;
    setError("");
    setLoading(true);
    try {
      const data = isCreate
        ? await authApi.register({ name: form.name, email: form.email, password: form.password })
        : await authApi.login({ email: form.email, password: form.password });

      // Lift anything this browser was still holding into the account's cart before
      // we leave. Awaited so the redirect cannot race it, but never allowed to block
      // a sign-in that already succeeded.
      try {
        await mergeLocalCart();
      } catch {
        /* the account cart is still correct without it */
      }

      enterApp(data.user);
    } catch (err) {
      setError(err?.message || (isCreate ? "Registration failed" : "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  const tab = (active) => ({ flex: 1, fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em", padding: 11, cursor: "pointer", border: "none", background: active ? "#101010" : "transparent", color: active ? "#F6F1E7" : "#101010" });

  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflowX: "clip" }}>
      {/* Art panel. Fixed rather than a flex column so it holds still while the card
          column scrolls, and so it can sit *under* the wave — the pool then washes
          across the photo instead of stopping at its edge, which keeps the wave a
          full-width element rather than half of one. The opaque nav paints over its
          top, which is what crops it to the area below the header.

          The photo is painted by .rf-auth-art in index.css rather than by an <img>
          here, so phones do not download it — see the note on that rule. Nothing
          about the background may move into this inline style: a `background`
          shorthand here would outrank the stylesheet and blank the image. */}
      <div ref={artRef} className="rf-auth-art" aria-hidden="true" style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: ART_WIDTH, zIndex: 0, borderRight: "2px solid #101010" }} />

      {/* Wave pool background (same recipe as the hero) */}
      <canvas ref={waveRef} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 1, pointerEvents: "none" }} />

      {/* Minimal nav */}
      <nav style={{ position: "relative", zIndex: 3, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "2px solid #101010", background: "#F6F1E7" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#101010" }}>
          <img src="/reefer-logo.jpg" alt="Reefer" style={{ width: 36, height: 36, borderRadius: 6, display: "block" }} />
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, letterSpacing: "0.06em" }}>REEFER</span>
        </Link>
        <Link to={returnTo} style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.03em", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: "9px 16px", boxShadow: "3px 3px 0 #F97B0C", background: "#F6F1E7" }}>
          ← BACK TO SHOP
        </Link>
      </nav>

      {/* Card */}
      <main className="rf-auth-main" style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", paddingLeft: `calc(${ART_WIDTH} + 24px)` }}>
        <div ref={cardRef} style={{ width: "100%", maxWidth: 440, border: "2px solid #101010", background: "#FFFDF8", padding: "44px 40px", boxShadow: "12px 12px 0 #101010", animation: "fadeUp 0.5s both", willChange: "transform, filter", transition: "transform 0.1s linear" }}>
          <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.22em", color: "#F97B0C" }}>MEMBERS ONLY-ISH</span>
          <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(40px, 6vw, 56px)", margin: "8px 0 26px", textTransform: "uppercase", lineHeight: 0.92 }}>
            {isCreate ? "Join the crew." : "Ride back in."}
          </h1>

          <div style={{ display: "flex", border: "2px solid #101010", marginBottom: 26 }}>
            <button onClick={pick("signin")} style={tab(!isCreate)}>SIGN IN</button>
            <button onClick={pick("create")} style={{ ...tab(isCreate), borderLeft: "2px solid #101010" }}>CREATE ACCOUNT</button>
          </div>

          {/* Why the sign-in gate sent you here */}
          {gateReason && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: "2px solid #101010", background: "#F97B0C", color: "#101010", padding: "12px 14px", marginBottom: 14, boxShadow: "4px 4px 0 #101010" }}>
              <span style={{ fontSize: 15 }}>🛒</span>
              <span style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 13, lineHeight: 1.4 }}>{gateReason}</span>
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {isCreate && (
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={label}>NAME</span>
                <input type="text" required value={form.name} onChange={set("name")} placeholder="Jane dela Cruz" style={field} />
              </label>
            )}
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={label}>EMAIL</span>
              <input type="email" required value={form.email} onChange={set("email")} placeholder="you@email.com" style={field} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={label}>PASSWORD</span>
              <input type="password" required value={form.password} onChange={set("password")} placeholder="••••••••" style={field} />
            </label>

            {!isCreate && (
              <Link to="/forgot-password" className="rf-navlink" style={{ ...quietLink, alignSelf: "flex-end", marginTop: -4 }}>
                FORGOT PASSWORD?
              </Link>
            )}

            {error && <span style={{ fontSize: 12, fontWeight: 700, color: "#C0392B" }}>{error}</span>}

            <button type="submit" disabled={loading} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: 15, cursor: "pointer", marginTop: 6, boxShadow: "5px 5px 0 #F97B0C", opacity: loading ? 0.7 : 1 }}>
              {loading ? "…" : isCreate ? "CREATE ACCOUNT →" : "SIGN IN →"}
            </button>
          </form>

          <p style={{ margin: "22px 0 0", fontSize: 11, lineHeight: 1.6, color: "#6B6357", fontWeight: 600, textAlign: "center" }}>
            Demo store — but the account is real. Your password is encrypted before it's saved, though please don't reuse one from another site.
          </p>
        </div>
      </main>

      {/* Submerge fill overlay (fades to the loading-screen colour) */}
      <div ref={fillRef} aria-hidden="true" style={{ position: "fixed", inset: 0, background: "#101010", zIndex: 460, opacity: 0, pointerEvents: "none" }} />
      {/* Diving caption shown once submerged */}
      <div ref={diveRef} aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 470, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, opacity: 0, pointerEvents: "none" }}>
        <img src="/reefer-logo.jpg" alt="" style={{ width: 72, height: 72, borderRadius: 16, animation: "bob 1.6s ease-in-out infinite" }} />
        <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.24em", color: "#6B6560" }}>DIVING IN…</span>
      </div>
    </div>
  );
}

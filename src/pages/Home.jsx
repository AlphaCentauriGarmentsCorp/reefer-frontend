import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";
import HeroWaves from "../components/HeroWaves";
import ProductTile from "../components/product/ProductTile";
import { useProducts } from "../hooks/useProducts";
import { toDropCard } from "../utils/product";
import logo from "/reefer-logo.jpg";

const MANIFESTO =
  "Reefer was never a plan. It was a dare. We print tees the way waves hit: loud, sudden, and gone before you can screenshot them. Small batches. No restocks. No committees deciding what you wear. If you missed the last drop, that was the universe telling you to move faster. Paddle out.";
const MANIFESTO_WORDS = MANIFESTO.split(" ");
const WORD_STYLE = { opacity: 0.13, transition: "opacity 0.25s linear" };

// Hoisted so useProducts' JSON.stringify key stays identical across renders.
const NEWEST_FIRST = { sort: "newest" };

const CHAPTERS = [
  { href: "#hero", label: "//00 WAVE" },
  { href: "#manifesto", label: "//01 MANIFESTO" },
  { href: "#drop", label: "//02 THE DROP" },
  { href: "#cult", label: "//03 THE CULT" },
];

// The mockup samples each band's background with getComputedStyle and branches on
// luminance. The palette is fixed and we own the markup, so that resolves to three
// constants — and the per-frame style recalc disappears with it.
const TONES = {
  dark: { base: "rgba(246,241,231,0.5)", accent: "#F97B0C", shadow: "0 1px 8px rgba(0,0,0,0.55)" },
  orange: { base: "rgba(16,16,16,0.55)", accent: "#14213D", shadow: "0 1px 5px rgba(255,255,255,0.3)" },
  light: { base: "rgba(16,16,16,0.32)", accent: "#F97B0C", shadow: "0 1px 7px rgba(246,241,231,0.85)" },
};

// The curtain belongs to the first paint of the session. In the mockup every page
// was a document load; here a client-side return to "/" would just replay a 1.4s
// tax, so it fires once.
let curtainSpent = false;

export default function Home() {
  const { products } = useProducts(NEWEST_FIRST);
  const cards = products.map((p, i) => toDropCard(p, i));

  const heroRef = useRef(null);
  const waveWrapRef = useRef(null);
  const heroContentRef = useRef(null);
  const badgeRef = useRef(null);
  const manifestoRef = useRef(null);
  const dropRef = useRef(null);
  const cultRef = useRef(null);
  const railRef = useRef(null);
  const skewRef = useRef(null);

  const [curtain] = useState(
    () => !curtainSpent && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [loadPct, setLoadPct] = useState(0);
  const [lifted, setLifted] = useState(false);
  // The rail is desktop-only chrome: below 1024px it floats over the product grid.
  const [railWide, setRailWide] = useState(() => window.innerWidth > 1024);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1025px)");
    const onChange = () => setRailWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!curtain) return;
    curtainSpent = true;
    // setInterval, not rAF: the counter has to keep ticking through the frame drops
    // of a cold start, and a rAF chain stalls there.
    const t0 = performance.now();
    let lift;
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / 1400);
      setLoadPct(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p >= 1) {
        clearInterval(timer);
        lift = setTimeout(() => setLifted(true), 150);
      }
    }, 40);
    // Hard fallback: never let the curtain trap the page shut.
    const fallback = setTimeout(() => {
      clearInterval(timer);
      setLoadPct(100);
      setLifted(true);
    }, 3000);
    return () => {
      clearInterval(timer);
      clearTimeout(lift);
      clearTimeout(fallback);
    };
  }, [curtain]);

  // One rAF loop drives every scroll-linked effect on this page, exactly as the
  // mockup's does: hero submerge, manifesto word ramp, chapter rail, marquee skew.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const words = manifestoRef.current
      ? Array.from(manifestoRef.current.querySelectorAll("[data-word]"))
      : [];
    const links = railRef.current
      ? Array.from(railRef.current.querySelectorAll("[data-chapnav]"))
      : [];
    const sections = [heroRef.current, manifestoRef.current, dropRef.current, cultRef.current];
    const paras = [
      [heroContentRef.current, 0.3],
      [badgeRef.current, 0.15],
    ].filter(([el]) => el);
    const bands = [
      [heroRef.current, "light"],
      [manifestoRef.current, "dark"],
      [dropRef.current, "light"],
      [cultRef.current, "orange"],
      [document.querySelector("footer"), "dark"],
    ].filter(([el]) => el);

    // A progressive reveal with no motion is just unreadable text.
    if (reduce) {
      words.forEach((el) => {
        el.style.opacity = "1";
      });
    }

    let lastY = window.scrollY;
    let vel = 0;
    let lastLit = -1;
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const vh = window.innerHeight;
      const y = window.scrollY;

      // --- hero submerge -------------------------------------------------
      if (!reduce) {
        const p = Math.max(0, Math.min(1, y / (vh * 0.85)));
        const dive = Math.pow(p, 1.25); // ease-in so it accelerates as it goes under
        // Waves ride behind the type at rest, then rise in front to occlude it.
        if (waveWrapRef.current) waveWrapRef.current.style.zIndex = p > 0.03 ? "2" : "0";
        for (const [el, speed] of paras) {
          const ratio = speed / 0.3;
          const sink = dive * vh * 0.5 * ratio; // descend toward the waterline
          const scale = 1 - dive * 0.1 * ratio; // shrink as it drops away
          const blur = dive * 7 * ratio; // go out of focus underwater
          const drown = 1 - dive * 0.55; // dim like light fading below the surface
          el.style.transform = `translateY(${sink.toFixed(1)}px) scale(${scale.toFixed(3)})`;
          el.style.filter = `blur(${blur.toFixed(1)}px) brightness(${Math.max(0.45, drown).toFixed(2)})`;
          el.style.opacity = String(Math.max(0, 1 - dive * 0.85));
        }
      }

      // --- manifesto word ramp -------------------------------------------
      if (!reduce && words.length && manifestoRef.current) {
        const r = manifestoRef.current.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height * 0.9)));
        const lit = Math.floor(progress * words.length * 1.15);
        if (lit !== lastLit) {
          words.forEach((el, i) => {
            el.style.opacity = i < lit ? "1" : "0.13";
          });
          lastLit = lit;
        }
      }

      // --- chapter rail ---------------------------------------------------
      // Below 1024px the rail is unmounted from view entirely, which also makes the
      // mockup's <=768px slide-out branch unreachable — nothing to update.
      if (links.length && window.innerWidth > 1024) {
        let active = 0;
        sections.forEach((s, i) => {
          if (s && s.getBoundingClientRect().top <= vh * 0.5) active = i;
        });
        const rects = bands.map(([el, kind]) => [el.getBoundingClientRect(), kind]);
        links.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const cy = r.top + r.height / 2;
          let tone = TONES.light;
          for (const [br, kind] of rects) {
            if (cy >= br.top && cy < br.bottom) tone = TONES[kind];
          }
          const on = i === active;
          el.style.color = on ? tone.accent : tone.base;
          el.style.textShadow = tone.shadow;
          if (!reduce) el.style.transform = on ? "translateX(-6px) scale(1.14)" : "translateX(0) scale(1)";
        });
      }

      // --- scroll-velocity skew -------------------------------------------
      vel += (y - lastY - vel) * 0.1;
      lastY = y;
      if (!reduce && skewRef.current) {
        const skew = Math.max(-10, Math.min(10, vel * 0.35));
        skewRef.current.style.transform = `skewX(${(-skew).toFixed(2)}deg)`;
      }
    };

    frame();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      {/* ===== Preloader ===== */}
      {curtain && (
        <div
          aria-hidden={lifted || undefined}
          style={{
            position: "fixed",
            inset: 0,
            background: "#101010",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: lifted ? "translateY(-100%)" : "translateY(0)",
            transition: "transform 0.8s cubic-bezier(.76,0,.24,1)",
            pointerEvents: lifted ? "none" : "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <img src={logo} alt="" decoding="async" style={{ width: 84, height: 84, borderRadius: 16, animation: "bob 1.6s ease-in-out infinite" }} />
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 30, letterSpacing: "0.14em", color: "#F6F1E7" }}>REEFER</span>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 64, lineHeight: 1, color: "#F97B0C" }}>
              {loadPct}
              <span style={{ fontSize: 28 }}>%</span>
            </span>
            <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.24em", color: "#6B6560" }}>PADDLING OUT…</span>
          </div>
        </div>
      )}

      {/* ===== Chapter indicator ===== */}
      <nav
        ref={railRef}
        aria-label="Chapters"
        style={{
          position: "fixed",
          right: 22,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 70,
          transition: "opacity 0.4s ease, transform 0.45s cubic-bezier(.2,.7,.2,1)",
          display: railWide ? "flex" : "none",
          flexDirection: "column",
          gap: 14,
          fontWeight: 900,
          fontSize: 11,
          letterSpacing: "0.18em",
          textAlign: "right",
        }}
      >
        {CHAPTERS.map((c, i) => (
          <a
            key={c.href}
            href={c.href}
            data-chapnav={i}
            style={{
              color: "#101010",
              textDecoration: "none",
              transformOrigin: "right center",
              transition: "color 0.35s, text-shadow 0.35s, transform 0.35s cubic-bezier(.2,.7,.2,1)",
              willChange: "transform",
            }}
          >
            {c.label}
          </a>
        ))}
      </nav>

      <Nav />

      {/* ===== //00 Hero ===== */}
      <header
        id="hero"
        ref={heroRef}
        data-chapter="0"
        style={{
          position: "relative",
          height: "100dvh",
          minHeight: 600,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* HeroWaves owns the canvas; the scroll-driven z-index flip (0 → 2 once the
            dive starts) lands on this wrapper instead. */}
        <div ref={waveWrapRef} aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <HeroWaves intensity={1} />
        </div>

        <div
          ref={heroContentRef}
          data-para="0.3"
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 1440,
            margin: "0 auto",
            padding: "92px 32px 64px",
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            willChange: "transform",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, animation: "fadeUp 0.7s both" }}>
            <span
              style={{
                background: "#F97B0C",
                color: "#101010",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: "0.16em",
                padding: "7px 14px",
                border: "2px solid #101010",
                boxShadow: "3px 3px 0 #101010",
              }}
            >
              TIDAL SZN 03 — OUT NOW
            </span>
            <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.18em", color: "#6B6357" }}>
              SMALL BATCH · 300 PCS · NO RESTOCKS
            </span>
          </div>

          <h1
            style={{
              fontFamily: "Anton, sans-serif",
              fontWeight: 400,
              fontSize: "clamp(56px, min(15.5vw, 22vh), 240px)",
              lineHeight: 0.86,
              letterSpacing: "0.01em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            <span style={{ display: "block", animation: "heroWord 0.8s 0.05s cubic-bezier(.2,.7,.2,1) both" }}>
              Ride the
            </span>
            <span
              style={{
                display: "block",
                color: "transparent",
                WebkitTextStroke: "3px #F97B0C",
                animation: "heroWord 0.8s 0.18s cubic-bezier(.2,.7,.2,1) both",
              }}
            >
              wave —
            </span>
            <span style={{ display: "block", color: "#F97B0C", animation: "heroWord 0.8s 0.31s cubic-bezier(.2,.7,.2,1) both" }}>
              wear <span style={{ color: "#101010" }}>Reefer</span>
              <span style={{ color: "#14213D" }}>.</span>
            </span>
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 34, animation: "fadeUp 0.8s 0.5s both" }}>
            <Link
              to="/products"
              className="rf-cta"
              style={{
                fontFamily: "Anton, sans-serif",
                fontSize: 17,
                letterSpacing: "0.08em",
                background: "#101010",
                color: "#F6F1E7",
                textDecoration: "none",
                padding: "16px 30px",
                border: "2px solid #101010",
                boxShadow: "6px 6px 0 #F97B0C",
                display: "inline-block",
              }}
            >
              SHOP THE DROP ↓
            </Link>
            <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", color: "#6B6357", maxWidth: 200, lineHeight: 1.6 }}>
              IF YOU'RE READING THIS, THE DROP IS ALREADY MELTING.
            </span>
          </div>
        </div>

        {/* spinning badge */}
        <div ref={badgeRef} data-para="0.15" style={{ position: "absolute", top: 118, right: "clamp(180px, 17vw, 320px)", zIndex: 1, width: 150, height: 150, animation: "fadeUp 1s 0.6s both" }}>
          <img src={logo} alt="" style={{ position: "absolute", inset: 44, width: 62, height: 62, borderRadius: 12, boxShadow: "0 12px 30px rgba(16,16,16,0.25)" }} />
          <svg viewBox="0 0 150 150" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", animation: "spin 14s linear infinite" }}>
            <defs>
              <path id="circ" d="M 75,75 m -62,0 a 62,62 0 1,1 124,0 a 62,62 0 1,1 -124,0" />
            </defs>
            <text style={{ fontFamily: "Archivo, sans-serif", fontWeight: 900, fontSize: "12.5px", letterSpacing: "3px", fill: "#101010" }}>
              <textPath href="#circ">REEFER MNL ★ TIDAL SZN 03 ★ NO RESTOCKS ★ RIDE THE WAVE ★</textPath>
            </text>
          </svg>
        </div>

        {/* hero foot bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            borderTop: "2px solid #101010",
            background: "#F6F1E7",
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            padding: "12px 32px",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "#101010",
          }}
        >
          <span>EST. 2024 — MANILA</span>
          <span>14.5995° N, 120.9842° E</span>
          <span style={{ color: "#F97B0C" }}>▼ SCROLL TO PADDLE OUT</span>
          <span>100% COTTON, 0% BORING</span>
          <span>|||||||||||||||||</span>
        </div>
      </header>

      {/* ===== //01 Manifesto ===== */}
      <section id="manifesto" ref={manifestoRef} data-chapter="1" style={{ background: "#101010", color: "#F6F1E7", padding: "150px 32px", position: "relative", overflow: "hidden" }}>
        <span
          style={{
            position: "absolute",
            top: -40,
            right: -20,
            fontFamily: "Anton, sans-serif",
            fontSize: "clamp(200px, 30vw, 480px)",
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: "1px rgba(246,241,231,0.09)",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          01
        </span>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 40, position: "relative" }}>
          <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>//01 MANIFESTO</span>
          <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(48px, 7.5vw, 116px)", lineHeight: 0.9, margin: 0, textTransform: "uppercase" }}>
            Cotton with
            <br />
            <span style={{ color: "transparent", WebkitTextStroke: "2.5px #F97B0C" }}>conviction.</span>
          </h2>
          <p style={{ fontSize: "clamp(22px, 2.6vw, 36px)", lineHeight: 1.45, fontWeight: 600, margin: 0, maxWidth: 980 }}>
            {MANIFESTO_WORDS.map((w, i) => (
              <span key={i} data-word="" style={WORD_STYLE}>
                {w + " "}
              </span>
            ))}
          </p>
          <div style={{ display: "flex", gap: 40, fontWeight: 700, fontSize: 11, letterSpacing: "0.18em", color: "#6B6560", borderTop: "1px solid #2A2724", paddingTop: 22 }}>
            <span>NO COMMITTEES</span>
            <span>NO RESTOCKS</span>
            <span style={{ color: "#F97B0C" }}>NO CHILL</span>
          </div>
        </div>
      </section>

      {/* ===== //02 The Drop ===== */}
      <section id="drop" ref={dropRef} data-chapter="2" style={{ maxWidth: 1440, margin: "0 auto", padding: "130px 32px 100px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 54 }}>
          <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>//02 THE DROP</span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
            <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(48px, 7vw, 110px)", margin: 0, textTransform: "uppercase", lineHeight: 0.9 }}>
              Tidal SZN 03<span style={{ color: "#F97B0C" }}>.</span>
            </h2>
            <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.16em", color: "#6B6357" }}>
              {products.length} TEES · SIZES S–XXL · SHIPS FROM MNL
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 30 }}>
          {cards.map((item) => (
            <ProductTile key={item.slug} item={item} corner={item.num} />
          ))}
        </div>
      </section>

      {/* ===== //03 The Cult ===== */}
      <section id="cult" ref={cultRef} data-chapter="3" style={{ background: "#F97B0C", color: "#101010", padding: "130px 0 110px", overflow: "hidden", borderTop: "2px solid #101010" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
            <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#101010" }}>//03 THE CULT</span>
            <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(44px, 6.5vw, 96px)", lineHeight: 0.9, margin: 0, textTransform: "uppercase" }}>
              We prioritize fit checks
              <br />
              <span style={{ color: "#F6F1E7" }}>and warm intros.</span>
            </h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, margin: 0, maxWidth: 560, fontWeight: 600 }}>
              Tag <span style={{ fontWeight: 900, textDecoration: "underline" }}>@reefer.mnl</span> wearing the drop and we repost the hardest fits. That's the whole loyalty program.
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <a href="#" className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.1em", background: "#101010", color: "#F6F1E7", textDecoration: "none", padding: "14px 26px", border: "2px solid #101010", boxShadow: "5px 5px 0 #F6F1E7", display: "inline-block" }}>
                INSTAGRAM
              </a>
              <a href="#" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.1em", background: "none", color: "#101010", border: "2px solid #101010", textDecoration: "none", padding: "14px 26px", display: "inline-block" }}>
                TIKTOK
              </a>
            </div>
          </div>
          <div ref={skewRef} style={{ overflow: "hidden", borderTop: "2px solid #101010", borderBottom: "2px solid #101010", background: "#F97B0C", padding: "10px 0", willChange: "transform" }}>
            <div style={{ display: "flex", width: "max-content", animation: "marquee 16s linear infinite", fontFamily: "Anton, sans-serif", fontSize: "clamp(60px, 10vw, 150px)", lineHeight: 1, color: "transparent", WebkitTextStroke: "2px #101010", textTransform: "uppercase" }}>
              <span style={{ whiteSpace: "nowrap", paddingRight: 48 }}>Ride the wave ★ No restocks ★ Ride the wave ★ No restocks ★&nbsp;</span>
              <span style={{ whiteSpace: "nowrap", paddingRight: 48 }}>Ride the wave ★ No restocks ★ Ride the wave ★ No restocks ★&nbsp;</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { useEffect, useRef } from "react";

// The hero's <canvas> waves, grown out of the mockup's drawWaves(): five stacked
// sine-wave layers rising from just above the hero's midline, with a subtle
// mouse-driven amplitude/tilt. Sits at z-index 0 behind the hero type.
export default function HeroWaves({ intensity = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const onMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    // Only where a mouse can actually exist. On a phone this listener never fires but
    // still costs an event registration, and every frame would keep recomputing a
    // parallax tilt from a cursor that isn't there.
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (finePointer) document.addEventListener("mousemove", onMove, { passive: true });

    /*
     * base  = vertical rest position as a share of hero height (smaller = higher up)
     * amp   = crest height in px
     * speed = horizontal drift
     * len   = wavelength
     * color = fill; with `color2` the layer fills on a vertical gradient instead
     * crest = optional hairline along the wave's own top edge
     * phase = fixed offset so the layers never crest in unison
     *
     * Five layers, not four, and the set now starts at 0.51 rather than 0.70 — the
     * swell reaches up behind the headline instead of sitting in the bottom third.
     * The two highest are nearly transparent on purpose: they add depth behind the
     * type without competing with it for contrast.
     */
    // `faint` marks the two haze layers: they carry the least of the look and are the
    // first thing dropped on a phone, where five full-canvas repaints a frame is the
    // difference between 13fps and 60.
    const layers = [
      { base: 0.51, amp: 30, speed: 0.45, len: 0.0055, phase: 0.0, faint: true, color: "rgba(20,33,61,0.05)" },
      { base: 0.59, amp: 38, speed: 0.7, len: 0.0044, phase: 1.7, faint: true, color: "rgba(20,33,61,0.08)" },
      { base: 0.68, amp: 44, speed: 0.95, len: 0.0037, phase: 3.4, color: "rgba(249,123,12,0.16)", color2: "rgba(249,123,12,0.30)" },
      { base: 0.78, amp: 50, speed: 1.3, len: 0.0030, phase: 5.0, color: "#FB8F2E", color2: "#F97B0C", crest: "rgba(255,255,255,0.32)" },
      // Crest is white, not orange: this layer sits ON the orange one, so an orange
      // hairline would be invisible exactly where the edge actually falls.
      { base: 0.90, amp: 34, speed: 1.65, len: 0.0046, phase: 2.2, color: "#1B2B4D", color2: "#14213D", crest: "rgba(255,255,255,0.22)" },
    ];

    let t = 0;
    let raf;

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      // Phone-sized viewport: budget accordingly. Read from the canvas rather than a
      // media query so a resized desktop window is treated the same way.
      const lowPower = w < 820;
      /*
       * Budget the backing store by AREA, not by a fixed DPR cap.
       *
       * A cap alone scales badly in both directions: a DPR-3 phone was painting 1.3
       * megapixels a frame, and a Retina desktop at DPR 2 was painting 5.1 — which
       * measured at 23fps, worse than the phone. Since cost tracks pixels, cap the
       * pixels and let DPR fall out of it. Never below 1, or the bands go visibly soft.
       */
      const AREA_BUDGET = 2.6e6;
      const budgetDpr = Math.sqrt(AREA_BUDGET / Math.max(1, w * h));
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2, budgetDpr));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const clampedIntensity = Math.max(0, Math.min(2, intensity));
      const mx = mouse.x / Math.max(1, w) - 0.5;
      const my = mouse.y / Math.max(1, h) - 0.5;

      // Wavelengths are authored against a ~1440px hero. Left absolute, a phone shows
      // roughly a fifth of one cycle and the "waves" flatten into diagonal wedges, so
      // scale them by width to keep the same number of crests on every screen.
      const lenScale = 1440 / Math.max(320, w);

      // Coarser sampling on a narrow canvas — at 390px wide, 8px steps are still
      // under three points per visible degree of the curve.
      const step = lowPower ? 8 : 4;

      for (const L of layers) {
        if (lowPower && L.faint) continue;
        const amp = L.amp * clampedIntensity * (1 + Math.abs(mx) * 0.9);
        const yBase = h * (L.base + my * 0.03);
        const len = L.len * lenScale;

        // Points once, used twice — the fill needs them closed to the bottom, the
        // crest hairline needs the open top edge on its own.
        const pts = [];
        for (let x = 0; x <= w; x += step) {
          const p = x * len + L.phase;
          const y =
            yBase +
            Math.sin(p + t * L.speed) * amp +
            Math.sin(p * 2.3 + t * L.speed * 1.6 + 2) * amp * 0.35 +
            // A third, much longer harmonic: two sines alone repeat visibly across a
            // wide hero, and the eye catches the loop.
            Math.sin(p * 0.45 + t * L.speed * 0.5) * amp * 0.28 +
            Math.sin((x - mouse.x) * 0.004) * amp * 0.25 * mx * 2;
          pts.push(x, y);
        }

        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.lineTo(w, h);
        ctx.closePath();
        if (L.color2 && !lowPower) {
          // Lit along the crest, deepening toward the trough — a flat fill reads as
          // cut paper, which is fine for one band and muddy once there are five.
          // Skipped on a phone: this allocates a gradient object per layer per frame,
          // and with only three bands left the flat fill reads fine anyway.
          const g = ctx.createLinearGradient(0, yBase - amp * 1.5, 0, h);
          g.addColorStop(0, L.color);
          g.addColorStop(1, L.color2);
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = L.color;
        }
        ctx.fill();

        if (L.crest) {
          ctx.beginPath();
          ctx.moveTo(pts[0], pts[1]);
          for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
          ctx.strokeStyle = L.crest;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    };

    // Half rate on phones — 30fps is smooth for a slow swell, and it halves the work
    // and the battery cost. `t` still advances every tick, so the wave travels at the
    // same speed either way; only the number of repaints changes.
    let tick = 0;
    const loop = () => {
      t += 0.016;
      tick++;
      const half = canvas.clientWidth < 820;
      // The waves only live in the 100dvh hero; skip the repaint once it's scrolled
      // past, but keep the RAF alive so they resume when you scroll back up.
      if (window.scrollY < window.innerHeight && (!half || tick % 2 === 0)) draw();
      raf = requestAnimationFrame(loop);
    };

    if (reduceMotion) {
      draw(); // one static frame, no animation
    } else {
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      if (finePointer) document.removeEventListener("mousemove", onMove);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", zIndex: 0, pointerEvents: "none" }}
    />
  );
}

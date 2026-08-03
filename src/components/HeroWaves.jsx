import { useEffect, useRef } from "react";

// Faithful port of the mockup's hero <canvas> waves (drawWaves()): four stacked
// sine-wave layers rising from the lower third of the hero, with a subtle
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
    document.addEventListener("mousemove", onMove, { passive: true });

    // base = vertical rest position (share of hero height); amp = wave height;
    // speed = horizontal drift; len = wavelength; color = fill (back → front).
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

      const clampedIntensity = Math.max(0, Math.min(2, intensity));
      const mx = mouse.x / Math.max(1, w) - 0.5;
      const my = mouse.y / Math.max(1, h) - 0.5;

      for (const L of layers) {
        const amp = L.amp * clampedIntensity * (1 + Math.abs(mx) * 0.9);
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
    };

    const loop = () => {
      t += 0.016;
      // The waves only live in the 100dvh hero; skip the repaint once it's scrolled
      // past, but keep the RAF alive so they resume when you scroll back up.
      if (window.scrollY < window.innerHeight) draw();
      raf = requestAnimationFrame(loop);
    };

    if (reduceMotion) {
      draw(); // one static frame, no animation
    } else {
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
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

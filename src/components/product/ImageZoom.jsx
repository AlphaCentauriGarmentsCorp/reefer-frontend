import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Full-screen zoom for a product shot.
 *
 * Mounted only while open, and never kept around hidden. That is deliberate: it means
 * every open starts at 1x dead-centre without an effect having to reset state — a
 * cheaper trick than syncing props into state, and it keeps the component honest about
 * having no memory between viewings.
 *
 * The image is positioned by transform alone. Nothing here reflows, so panning stays
 * smooth on a phone, and `willChange` keeps it on its own layer while dragging.
 */
const MIN = 1;
const MAX = 4;
const STEP = 0.5;
const DOUBLE_TAP = 2.5;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export default function ImageZoom({ src, alt, onClose }) {
  const [scale, setScale] = useState(MIN);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const closeRef = useRef(null);
  // Pointer id + where the drag started, in one ref so a re-render mid-drag can't
  // desync them. Null means "not dragging".
  const drag = useRef(null);
  // The same fact again as state, because the cursor and the transition are rendered
  // from it — and a ref read during render is both a lint error and a stale value.
  const [dragging, setDragging] = useState(false);
  // Set on any real movement so the click that ends a drag doesn't also close.
  const moved = useRef(false);

  /**
   * Keep the picture overlapping its frame. At 1x there is nothing to pan, and past
   * that the slack is exactly the overhang each side — so the shopper can always reach
   * a corner but can never fling the shirt off-screen and be left staring at black.
   */
  const bound = useCallback((next, atScale) => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const { width, height } = el.getBoundingClientRect();
    const slackX = Math.max(0, (width * atScale - width) / 2);
    const slackY = Math.max(0, (height * atScale - height) / 2);
    return { x: clamp(next.x, -slackX, slackX), y: clamp(next.y, -slackY, slackY) };
  }, []);

  /**
   * Zoom about a point rather than the centre: whatever is under the cursor — the print,
   * a seam, the neck tag — has to stay under the cursor, or inspecting a detail turns
   * into chasing it around the frame.
   */
  const zoomAbout = useCallback(
    (nextScale, clientX, clientY) => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const to = clamp(nextScale, MIN, MAX);
      setScale(to);
      setPan((prev) => {
        if (to === MIN) return { x: 0, y: 0 };
        // Offset of the cursor from the frame's centre, in unscaled image space.
        const cx = (clientX ?? r.left + r.width / 2) - (r.left + r.width / 2);
        const cy = (clientY ?? r.top + r.height / 2) - (r.top + r.height / 2);
        const ratio = to / (scale || 1);
        return bound({ x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio }, to);
      });
    },
    [scale, bound],
  );

  // Escape closes, arrows nudge, +/- zoom. A zoom viewer that traps the keyboard would
  // be worse than one that never opened.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "+" || e.key === "=") return zoomAbout(scale + STEP);
      if (e.key === "-" || e.key === "_") return zoomAbout(scale - STEP);
      if (e.key === "0") { setScale(MIN); setPan({ x: 0, y: 0 }); return; }
      const nudge = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] }[e.key];
      if (nudge && scale > MIN) {
        e.preventDefault();
        setPan((p) => bound({ x: p.x + nudge[0], y: p.y + nudge[1] }, scale));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, scale, zoomAbout, bound]);

  // The page behind must not scroll while this is up — on a phone a pan gesture would
  // otherwise scroll the product page out from under the image.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Non-passive, because zooming has to suppress the browser's own page zoom/scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAbout(scale + (e.deltaY < 0 ? STEP : -STEP), e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, zoomAbout]);

  const onPointerDown = (e) => {
    if (scale === MIN) return;
    drag.current = { id: e.pointerId, x: e.clientX - pan.x, y: e.clientY - pan.y };
    moved.current = false;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    moved.current = true;
    setPan(bound({ x: e.clientX - d.x, y: e.clientY - d.y }, scale));
  };

  const endDrag = (e) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  const zoomed = scale > MIN;

  const ctl = {
    width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
    background: "#F6F1E7", color: "#101010", border: "2px solid #101010",
    fontFamily: "Anton, sans-serif", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 0,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — zoom`}
      onClick={() => { if (!moved.current) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200, background: "rgba(16,16,16,0.92)",
        display: "flex", flexDirection: "column", animation: "rf-zoom-fade 0.18s ease-out",
      }}
    >
      {/* Bar. stopPropagation so the controls don't fall through to the close-on-backdrop. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "14px 18px", borderBottom: "2px solid #F6F1E7", flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em", color: "#F6F1E7", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {alt}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button type="button" onClick={() => zoomAbout(scale - STEP)} disabled={scale <= MIN} aria-label="Zoom out" style={{ ...ctl, opacity: scale <= MIN ? 0.4 : 1, cursor: scale <= MIN ? "not-allowed" : "pointer" }}>−</button>
          <span aria-live="polite" style={{ minWidth: 56, textAlign: "center", fontWeight: 900, fontSize: 12, letterSpacing: "0.1em", color: "#F6F1E7" }}>
            {Math.round(scale * 100)}%
          </span>
          <button type="button" onClick={() => zoomAbout(scale + STEP)} disabled={scale >= MAX} aria-label="Zoom in" style={{ ...ctl, opacity: scale >= MAX ? 0.4 : 1, cursor: scale >= MAX ? "not-allowed" : "pointer" }}>+</button>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close zoom" style={{ ...ctl, background: "#F97B0C", marginLeft: 4 }}>✕</button>
        </div>
      </div>

      <div
        ref={stageRef}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) => zoomAbout(zoomed ? MIN : DOUBLE_TAP, e.clientX, e.clientY)}
        style={{
          flex: 1, minHeight: 0, overflow: "hidden", display: "flex",
          alignItems: "center", justifyContent: "center",
          cursor: zoomed ? (dragging ? "grabbing" : "grab") : "zoom-in",
          touchAction: "none", // we handle panning ourselves
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block",
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.18s ease-out",
            willChange: "transform", userSelect: "none",
          }}
        />
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ padding: "10px 18px 14px", textAlign: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#A99F8C" }}>
          {zoomed ? "DRAG TO MOVE · DOUBLE-CLICK TO RESET · ESC TO CLOSE" : "SCROLL OR DOUBLE-CLICK TO ZOOM · ESC TO CLOSE"}
        </span>
      </div>
    </div>
  );
}

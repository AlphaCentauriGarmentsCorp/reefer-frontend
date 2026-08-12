import { useEffect, useRef } from "react";

/**
 * Shown once, at the cart, when a signed-in shopper with an empty address book taps
 * CHECKOUT.
 *
 * Checkout can already take an address inline, so this is an offer rather than a wall:
 * saving one now means this and every later order is one tap, but "later" goes straight
 * to checkout with nothing lost. That is why neither button is destructive and why the
 * dismissal is remembered — see DISMISS_KEY below.
 */
export const DISMISS_KEY = "reefer:addressPromptDismissed";

export default function AddressPrompt({ open, onClose, onSetUp, onLater }) {
  const laterRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Focus the non-committal option: this dialog appears under a cursor that was
    // aiming at CHECKOUT, and Enter should not fire a navigation they did not choose.
    const t = setTimeout(() => laterRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <div
      onClick={onClose}
      aria-hidden={!open}
      style={{
        position: "fixed", inset: 0, zIndex: 165, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24, background: "rgba(16,16,16,0.55)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        // visibility, not just pointer-events: an invisible but focusable button would
        // still be reachable by Tab and would navigate the page away.
        visibility: open ? "visible" : "hidden", transition: "opacity 0.25s, visibility 0.25s",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Save a delivery address"
        style={{
          width: "min(440px, 100%)", background: "#F6F1E7", border: "2px solid #101010",
          boxShadow: "12px 12px 0 #F97B0C", padding: "30px 26px 26px",
          transform: open ? "scale(1)" : "scale(0.9)",
          transition: "transform 0.28s cubic-bezier(.2,.9,.3,1.2)",
        }}
      >
        <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.22em", color: "#F97B0C" }}>
          WHERE ARE WE SENDING IT
        </span>

        <h2
          style={{
            fontFamily: "Anton, sans-serif", fontWeight: 400, margin: "10px 0 0",
            fontSize: "clamp(28px, 7vw, 38px)", lineHeight: 0.95, textTransform: "uppercase",
          }}
        >
          No address saved yet<span style={{ color: "#F97B0C" }}>.</span>
        </h2>

        <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.65, color: "#6B6357", fontWeight: 600 }}>
          Save one to your account and every order after this is one tap. You can also do
          it later — checkout will just ask for it there instead.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <button
            onClick={onSetUp}
            className="rf-cta"
            style={{
              fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.06em",
              background: "#101010", color: "#F6F1E7", border: "2px solid #101010",
              padding: "15px 20px", cursor: "pointer", boxShadow: "6px 6px 0 #F97B0C",
            }}
          >
            SET UP MY ADDRESS →
          </button>

          <button
            ref={laterRef}
            onClick={onLater}
            style={{
              fontWeight: 800, fontSize: 12, letterSpacing: "0.16em", background: "transparent",
              color: "#101010", border: "2px solid #101010", padding: "13px 20px", cursor: "pointer",
            }}
          >
            SET UP ANOTHER TIME
          </button>
        </div>
      </div>
    </div>
  );
}

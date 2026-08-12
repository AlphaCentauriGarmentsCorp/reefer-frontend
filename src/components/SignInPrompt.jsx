import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * The signed-out gate for actions that belong to an account.
 *
 * Favourites and the cart used to handle a signed-out shopper in two different ways:
 * the heart bounced straight to /sign-in, losing the page and any explanation, while
 * Add to cart just silently filed the pick in a localStorage guest cart. Both are
 * defensible, neither told the shopper anything, and one of them moved them off the
 * product they were looking at without asking.
 *
 * This replaces both with the same question, asked once: make an account, or keep
 * looking. Nothing is decided for them and nothing is lost — dismissing returns to
 * exactly where they were.
 *
 * `returnTo` is passed through to /sign-in so the trip is a round trip; `reason` is
 * shown by SignIn as context for why the wall appeared.
 */
export default function SignInPrompt({ open, onClose, action = "do that", reason = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const closeRef = useRef(null);

  // Escape closes, and focus lands on the dismissive option rather than the one that
  // navigates away — the safer default when a dialog appears under your cursor.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  const toSignIn = () => {
    const params = new URLSearchParams({ return: location.pathname + location.search });
    if (reason) params.set("reason", reason);
    navigate(`/sign-in?${params.toString()}`);
  };

  return (
    <div
      onClick={onClose}
      aria-hidden={!open}
      style={{
        position: "fixed", inset: 0, zIndex: 160, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24, background: "rgba(16,16,16,0.55)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        // visibility, not just pointer-events: an invisible but focusable "CREATE AN
        // ACCOUNT" would still be reachable by Tab and would navigate the page away.
        visibility: open ? "visible" : "hidden", transition: "opacity 0.25s, visibility 0.25s",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to continue"
        style={{
          width: "min(430px, 100%)", background: "#F6F1E7", border: "2px solid #101010",
          boxShadow: "12px 12px 0 #F97B0C", padding: "30px 26px 26px",
          transform: open ? "scale(1)" : "scale(0.9)",
          transition: "transform 0.28s cubic-bezier(.2,.9,.3,1.2)",
        }}
      >
        <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.22em", color: "#F97B0C" }}>
          MEMBERS ONLY-ISH
        </span>

        <h2
          style={{
            fontFamily: "Anton, sans-serif", fontWeight: 400, margin: "10px 0 0",
            fontSize: "clamp(28px, 7vw, 38px)", lineHeight: 0.95, textTransform: "uppercase",
          }}
        >
          Make an account to {action}<span style={{ color: "#F97B0C" }}>.</span>
        </h2>

        <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.65, color: "#6B6357", fontWeight: 600 }}>
          Your cart and favourites ride with your account, so they survive a closed tab
          and follow you to your phone. Takes about ten seconds.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <button
            onClick={toSignIn}
            className="rf-cta"
            style={{
              fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.06em",
              background: "#101010", color: "#F6F1E7", border: "2px solid #101010",
              padding: "15px 20px", cursor: "pointer", boxShadow: "6px 6px 0 #F97B0C",
            }}
          >
            CREATE AN ACCOUNT
          </button>

          <button
            ref={closeRef}
            onClick={onClose}
            style={{
              fontWeight: 800, fontSize: 12, letterSpacing: "0.16em", background: "transparent",
              color: "#101010", border: "2px solid #101010", padding: "13px 20px", cursor: "pointer",
            }}
          >
            CONTINUE BROWSING
          </button>
        </div>

        <button
          onClick={toSignIn}
          style={{
            display: "block", margin: "16px auto 0", background: "none", border: "none",
            padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.14em", color: "#6B6357", textDecoration: "underline",
          }}
        >
          ALREADY HAVE ONE? SIGN IN
        </button>
      </div>
    </div>
  );
}

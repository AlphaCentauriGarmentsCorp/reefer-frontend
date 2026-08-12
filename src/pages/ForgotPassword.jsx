import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/authApi";

const field = { fontFamily: "Archivo, sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 14px", border: "2px solid #101010", background: "#FFFDF8", color: "#101010" };
const label = { fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357" };
const quietLink = { fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357", textDecoration: "underline" };

// A quieter cousin of the sign-in pool: two SVG bands drifting instead of a
// canvas loop, because these pages are a stop on the way, not a destination.
// The path repeats itself at x+1440 so translating one screen-width loops seamlessly.
const WAVE_PATH =
  "M0,110 C120,70 240,60 360,100 C480,140 600,170 720,130 C840,90 960,60 1080,90 C1200,120 1320,140 1440,110 " +
  "C1560,70 1680,60 1800,100 C1920,140 2040,170 2160,130 C2280,90 2400,60 2520,90 C2640,120 2760,140 2880,110 " +
  "L2880,220 L0,220 Z";

const WAVE_CSS = `
@keyframes rfDrift{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.rf-wave{position:fixed;left:0;right:0;bottom:0;height:34vh;min-height:190px;z-index:0;pointer-events:none;overflow:hidden}
.rf-wave svg{position:absolute;left:0;bottom:0;width:200%;height:100%;animation:rfDrift 24s linear infinite}
@media (prefers-reduced-motion: reduce){.rf-wave svg{animation:none}}
`;

export function AuthWaves() {
  return (
    <>
      <style>{WAVE_CSS}</style>
      <div className="rf-wave" aria-hidden="true">
        <svg viewBox="0 0 2880 220" preserveAspectRatio="none" style={{ animationDuration: "26s" }}>
          <path d={WAVE_PATH} fill="#F97B0C" fillOpacity="0.22" />
        </svg>
        <svg viewBox="0 0 2880 220" preserveAspectRatio="none" style={{ animationDuration: "17s", bottom: -28 }}>
          <path d={WAVE_PATH} fill="#14213D" />
        </svg>
      </div>
    </>
  );
}

// Minimal nav + centred card, the same shell the sign-in page uses. Exported
// because /reset-password is the other half of this one flow and must look
// identical; it belongs in components/layout the moment a third page wants it.
export function AuthShell({ back = "/sign-in", backLabel = "← BACK TO SIGN IN", children }) {
  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflowX: "clip" }}>
      <AuthWaves />

      <nav style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "2px solid #101010", background: "#F6F1E7" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#101010" }}>
          <img src="/reefer-logo.jpg" alt="Reefer" style={{ width: 36, height: 36, borderRadius: 6, display: "block" }} />
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, letterSpacing: "0.06em" }}>REEFER</span>
        </Link>
        <Link to={back} style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.03em", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: "9px 16px", boxShadow: "3px 3px 0 #F97B0C", background: "#F6F1E7" }}>
          {backLabel}
        </Link>
      </nav>

      <main style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: 440, border: "2px solid #101010", background: "#FFFDF8", padding: "44px 40px", boxShadow: "12px 12px 0 #101010", animation: "fadeUp 0.5s both" }}>{children}</div>
      </main>
    </div>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      // Whatever the API said, the visitor is told the same thing: a 404 or a
      // validation error surfaced here would answer "does this email have an
      // account?" for anyone who asked. Only a request that never reached the
      // server is worth reporting, since silence there would be a lie.
      if (err?.status) setSent(true);
      else setError(err?.message || "Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.22em", color: "#F97B0C" }}>{sent ? "CHECK YOUR INBOX" : "LOCKED OUT"}</span>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(40px, 6vw, 56px)", margin: "8px 0 20px", textTransform: "uppercase", lineHeight: 0.92 }}>
        {sent ? "Line's cast." : "Get back in."}
      </h1>

      {sent ? (
        <>
          <div style={{ border: "2px solid #101010", background: "#F6F1E7", padding: "16px 18px", boxShadow: "5px 5px 0 #F97B0C" }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, fontWeight: 600 }}>
              If an account exists for <strong style={{ wordBreak: "break-all" }}>{email}</strong>, a link to set a new password is on its way. It's only good for a short while, so use it while it's warm.
            </p>
          </div>
          <p style={{ margin: "18px 0 0", fontSize: 12, lineHeight: 1.6, color: "#6B6357", fontWeight: 600 }}>
            Nothing after a few minutes? Check the spam folder, then try again — a typo in the address looks exactly like this.
          </p>
          <div className="rf-stack-sm" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 22 }}>
            <button type="button" onClick={() => setSent(false)} className="rf-navlink" style={{ ...quietLink, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
              TRY A DIFFERENT EMAIL
            </button>
            <Link to="/sign-in" className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "12px 18px", boxShadow: "5px 5px 0 #F97B0C", textAlign: "center" }}>
              BACK TO SIGN IN →
            </Link>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 22px", fontSize: 13, lineHeight: 1.6, color: "#6B6357", fontWeight: 600 }}>
            Type the email on the account. We'll send a link that lets you set a new password — no code, no phone call.
          </p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={label}>EMAIL</span>
              <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={field} />
            </label>

            {error && <span style={{ fontSize: 12, fontWeight: 700, color: "#C0392B" }}>{error}</span>}

            <button type="submit" disabled={loading} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: 15, cursor: "pointer", marginTop: 6, boxShadow: "5px 5px 0 #F97B0C", opacity: loading ? 0.7 : 1 }}>
              {loading ? "…" : "SEND RESET LINK →"}
            </button>
          </form>

          <p style={{ margin: "22px 0 0", fontSize: 11, lineHeight: 1.6, color: "#6B6357", fontWeight: 600, textAlign: "center" }}>
            Remembered it after all?{" "}
            <Link to="/sign-in" className="rf-navlink" style={quietLink}>
              SIGN IN
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}

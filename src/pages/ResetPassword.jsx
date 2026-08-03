import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import { AuthShell } from "./ForgotPassword";

const field = { fontFamily: "Archivo, sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 14px", border: "2px solid #101010", background: "#FFFDF8", color: "#101010" };
const label = { fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357" };
const quietLink = { fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357", textDecoration: "underline" };

const MIN_LENGTH = 8; // matches RegisterRequest's password rule

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();

  // Both halves come from the emailed link; neither is ever typed by hand.
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [form, setForm] = useState({ password: "", password_confirmation: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    // Checked here as well as server-side so a mismatch costs a round trip and,
    // worse, one of this link's few uses.
    if (form.password !== form.password_confirmation) {
      setError("Those two don't match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await authApi.resetPassword({ email, token, password: form.password, password_confirmation: form.password_confirmation });
      setUser(data.user ?? (await authApi.meApi().catch(() => null)));
      // replace: the token is spent, so Back must not land on this form again.
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.errors?.password?.[0] || err?.errors?.token?.[0] || err?.errors?.email?.[0] || err?.message || "That didn't work.");
    } finally {
      setLoading(false);
    }
  };

  // A link that arrived without its two halves cannot be repaired from here.
  if (!token || !email) {
    return (
      <AuthShell>
        <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.22em", color: "#C0392B" }}>BROKEN LINK</span>
        <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(40px, 6vw, 56px)", margin: "8px 0 20px", textTransform: "uppercase", lineHeight: 0.92 }}>Washed out.</h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, lineHeight: 1.6, color: "#6B6357", fontWeight: 600 }}>
          This reset link is missing a piece — mail clients sometimes clip long URLs. Ask for a fresh one and open it in one click.
        </p>
        <Link to="/forgot-password" className="rf-cta" style={{ display: "block", fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: 15, boxShadow: "5px 5px 0 #F97B0C", textAlign: "center" }}>
          SEND A NEW LINK →
        </Link>
      </AuthShell>
    );
  }

  const short = form.password.length > 0 && form.password.length < MIN_LENGTH;

  return (
    <AuthShell>
      <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.22em", color: "#F97B0C" }}>NEW PASSWORD</span>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(40px, 6vw, 56px)", margin: "8px 0 18px", textTransform: "uppercase", lineHeight: 0.92 }}>Pick a new one.</h1>

      <p style={{ margin: "0 0 22px", fontSize: 13, lineHeight: 1.6, color: "#6B6357", fontWeight: 600 }}>
        Setting a new password for <strong style={{ color: "#101010", wordBreak: "break-all" }}>{email}</strong>. You'll be signed in straight after.
      </p>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label}>NEW PASSWORD</span>
          <input type="password" required autoFocus minLength={MIN_LENGTH} autoComplete="new-password" value={form.password} onChange={set("password")} placeholder="••••••••" style={field} />
          <span style={{ fontSize: 11, fontWeight: 600, color: short ? "#C0392B" : "#6B6357" }}>At least {MIN_LENGTH} characters.</span>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label}>CONFIRM PASSWORD</span>
          <input type="password" required minLength={MIN_LENGTH} autoComplete="new-password" value={form.password_confirmation} onChange={set("password_confirmation")} placeholder="••••••••" style={field} />
        </label>

        {error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#C0392B" }}>{error}</span>
            {/* An expired or already-used token fails here and cannot be retried,
                so the way out is always on screen next to the reason. */}
            <Link to="/forgot-password" className="rf-navlink" style={quietLink}>
              EXPIRED OR ALREADY USED? SEND A NEW LINK
            </Link>
          </div>
        )}

        <button type="submit" disabled={loading} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: 15, cursor: "pointer", marginTop: 6, boxShadow: "5px 5px 0 #F97B0C", opacity: loading ? 0.7 : 1 }}>
          {loading ? "…" : "SET PASSWORD & SIGN IN →"}
        </button>
      </form>

      <p style={{ margin: "22px 0 0", fontSize: 11, lineHeight: 1.6, color: "#6B6357", fontWeight: 600, textAlign: "center" }}>
        Changing it signs out anywhere else this account was open.
      </p>
    </AuthShell>
  );
}

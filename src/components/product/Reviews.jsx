import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { reviewApi } from "../../api/reviewApi";

const starGlyphs = (n) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

// Ratings block for the PDP, ported from the mockup's #reviews section.
// The write form appears ONLY when the server says can_review (signed in AND
// bought it); the POST re-checks regardless, so this is a courtesy not the rule.
export default function Reviews({ slug }) {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await reviewApi.list(slug);
      setData(res);
      if (res.viewer?.my_review) {
        setRating(res.viewer.my_review.rating);
        setBody(res.viewer.my_review.body || "");
      }
    } catch {
      setData(null);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return null;

  const { summary, reviews, viewer } = data;
  const count = summary?.count ?? 0;
  const average = summary?.average;
  const breakdown = summary?.breakdown || {};
  const mine = viewer?.my_review;
  const countLabel = count === 0 ? "NO RATINGS YET" : `${count} RATING${count === 1 ? "" : "S"}`;

  const submit = async () => {
    if (!rating) {
      setError("Pick a star rating first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await reviewApi.create(slug, { rating, body });
      setData(res); // the server hands back the whole block, so just adopt it
    } catch (err) {
      setError(err?.message || "Couldn't save your rating.");
    } finally {
      setBusy(false);
    }
  };

  const removeMine = async () => {
    setBusy(true);
    try {
      const res = await reviewApi.removeMine(slug);
      setData(res);
      setRating(0);
      setBody("");
    } catch (err) {
      setError(err?.message || "Couldn't remove your rating.");
    } finally {
      setBusy(false);
    }
  };

  const notice = !viewer?.signed_in
    ? "Sign in to rate this — ratings come from people who actually bought it."
    : "You can rate this once you've bought it. That's how every rating here stays real.";

  return (
    <section id="reviews" style={{ maxWidth: 1240, margin: "0 auto", padding: "10px 32px 40px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderTop: "2px solid #101010", paddingTop: 22, marginBottom: 24 }}>
        <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(26px, 3.5vw, 44px)", margin: 0, textTransform: "uppercase" }}>
          Ratings<span style={{ color: "#F97B0C" }}>.</span>
        </h2>
        <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357" }}>{countLabel}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 40, alignItems: "start" }}>
        {/* Score + breakdown */}
        <div style={{ border: "2px solid #101010", background: "#FFFDF8", padding: 22, display: "flex", flexDirection: "column", gap: 14, boxShadow: "6px 6px 0 #F97B0C" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 54, lineHeight: 0.9, color: "#F97B0C" }}>{average ?? "—"}</span>
            <span style={{ fontSize: 19, letterSpacing: 2, color: "#F97B0C", lineHeight: 1 }}>{starGlyphs(Math.round(average || 0))}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6B6357", marginTop: 4 }}>{countLabel}</span>
          </div>
          {[5, 4, 3, 2, 1].map((star) => {
            const c = breakdown[star] ?? 0;
            const pct = count ? `${Math.round((c / count) * 100)}%` : "0%";
            return (
              <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, width: 26, color: "#6B6357" }}>{star}★</span>
                <div style={{ flex: 1, height: 8, background: "#E7DFCE", border: "1px solid #101010", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#F97B0C", width: pct }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, width: 20, textAlign: "right", color: "#6B6357" }}>{c}</span>
              </div>
            );
          })}
        </div>

        {/* Write + list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {viewer?.can_review ? (
            <div style={{ border: "2px solid #101010", background: "#FFFDF8", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.03em" }}>
                {mine ? "UPDATE YOUR RATING" : "RATE THIS DROP"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setRating(s)}
                    aria-label={`${s} star${s === 1 ? "" : "s"}`}
                    style={{ background: "none", border: "none", padding: "0 2px", cursor: "pointer", fontSize: 30, lineHeight: 1, color: s <= rating ? "#F97B0C" : "#C9C0B0" }}
                  >
                    {s <= rating ? "★" : "☆"}
                  </button>
                ))}
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6B6357", marginLeft: 8 }}>
                  {rating ? `${rating}/5` : "Tap a star"}
                </span>
              </div>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="How did it fit? How's the print holding up? (optional)"
                style={{ fontFamily: "Archivo, sans-serif", fontSize: 14, fontWeight: 500, padding: "12px 14px", border: "2px solid #101010", background: "#FFFDF8", color: "#101010", width: "100%", resize: "vertical" }}
              />
              {error && <span style={{ fontSize: 12, fontWeight: 800, color: "#C0392B" }}>{error}</span>}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={submit} disabled={busy} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "12px 22px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C", opacity: busy ? 0.6 : 1 }}>
                  {busy ? "SAVING…" : mine ? "UPDATE RATING" : "POST RATING"}
                </button>
                {mine && (
                  <button onClick={removeMine} style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", background: "none", color: "#C0392B", border: "none", padding: 4, cursor: "pointer", textDecoration: "underline" }}>
                    DELETE MY RATING
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ border: "2px dashed #C9C0B0", background: "#F1EADC", padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6357", lineHeight: 1.5, flex: 1, minWidth: 200 }}>{notice}</span>
              {!viewer?.signed_in && (
                <Link to={`/sign-in?return=${encodeURIComponent(location.pathname)}`} style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "10px 18px", boxShadow: "3px 3px 0 #F97B0C" }}>
                  SIGN IN
                </Link>
              )}
            </div>
          )}

          {reviews?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ border: "2px solid #101010", background: "#FFFDF8", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, letterSpacing: 2, color: "#F97B0C", lineHeight: 1 }}>{starGlyphs(r.rating)}</span>
                      <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.02em" }}>{r.author}</span>
                      <span style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.1em", color: "#1F8A5B", border: "1.5px solid #1F8A5B", padding: "2px 6px" }}>✓ VERIFIED BUYER</span>
                      {r.mine && (
                        <span style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.1em", color: "#101010", background: "#F97B0C", border: "1.5px solid #101010", padding: "2px 6px" }}>YOURS</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#6B6357" }}>{r.date}</span>
                  </div>
                  {r.body && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#3A362F" }}>{r.body}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, padding: "22px 18px", border: "2px dashed #101010", background: "#FFFDF8", fontSize: 14, color: "#6B6357", fontWeight: 500 }}>
              No ratings yet. Buy it and you can be the first.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

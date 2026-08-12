import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";

const VALUES = [
  { num: "01", title: "Small batch", copy: "Short runs, printed to order. We make what we can stand behind, not what a warehouse demands." },
  { num: "02", title: "Made to wear", copy: "Heavyweight cotton, pre-shrunk and enzyme-washed, so the fit you get is the fit you keep." },
  { num: "03", title: "Printed in QC", copy: "1–2 color halftone, screened by hand in Quezon City. Local ink, local hands, local waves." },
  { num: "04", title: "Space & Chill", copy: "A little lore in every drop. The alien crew keeps the whole thing from taking itself too seriously." },
];

const field = { fontFamily: "Archivo, sans-serif", fontSize: 16, fontWeight: 600, padding: "12px 14px", border: "2px solid #F6F1E7", background: "#101010", color: "#F6F1E7" };
const fieldLabel = { fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357" };
const infoCard = { display: "flex", alignItems: "center", gap: 14, border: "2px solid #101010", background: "#FFFDF8", padding: "16px 18px", textDecoration: "none", color: "#101010" };

export default function About() {
  const [sent, setSent] = useState(false);
  const { hash } = useLocation();

  // react-router never scrolls to a hash target, so /about#contact (the FAQ's
  // "CONTACT US" CTA) would otherwise land at the top of the page.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView());
  }, [hash]);

  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />

      {/* Hero */}
      <header style={{ maxWidth: 1200, margin: "0 auto", padding: "124px 32px 60px" }}>
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>ABOUT REEFER</span>
        <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(56px, 12vw, 200px)", margin: "10px 0 0", textTransform: "uppercase", lineHeight: 0.82 }}>
          A dare, not<br />a brand<span style={{ color: "#F97B0C" }}>.</span>
        </h1>
      </header>

      {/* Story split */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 90px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <p style={{ margin: 0, fontSize: "clamp(20px, 2.3vw, 30px)", lineHeight: 1.4, fontWeight: 600 }}>
              Reefer started on TikTok Shop with one black tee and a wave nobody asked for. It sold out in a weekend.
            </p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "#6B6357", fontWeight: 500 }}>
              We're a small crew out of Quezon City printing 1–2 color halftone tees in short runs. No committees deciding what's cool. Just the designs we wanted to wear ourselves, printed properly and sent out the door.
            </p>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "#6B6357", fontWeight: 500 }}>
              This site exists so you can cop straight from us — same drops, same prices, minus the algorithm. Ride the wave, wear Reefer.
            </p>
          </div>
          <div style={{ height: "62vh", minHeight: 360, border: "2px solid #101010", background: "#ECE5D6", boxShadow: "14px 14px 0 #101010", display: "flex", alignItems: "center", justifyContent: "center", color: "#A99F8C", fontWeight: 700, letterSpacing: "0.06em", textAlign: "center", padding: 24 }}>
            Drop a workshop / crew photo
          </div>
        </div>
      </section>

      {/* Manifesto band */}
      <section style={{ background: "#101010", color: "#F6F1E7", padding: "100px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>WHAT WE STAND ON</span>
          <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(40px, 6.5vw, 100px)", lineHeight: 0.9, margin: "14px 0 0", textTransform: "uppercase" }}>
            Cotton with<br /><span style={{ color: "transparent", WebkitTextStroke: "2.5px #F97B0C" }}>conviction.</span>
          </h2>
        </div>
      </section>

      {/* Values */}
      <section style={{ maxWidth: 1300, margin: "0 auto", padding: "80px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
          {VALUES.map((v) => (
            <div key={v.num} className="rf-value" style={{ border: "2px solid #101010", background: "#FFFDF8", padding: "26px 22px", display: "flex", flexDirection: "column", gap: 12, minHeight: 220 }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 40, color: "#F97B0C", lineHeight: 1 }}>{v.num}</span>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, textTransform: "uppercase", letterSpacing: "0.02em" }}>{v.title}</span>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>{v.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lore easter egg */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px 90px" }}>
        <div style={{ border: "2px dashed #101010", background: "#ECE5D6", padding: 34, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
          <img src="/reefer-logo.jpg" alt="" style={{ width: 66, height: 66, borderRadius: 14, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 240 }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, textTransform: "uppercase" }}>Space &amp; Chill</span>
            <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>
              There's a crew of aliens who came for the waves and stayed for the merch. You'll spot them hiding around the drops. That's all we'll say for now.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 90px", scrollMarginTop: 90 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 22, borderBottom: "2px solid #101010", paddingBottom: 12 }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, background: "#F97B0C", color: "#101010", padding: "5px 11px", letterSpacing: "0.04em" }}>✦</span>
          <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(32px, 5vw, 64px)", margin: 0, textTransform: "uppercase", lineHeight: 1 }}>
            Get in touch<span style={{ color: "#F97B0C" }}>.</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ margin: "0 0 4px", fontSize: 15, lineHeight: 1.7, color: "#6B6357", fontWeight: 500 }}>
              Order questions, drop tips, or just want to send a fit check — the crew reads everything. Fastest replies are on Instagram.
            </p>
            <a href="mailto:hello@reefer.mnl" className="rf-infocard" style={infoCard}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, color: "#F97B0C" }}>✉</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={fieldLabel}>EMAIL</span><span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, color: "#101010" }}>hello@reefer.mnl</span></span>
            </a>
            <a href="#" className="rf-infocard" style={infoCard}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, color: "#F97B0C" }}>◎</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={fieldLabel}>INSTAGRAM · TIKTOK</span><span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, color: "#101010" }}>@reefer.mnl</span></span>
            </a>
            <div style={{ ...infoCard, cursor: "default" }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, color: "#F97B0C" }}>⚑</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={fieldLabel}>STUDIO</span><span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, color: "#101010" }}>Quezon City, Metro Manila</span><span style={{ fontSize: 12, color: "#6B6357", fontWeight: 500 }}>Ships nationwide · pickup by appointment</span></span>
            </div>
          </div>
          <div style={{ border: "2px solid #101010", background: "#101010", color: "#F6F1E7", padding: 26, boxShadow: "8px 8px 0 #F97B0C" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, textTransform: "uppercase", letterSpacing: "0.02em" }}>Drop us a line</span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={fieldLabel}>NAME</span>
                <input type="text" required placeholder="Juan dela Cruz" style={field} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={fieldLabel}>EMAIL</span>
                <input type="email" required placeholder="you@email.com" style={field} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={fieldLabel}>MESSAGE</span>
                <textarea required rows={4} placeholder="What's up?" style={{ ...field, resize: "vertical" }} />
              </label>
              <button type="submit" className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.08em", background: "#F97B0C", color: "#101010", border: "2px solid #F97B0C", padding: 15, cursor: "pointer", boxShadow: "5px 5px 0 #F6F1E7" }}>
                {sent ? "SENT ✓" : "SEND IT"}
              </button>
              {sent && <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#F97B0C" }}>Message sent — the crew will hit you back soon. (Demo only.)</span>}
            </form>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ background: "#F97B0C", color: "#101010", padding: "100px 32px", textAlign: "center", borderTop: "2px solid #101010" }}>
        <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(38px, 6.5vw, 96px)", margin: "0 0 26px", textTransform: "uppercase", lineHeight: 0.9 }}>
          Enough reading.<br />Go catch one<span style={{ color: "#F6F1E7" }}>.</span>
        </h2>
        <Link to="/products" style={{ fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "18px 34px", boxShadow: "7px 7px 0 #F6F1E7", display: "inline-block" }}>
          SHOP TIDAL SZN 03 →
        </Link>
      </section>

      <Footer />
    </div>
  );
}

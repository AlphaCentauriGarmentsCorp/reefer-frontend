import { Link } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";

const LOOKS = [
  { id: "undertow", num: "01", title: "Undertow, Cubao rooftop", priceFmt: "₱1,350", placeholder: "Drop look 01 — Undertow", copy: "The boxy cut catches the wind at golden hour. Back print heavy enough to read from across the deck." },
  { id: "og-wave", num: "02", title: "OG Wave, EDSA underpass", priceFmt: "₱1,200", placeholder: "Drop look 02 — OG Wave", copy: "The one that started it. Cream halftone on near-black, worn the way it was meant to be — on the way somewhere." },
  { id: "high-tide", num: "03", title: "High Tide, parking level 4", priceFmt: "₱1,450", placeholder: "Drop look 03 — High Tide Club", copy: "240gsm and unbothered. The heavyweight drapes like armor and holds a crease like a promise." },
  { id: "salt-asphalt", num: "04", title: "Salt & Asphalt, side street", priceFmt: "₱1,200", placeholder: "Drop look 04 — Salt & Asphalt", copy: "For beach kids stuck in the city. Concrete underfoot, salt still in your hair." },
];

const imgBox = (extra) => ({ height: "66vh", minHeight: 360, border: "2px solid #101010", background: "#ECE5D6", boxShadow: "12px 12px 0 #101010", display: "flex", alignItems: "center", justifyContent: "center", color: "#A99F8C", fontWeight: 700, letterSpacing: "0.06em", textAlign: "center", padding: 24, ...extra });

export default function Lookbook() {
  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />

      {/* Hero */}
      <header style={{ maxWidth: 1600, margin: "0 auto", padding: "104px 32px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 26 }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>LOOKBOOK — TIDAL SZN 03</span>
            <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(56px, 11vw, 190px)", margin: "8px 0 0", textTransform: "uppercase", lineHeight: 0.84 }}>
              Shot on<br />concrete<span style={{ color: "#F97B0C" }}>.</span>
            </h1>
          </div>
          <p style={{ margin: 0, maxWidth: 320, fontSize: 15, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>
            No studios. No sand. Just rooftops, side streets and parking garages around Quezon City — the actual place the wave breaks.
          </p>
        </div>
        <div style={{ width: "100%", height: "78vh", minHeight: 420, border: "2px solid #101010", background: "#ECE5D6", display: "flex", alignItems: "center", justifyContent: "center", color: "#A99F8C", fontWeight: 700, letterSpacing: "0.06em" }}>
          Drop the SZN 03 campaign hero shot
        </div>
      </header>

      {/* Marquee divider */}
      <div style={{ overflow: "hidden", borderTop: "2px solid #101010", borderBottom: "2px solid #101010", background: "#F97B0C", padding: "8px 0", marginTop: 56 }}>
        <div style={{ display: "flex", width: "max-content", animation: "marquee 18s linear infinite", fontFamily: "Anton, sans-serif", fontSize: "clamp(38px, 6vw, 88px)", lineHeight: 1, color: "transparent", WebkitTextStroke: "2px #101010", textTransform: "uppercase" }}>
          <span style={{ whiteSpace: "nowrap", paddingRight: 44 }}>SZN 03 ★ Space &amp; Chill ★ SZN 03 ★ Space &amp; Chill ★&nbsp;</span>
          <span style={{ whiteSpace: "nowrap", paddingRight: 44 }}>SZN 03 ★ Space &amp; Chill ★ SZN 03 ★ Space &amp; Chill ★&nbsp;</span>
        </div>
      </div>

      {/* Editorial looks */}
      <section style={{ maxWidth: 1600, margin: "0 auto", padding: "76px 32px 40px", display: "flex", flexDirection: "column", gap: 96 }}>
        {LOOKS.map((look, i) => {
          const reversed = i % 2 === 1;
          const image = <div key="img" style={imgBox()}>{look.placeholder}</div>;
          const text = (
            <div key="txt" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: "clamp(60px, 8vw, 120px)", lineHeight: 0.9, color: "transparent", WebkitTextStroke: "2px #101010" }}>{look.num}</span>
              <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(30px, 3.4vw, 52px)", margin: 0, textTransform: "uppercase", lineHeight: 0.95 }}>{look.title}</h2>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: "#6B6357", maxWidth: 440, fontWeight: 500 }}>{look.copy}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, color: "#F97B0C" }}>{look.priceFmt}</span>
                <Link to={`/product/${look.id}`} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.1em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "12px 22px", boxShadow: "5px 5px 0 #F97B0C", display: "inline-block" }}>
                  SHOP THIS LOOK
                </Link>
              </div>
            </div>
          );
          return (
            <div key={look.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
              {reversed ? [text, image] : [image, text]}
            </div>
          );
        })}
      </section>

      {/* Closing CTA */}
      <section style={{ background: "#101010", color: "#F6F1E7", marginTop: 40, padding: "110px 32px", textAlign: "center" }}>
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>THE WHOLE CREW IS WAITING</span>
        <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(40px, 7vw, 104px)", margin: "14px 0 26px", textTransform: "uppercase", lineHeight: 0.9 }}>
          See it. Cop it.<br />Wear it out<span style={{ color: "#F97B0C" }}>.</span>
        </h2>
        <Link to="/products" className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.08em", background: "#F97B0C", color: "#101010", textDecoration: "none", border: "2px solid #F97B0C", padding: "18px 34px", boxShadow: "7px 7px 0 #F6F1E7", display: "inline-block" }}>
          SHOP TIDAL SZN 03 →
        </Link>
      </section>

      <Footer />
    </div>
  );
}

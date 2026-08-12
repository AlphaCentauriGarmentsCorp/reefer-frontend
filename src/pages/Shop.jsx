import { Link } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";

// Underwear, Bags, Socks and Accessories are deliberately absent: the catalogue
// carries no product in any of them, so each tile led to an empty results page.
// Removing the tile is the honest fix — a collection the shop cannot fill should not
// be advertised. Add the entry back the day stock exists for it.
const COLLECTIONS = [
  { title: "All Collections", to: "/products", ph: "Drop an all-collections group shot" },
  { title: "Tees", to: "/products?type=tee", ph: "Drop a tee collection shot" },
  { title: "Hoodies", to: "/products?type=hoodie", ph: "Drop a hoodie collection shot" },
  { title: "Shorts", to: "/products?type=shorts", ph: "Drop a shorts collection shot" },
  { title: "Men", to: "/products?audience=men", ph: "Drop a menswear shot" },
  { title: "Women", to: "/products?audience=women", ph: "Drop a womenswear shot" },
  { title: "New Arrivals", to: "/products?tag=NEW", ph: "Drop a new-arrivals shot" },
  { title: "Best Sellers", to: "/products?tag=" + encodeURIComponent("BEST SELLER"), ph: "Drop a best-sellers shot" },
];

export default function Shop() {
  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />

      {/* Header */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "112px 32px 30px" }}>
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>TIDAL SZN 03</span>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", justifyContent: "space-between", gap: 24, marginTop: 10 }}>
          <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(52px, 8vw, 120px)", margin: 0, textTransform: "uppercase", lineHeight: 0.86 }}>
            The shop<span style={{ color: "#F97B0C" }}>.</span>
          </h1>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
            <p style={{ margin: "0 0 4px", maxWidth: 300, fontSize: 14, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>
              Every piece is printed in small batches in Quezon City.
            </p>
            <Link to="/sizing-guide" className="rf-cta" style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10, minWidth: 172, background: "#101010", color: "#F6F1E7", border: "2px solid #101010", boxShadow: "6px 6px 0 #F97B0C", padding: "12px 16px 13px", textDecoration: "none" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.2em", color: "#F97B0C" }}>FIND YOUR FIT</span>
                <span style={{ fontSize: 15, lineHeight: 1 }}>→</span>
              </span>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: "clamp(22px, 2.2vw, 32px)", lineHeight: 0.84, textTransform: "uppercase" }}>
                Sizing<br />Guide
              </span>
              <span style={{ height: 7, background: "repeating-linear-gradient(90deg, #F6F1E7 0 1.5px, transparent 1.5px 9px)", display: "block" }} />
            </Link>
          </div>
        </div>
      </section>

      {/* Shop by collection */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "8px 32px 100px" }}>
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>SHOP BY COLLECTION</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 14 }}>
          {COLLECTIONS.map((c) => (
            <Link key={c.title} to={c.to} className="rf-collection" style={{ position: "relative", display: "block", aspectRatio: "4 / 3.3", border: "2px solid #101010", overflow: "hidden", textDecoration: "none" }}>
              <div style={{ position: "absolute", inset: 0, background: "#ECE5D6", display: "flex", alignItems: "center", justifyContent: "center", color: "#A99F8C", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textAlign: "center", padding: 20 }}>
                {c.ph}
              </div>
              <div style={{ position: "absolute", inset: 0, background: "rgba(16,16,16,0.4)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", pointerEvents: "none" }}>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: "clamp(18px, 2.4vw, 28px)", textTransform: "uppercase", color: "#F6F1E7", letterSpacing: "0.02em" }}>{c.title}</span>
                <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: "#F6F1E7", textDecoration: "underline", textUnderlineOffset: 3 }}>VIEW PRODUCTS</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

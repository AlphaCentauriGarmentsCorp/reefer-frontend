import { useState } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";

// Underwear, Bags, Socks and Accessories are deliberately absent: the catalogue
// carries no product in any of them, so each tile led to an empty results page.
// Removing the tile is the honest fix — a collection the shop cannot fill should not
// be advertised. Add the entry back the day stock exists for it.
/*
 * `img` is an optional path under public/. Drop a file at that path and the tile
 * shows the photograph; leave it absent and the tile keeps the placeholder copy in
 * `ph`. That is deliberate — a tile with no art must still render at the right size
 * so the grid keeps its rows, and a missing file must never leave a broken-image
 * icon in a shop window.
 *
 * File names are the collection, lowercased: public/collections/tees.jpg and so on.
 * Nothing reads the directory, so adding a file is enough — no rebuild of this list.
 */
const COLLECTIONS = [
  { title: "All Collections", to: "/products", img: "/collections/all.png" },
  { title: "Tees", to: "/products?type=tee", img: "/collections/tees.png" },
  { title: "Hoodies", to: "/products?type=hoodie", img: "/collections/hoodies.jpg" },
  { title: "Shorts", to: "/products?type=shorts", img: "/collections/shorts.jpg" },
  { title: "Men", to: "/products?audience=men", img: "/collections/men.png" },
  { title: "Women", to: "/products?audience=women", img: "/collections/women.png" },
  { title: "New Arrivals", to: "/products?tag=NEW", img: "/collections/new-arrivals.png" },
  { title: "Best Sellers", to: "/products?tag=" + encodeURIComponent("BEST SELLER"), img: "/collections/best-sellers.png" },
];

/*
 * A tile has two looks, and which one it gets cannot be known until the image has
 * tried to load — a path that 404s answers 200 with the SPA's index.html under both
 * Vite and the production .htaccess, so it fails at DECODE rather than at fetch.
 *
 *   photographed  -> photo, dark scrim, cream type (the scrim is what makes the
 *                    type readable over an arbitrary image)
 *   no art yet    -> flat cream tile, ink type, NO scrim
 *
 * The scrim was the bug in the first pass: applied unconditionally it turned the
 * cream placeholder a muddy grey and left two competing text layers.
 */
function CollectionTile({ c }) {
  const [shot, setShot] = useState(Boolean(c.img));

  return (
    <Link
      to={c.to}
      className="rf-collection"
      style={{ position: "relative", display: "block", aspectRatio: "4 / 3.3", border: "2px solid #101010", overflow: "hidden", textDecoration: "none", background: "#ECE5D6" }}
    >
      {c.img && (
        <img
          src={c.img}
          alt=""
          loading="lazy"
          onLoad={() => setShot(true)}
          onError={() => setShot(false)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: shot ? "block" : "none" }}
        />
      )}

      {shot && <div style={{ position: "absolute", inset: 0, background: "rgba(16,16,16,0.4)", pointerEvents: "none" }} />}

      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center", pointerEvents: "none" }}>
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: "clamp(18px, 2.4vw, 28px)", textTransform: "uppercase", color: shot ? "#F6F1E7" : "#101010", letterSpacing: "0.02em" }}>
          {c.title}
        </span>
        <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: shot ? "#F6F1E7" : "#6B6357", textDecoration: "underline", textUnderlineOffset: 3 }}>
          VIEW PRODUCTS
        </span>
      </div>
    </Link>
  );
}

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
        {/* Columns and gap live in .rf-collection-grid (index.css) so a media
            query can drop this to 2-up on phones — an inline value could not be
            overridden. Three across a 320px screen left ~70px per tile. */}
        <div className="rf-collection-grid" style={{ marginTop: 14 }}>
          {COLLECTIONS.map((c) => (
            <CollectionTile key={c.title} c={c} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { Link, useLocation } from "react-router-dom";
import logo from "/reefer-logo.jpg";

const iconBox = {
  width: 42,
  height: 42,
  border: "2px solid #F6F1E7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#F6F1E7",
  textDecoration: "none",
};

const linkStyle = { color: "#F6F1E7", textDecoration: "none" };

// The mockup ships three footers: the home one (THE DROP / socials), the page one
// (real page nav, logo links home) and a reduced one that swaps the nav for a
// single line of copy. Routes pick their variant; a page may override by prop.
const pageLinks = [
  { label: "SHOP", to: "/shop" },
  { label: "LOOKBOOK", to: "/lookbook" },
  { label: "ABOUT", to: "/about" },
];
const notes = {
  "/sizing-guide": "STILL UNSURE? DM @REEFER.MNL WITH YOUR HEIGHT + WEIGHT.",
  "/cart": "© 2026 REEFER MNL — RIDE THE WAVE",
};

function variantFor(pathname) {
  if (pathname === "/") return "home";
  if (pathname in notes || pathname.startsWith("/product/")) return "note";
  return "pages";
}

export default function Footer({ variant }) {
  const { pathname } = useLocation();
  const kind = variant || variantFor(pathname);
  const note = notes[pathname] || "SMALL BATCH · PRINTED IN QC · RIDE THE WAVE";
  // FAQ's own footer carries a fourth link back to itself.
  const navLinks = pathname === "/faq" ? [...pageLinks, { label: "FAQ", to: "/faq" }] : pageLinks;

  const wordmark = (
    <>
      <img src={logo} alt="Reefer" style={{ width: 40, height: 40, borderRadius: 8 }} />
      <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.06em" }}>REEFER</span>
    </>
  );

  return (
    <footer style={{ background: "#101010", color: "#F6F1E7", padding: kind === "home" ? "56px 32px 40px" : "48px 32px 40px" }}>
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto 26px",
          paddingBottom: 24,
          borderBottom: "1px solid #2A2724",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Follow Us
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="#" aria-label="Facebook" className="rf-social" style={iconBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 21v-8h2.69l.4-3.12H13.5V7.9c0-.9.25-1.52 1.54-1.52h1.65V3.59c-.29-.04-1.27-.13-2.41-.13-2.39 0-4.02 1.46-4.02 4.13v2.3H7.56V13h2.7v8h3.24z" />
            </svg>
          </a>
          <a href="#" aria-label="Instagram" className="rf-social" style={iconBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a href="#" aria-label="TikTok" className="rf-social" style={iconBox}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 3c.3 2.06 1.6 3.6 3.5 3.86v2.4c-1.27.06-2.45-.32-3.5-1.03v5.94c0 3.2-2.34 5.33-5.1 5.33-2.5 0-4.4-1.86-4.4-4.3 0-2.6 2.1-4.45 4.9-4.16v2.5c-.35-.1-.72-.13-1.1-.06-1.03.2-1.7 1.02-1.55 2.06.14.98 1.03 1.6 2.06 1.5 1.1-.1 1.79-.98 1.79-2.2V3h2.9z" />
            </svg>
          </a>
        </div>
      </div>

      {kind === "note" ? (
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, ...linkStyle }}>
            {wordmark}
          </Link>
          <span style={{ fontSize: 11, letterSpacing: "0.14em", color: "#6B6560", fontWeight: 700 }}>{note}</span>
        </div>
      ) : (
        <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            {kind === "home" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{wordmark}</div>
            ) : (
              <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, ...linkStyle }}>
                {wordmark}
              </Link>
            )}
            <div style={{ display: "flex", gap: 32, fontWeight: 700, fontSize: 11, letterSpacing: "0.18em" }}>
              {kind === "home" ? (
                <>
                  <Link to="/#drop" className="rf-footlink" style={linkStyle}>THE DROP</Link>
                  <a href="#" className="rf-footlink" style={linkStyle}>INSTAGRAM</a>
                  <a href="#" className="rf-footlink" style={linkStyle}>TIKTOK</a>
                </>
              ) : (
                navLinks.map((l) => (
                  <Link key={l.label} to={l.to} className="rf-footlink" style={linkStyle}>
                    {l.label}
                  </Link>
                ))
              )}
            </div>
          </div>
          <div
            className="rf-line"
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#6B6560",
              borderTop: "1px solid #2A2724",
              paddingTop: 18,
              fontWeight: 700,
            }}
          >
            <span>© 2026 REEFER MNL</span>
            <span>14.5995° N, 120.9842° E</span>
            <span>RIDE THE WAVE</span>
          </div>
        </div>
      )}
    </footer>
  );
}

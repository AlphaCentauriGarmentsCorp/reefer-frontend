import { useState } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";

const svgOverlay = { position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" };

const FITS = [
  {
    num: "01",
    name: "Regular Fit Tee",
    sub: "CLASSIC STRAIGHT CUT",
    art: { src: "/sizing/regular-garment.png", alt: "Regular fit tee flat", width: 300, ratio: "585 / 862" },
    pad: "11px 14px",
    headLs: "0.06em",
    minWidth: 300,
    cols: ["Size", "Length", "Width"],
    rows: [
      { size: "S", len: 28, cells: ['28"', '20"'] },
      { size: "M", len: 29, cells: ['29"', '22"'] },
      { size: "L", len: 30, cells: ['30"', '24"'] },
      { size: "XL", len: 30.5, cells: ['30.5"', '26"'] },
      { size: "XXL", len: 31, cells: ['31"', '28"'] },
    ],
    overlay: (
      <svg viewBox="0 0 585 862" preserveAspectRatio="xMidYMid meet" style={svgOverlay} aria-hidden="true">
        <defs>
          <marker id="regArrow" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" refX="17" refY="11" orient="auto-start-reverse">
            <path d="M3,3 L19,11 L3,19 Z" fill="#F97B0C" />
          </marker>
        </defs>
        <line x1="140" y1="446" x2="446" y2="446" stroke="#F97B0C" strokeWidth="5" markerStart="url(#regArrow)" markerEnd="url(#regArrow)" />
        <line x1="204" y1="192" x2="204" y2="686" stroke="#F97B0C" strokeWidth="5" markerStart="url(#regArrow)" markerEnd="url(#regArrow)" />
        <g paintOrder="stroke" stroke="#FFFFFF" strokeWidth="7" strokeLinejoin="round" fontFamily="Archivo, sans-serif" fontSize="27" fontWeight="700" letterSpacing="2" fill="#101010">
          <text x="166" y="548" textAnchor="middle" transform="rotate(-90 166 548)">LENGTH</text>
          <text x="356" y="424" textAnchor="middle">WIDTH</text>
        </g>
      </svg>
    ),
  },
  {
    num: "02",
    name: "Box Fit Tee",
    sub: "WIDE, CROPPED DROP",
    art: { src: "/sizing/box-filled.png", alt: "Box fit tee flat", width: 480, ratio: "1024 / 762" },
    pad: "11px 12px",
    headLs: "0.04em",
    minWidth: 420,
    cols: ["Size", "Length", "Width", "Shoulder", "Sleeve"],
    rows: [
      { size: "S", len: 26.5, cells: ['26.5"', '21"', '7.5"', '9"'] },
      { size: "M", len: 27.5, cells: ['27.5"', '23"', '8.5"', '9.5"'] },
      { size: "L", len: 28.5, cells: ['28.5"', '25"', '9.5"', '10"'] },
      { size: "XL", len: 29.5, cells: ['29.5"', '27"', '10.5"', '10.5"'] },
    ],
    overlay: (
      <svg viewBox="0 0 1024 762" preserveAspectRatio="xMidYMid meet" style={svgOverlay} aria-hidden="true">
        <defs>
          <marker id="boxArrow" markerUnits="userSpaceOnUse" markerWidth="28" markerHeight="28" refX="21" refY="14" orient="auto-start-reverse">
            <path d="M4,4 L24,14 L4,24 Z" fill="#F97B0C" />
          </marker>
        </defs>
        <line x1="400" y1="140" x2="400" y2="748" stroke="#F97B0C" strokeWidth="5" markerStart="url(#boxArrow)" markerEnd="url(#boxArrow)" />
        <line x1="228" y1="448" x2="740" y2="448" stroke="#F97B0C" strokeWidth="5" markerStart="url(#boxArrow)" markerEnd="url(#boxArrow)" />
        <line x1="568" y1="106" x2="748" y2="169" stroke="#F97B0C" strokeWidth="5" markerStart="url(#boxArrow)" markerEnd="url(#boxArrow)" />
        <line x1="756" y1="176" x2="906" y2="258" stroke="#F97B0C" strokeWidth="5" markerStart="url(#boxArrow)" markerEnd="url(#boxArrow)" />
        <g fontFamily="Archivo, sans-serif" fontWeight="700" letterSpacing="2" fill="#101010" paintOrder="stroke" stroke="#ECE5D6" strokeWidth="8" strokeLinejoin="round">
          <text x="422" y="300" fontSize="30">LENGTH</text>
          <text x="545" y="436" textAnchor="middle" fontSize="30">WIDTH</text>
          <text x="646" y="58" textAnchor="middle" fontSize="26">SHOULDER</text>
          <text x="646" y="86" textAnchor="middle" fontSize="26">LENGTH</text>
          <text x="920" y="150" textAnchor="middle" fontSize="26">SLEEVE</text>
          <text x="920" y="178" textAnchor="middle" fontSize="26">LENGTH</text>
        </g>
      </svg>
    ),
  },
  {
    num: "03",
    name: "Oversized Tee",
    sub: "HEAVYWEIGHT",
    art: { src: "/sizing/oversized-photo.png", alt: "Oversized tee flat", width: 440, ratio: "1024 / 809" },
    pad: "11px 14px",
    headLs: "0.06em",
    minWidth: 300,
    cols: ["Size", "Length", "Width"],
    rows: [
      { size: "S", len: 28, cells: ['28"', '20"'] },
      { size: "M", len: 29.5, cells: ['29.5"', '22"'] },
      { size: "L", len: 31, cells: ['31"', '24"'] },
      { size: "XL", len: 32.5, cells: ['32.5"', '26"'] },
    ],
    overlay: (
      <svg viewBox="0 0 1024 809" preserveAspectRatio="xMidYMid meet" style={svgOverlay} aria-hidden="true">
        <defs>
          <marker id="ovrArrow" markerUnits="userSpaceOnUse" markerWidth="26" markerHeight="26" refX="19" refY="13" orient="auto-start-reverse">
            <path d="M4,4 L22,13 L4,22 Z" fill="#F97B0C" />
          </marker>
        </defs>
        <line x1="266" y1="472" x2="780" y2="472" stroke="#F97B0C" strokeWidth="5" markerStart="url(#ovrArrow)" markerEnd="url(#ovrArrow)" />
        <line x1="360" y1="150" x2="360" y2="712" stroke="#F97B0C" strokeWidth="5" markerStart="url(#ovrArrow)" markerEnd="url(#ovrArrow)" />
        <g paintOrder="stroke" stroke="#101010" strokeWidth="7" strokeLinejoin="round" fontFamily="Archivo, sans-serif" fontSize="30" fontWeight="700" letterSpacing="2" fill="#F6F1E7">
          <text x="330" y="450" textAnchor="middle" transform="rotate(-90 330 450)">LENGTH</text>
          <text x="510" y="452" textAnchor="middle">WIDTH</text>
        </g>
      </svg>
    ),
  },
  {
    num: "04",
    name: "Sweat Pants",
    sub: "RELAXED TAPER",
    art: { src: "/sizing/pants-garment.png", alt: "Sweat pants flat", width: 380, ratio: "979 / 1024" },
    pad: "11px 14px",
    headLs: "0.06em",
    minWidth: 340,
    cols: ["Size", "Length", "Width", "Leg Hole"],
    rows: [
      { size: "S", len: 38, cells: ['38"', '24–30"', '7.5"'] },
      { size: "M", len: 39.5, cells: ['39.5"', '26–32"', '8"'] },
      { size: "L", len: 40, cells: ['40"', '28–34"', '8.5"'] },
      { size: "XL", len: 41, cells: ['41"', '30–36"', '9"'] },
    ],
    overlay: (
      <svg viewBox="0 0 979 1024" preserveAspectRatio="xMidYMid meet" style={svgOverlay} aria-hidden="true">
        <defs>
          <marker id="pantsArrow" markerUnits="userSpaceOnUse" markerWidth="26" markerHeight="26" refX="19" refY="13" orient="auto-start-reverse">
            <path d="M4,4 L22,13 L4,22 Z" fill="#F97B0C" />
          </marker>
        </defs>
        <line x1="388" y1="72" x2="637" y2="72" stroke="#F97B0C" strokeWidth="5" markerStart="url(#pantsArrow)" markerEnd="url(#pantsArrow)" />
        <line x1="300" y1="118" x2="150" y2="958" stroke="#F97B0C" strokeWidth="5" markerStart="url(#pantsArrow)" markerEnd="url(#pantsArrow)" />
        <g paintOrder="stroke" stroke="#FFFFFF" strokeWidth="8" strokeLinejoin="round" fontFamily="Archivo, sans-serif" fontSize="34" fontWeight="700" letterSpacing="2" fill="#101010">
          <text x="512" y="46" textAnchor="middle">WIDTH</text>
          <text x="170" y="180" textAnchor="middle">LENGTH</text>
        </g>
      </svg>
    ),
  },
];

const badgeStyle = { position: "absolute", top: 8, left: 8, zIndex: 6, fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.06em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: "4px 10px", pointerEvents: "none" };

function FitTile({ f }) {
  const [compare, setCompare] = useState(false);
  const [picks, setPicks] = useState([]);
  const [hover, setHover] = useState(null);
  const [focus, setFocus] = useState(0);

  const maxLen = Math.max(...f.rows.map((r) => r.len));
  const staged = picks.length === 2;
  // Only one row drives the diagram at a time: the hovered row browsing, or the
  // first pick once compare mode is on.
  const active = compare ? (picks.length === 1 ? picks[0] : null) : hover != null ? f.rows[hover] : null;
  const scale = active ? active.len / maxLen : 1;

  const status = !compare
    ? ""
    : staged
    ? "TAP A SIZE TO VIEW · CLICK IMAGE TO RESET ✕"
    : picks.length === 1
    ? "NOW SELECT A SIZE TO COMPARE ↓"
    : "SELECT A SIZE ↓";

  const toggleCompare = () => {
    setCompare((c) => !c);
    setPicks([]);
    setHover(null);
    setFocus(0);
  };

  const pick = (row) => {
    setPicks((p) => (p.length >= 2 ? [row] : [...p, row]));
    setFocus(0);
  };

  const th = { padding: f.pad, fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 13, letterSpacing: f.headLs, textTransform: "uppercase", textAlign: "center", background: "#101010", color: "#F6F1E7" };

  return (
    <div style={{ border: "2px solid #101010", background: "#FFFDF8", padding: 30, boxShadow: "8px 8px 0 #101010" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: 12, background: "#F97B0C", color: "#101010", padding: "5px 10px", letterSpacing: "0.06em" }}>{f.num}</span>
        <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(26px, 3vw, 40px)", margin: 0, textTransform: "uppercase", lineHeight: 1 }}>{f.name}</h2>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: "#6B6357" }}>{f.sub}</span>
        <button
          onClick={toggleCompare}
          style={{ marginLeft: "auto", alignSelf: "center", fontFamily: "Anton, sans-serif", fontSize: 12, letterSpacing: "0.08em", background: compare ? "#F97B0C" : "#101010", color: compare ? "#101010" : "#F6F1E7", border: "2px solid #101010", padding: "8px 14px", cursor: "pointer", boxShadow: "3px 3px 0 #F97B0C" }}
        >
          {compare ? "CANCEL" : "COMPARE SIZE"}
        </button>
        {compare && (
          <span style={{ width: "100%", fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#F97B0C", marginTop: 2 }}>{status}</span>
        )}
      </div>

      <div className="rf-2col" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "center" }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          {active && <div style={badgeStyle}>SIZE {active.size}</div>}

          {staged ? (
            <div
              onClick={() => setPicks([])}
              style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center", width: f.art.width, maxWidth: "100%", aspectRatio: f.art.ratio, margin: "44px auto 0", cursor: "pointer" }}
            >
              {picks.map((p, i) => {
                const r = (p.len / maxLen) * 100;
                return (
                  <div key={i} style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: `${r.toFixed(2)}%`, height: `${r.toFixed(2)}%`, border: "2px solid #101010", background: "#fff", transition: "opacity 0.2s", opacity: i === focus ? 1 : 0.25, zIndex: i === focus ? 2 : 1 }}>
                    <img src={f.art.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  </div>
                );
              })}
              <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 4 }}>
                {picks.map((p, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocus(i);
                    }}
                    style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.06em", color: "#101010", border: "2px solid #101010", padding: "4px 12px", cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1.1, background: i === focus ? "#F97B0C" : "#F6F1E7", opacity: i === focus ? 1 : 0.65 }}
                  >
                    SIZE {p.size}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", width: f.art.width, maxWidth: "100%", aspectRatio: f.art.ratio, background: "#FFFFFF", border: "2px solid #101010", transformOrigin: "center bottom", transition: "transform 0.3s cubic-bezier(.2,.7,.2,1)", transform: `scale(${scale.toFixed(3)})` }}>
              <img src={f.art.src} decoding="async" alt={f.art.alt} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              {f.overlay}
            </div>
          )}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: f.minWidth, border: "2px solid #101010" }}>
            <thead>
              <tr>
                {f.cols.map((c, i) => (
                  <th key={c} style={{ ...th, borderRight: i < f.cols.length - 1 ? "1px solid #2A2724" : "none" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {f.rows.map((r, ri) => {
                const picked = picks.some((p) => p.size === r.size);
                const cells = [r.size, ...r.cells];
                return (
                  <tr
                    key={r.size}
                    onMouseEnter={() => setHover(ri)}
                    onMouseLeave={() => setHover((h) => (h === ri ? null : h))}
                    onClick={compare ? () => pick(r) : undefined}
                    style={{ cursor: compare ? "pointer" : "default", background: picked ? "#FBE0C4" : hover === ri ? "#F7EFE0" : "transparent" }}
                  >
                    {cells.map((cell, ci) => (
                      <td
                        key={ci}
                        style={{
                          padding: f.pad,
                          textAlign: "center",
                          fontFamily: ci === 0 ? "Anton, sans-serif" : "Archivo, sans-serif",
                          fontSize: ci === 0 ? 17 : 15,
                          fontWeight: ci === 0 ? 400 : 600,
                          color: "#101010",
                          borderBottom: "1px solid #E0D8C8",
                          borderRight: ci < cells.length - 1 ? "1px solid #E0D8C8" : "none",
                          background: ci === 0 ? "#F1EADC" : "transparent",
                        }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SizingGuide() {
  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "112px 32px 20px" }}>
        <Link to="/shop" className="rf-navlink" style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.18em", color: "#6B6357", textDecoration: "none" }}>
          ← BACK TO SHOP
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginTop: 14 }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>FIT GUIDE</span>
            <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(48px, 7vw, 104px)", margin: "6px 0 0", textTransform: "uppercase", lineHeight: 0.86 }}>
              Sizing guide<span style={{ color: "#F97B0C" }}>.</span>
            </h1>
          </div>
          <p style={{ margin: "0 0 4px", maxWidth: 360, fontSize: 14, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>
            All measurements are in inches, taken with the garment laid flat. Between sizes? Size up for a boxier drape.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          {["INCHES", "MEASURED FLAT", '±½"–1" VARIANCE'].map((c) => (
            <span key={c} style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.16em", color: "#101010", border: "2px solid #101010", padding: "7px 12px" }}>{c}</span>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 32px 60px", display: "flex", flexDirection: "column", gap: 26 }}>
        {FITS.map((f) => (
          <FitTile key={f.num} f={f} />
        ))}
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: "#6B6357", fontWeight: 500, maxWidth: 720 }}>
          Depending on the fabric's properties there may be an error of approximately ½"–1" (+/-). Measurements may have minor variations between production runs. Every garment is measured on a flat surface.
        </p>
      </section>

      <Footer />
    </div>
  );
}

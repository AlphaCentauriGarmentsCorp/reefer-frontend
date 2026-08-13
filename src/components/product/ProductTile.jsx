import { useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../hooks/useAuth";
import SignInPrompt from "../SignInPrompt";

// The tilt tracks the cursor, so it stays inert on touch and reduced-motion —
// the same gate the mockup's pointer-effects loop uses.
const FINE =
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The product card used on the homepage drop grid and the All Products grid —
 * ported from the mockup. `corner` is the top-right badge text (a running number
 * on the home page, the product type on All Products).
 */
export default function ProductTile({ item, corner }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { add, authLoading } = useCart();
  const { user } = useAuth();
  const cardRef = useRef(null);
  const [picking, setPicking] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);
  const [gate, setGate] = useState(false);

  const sizes = item.sizes || [];
  const open = () => navigate(`/product/${item.slug}`);
  const stop = (e) => e.stopPropagation();

  const addSize = async (size) => {
    setAdding(true);
    setError(null);
    try {
      await add(item.slug, size, 1); // POST /v1/cart/items, or localStorage while signed out
      setPicking(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } catch (err) {
      if (err.status === 401) {
        navigate(`/sign-in?return=${encodeURIComponent(location.pathname)}`);
        return;
      }
      setError(err.message || "Could not add that."); // e.g. "Only 2 left in that size."
    } finally {
      setAdding(false);
    }
  };

  // A cart line is a product AND a size: one-size items go straight in, anything
  // with a range asks first, and a card with no size list at all defers to the PDP.
  //
  // No sign-in gate here any more — a signed-out cart is real, held in localStorage
  // and merged into the account at sign-in.
  const quickAdd = () => {
    setError(null);
    // A stored token is still being verified. Adding now could file a signed-in
    // shopper's pick in the guest cart, where only their next sign-in would find it.
    if (authLoading) return;
    // Signed out: ask before the size picker even opens, so the question arrives
    // before any work is asked of them rather than after they have chosen a size.
    if (!user) {
      setGate(true);
      return;
    }
    if (sizes.length > 1) {
      setPicking(true);
      return;
    }
    if (!sizes.length) {
      open();
      return;
    }
    addSize(sizes[0]);
  };

  const tilt = (e) => {
    const el = cardRef.current;
    if (!FINE || !el) return;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - (r.top + r.height / 2)) / r.height) * -10;
    const ry = ((e.clientX - (r.left + r.width / 2)) / r.width) * 10;
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
  };
  const untilt = () => {
    if (cardRef.current) cardRef.current.style.transform = "";
  };

  return (
    <div
      ref={cardRef}
      className="rf-dropcard"
      onClick={open}
      onMouseMove={tilt}
      onMouseLeave={untilt}
      style={{
        border: "2px solid #101010",
        background: "#FFFDF8",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        willChange: "transform",
        // keeps .rf-dropcard's box-shadow hover while smoothing the tilt
        transition: "transform 0.12s ease-out, box-shadow 0.25s",
      }}
    >
      {/* White behind a real shot, cream behind the placeholder: the product photos are
          cut out on white, so any letterboxing has to disappear into them rather than
          frame them in a colour they were never shot against. */}
      <div style={{ position: "relative", background: item.image ? "#FFFFFF" : "#ECE5D6", borderBottom: "2px solid #101010" }}>
        {/* A real shot when the product has one, the mockup's placeholder copy when it
            does not — most of the catalogue is still unphotographed. Same box either
            way so a mixed grid keeps its rows aligned.

            `contain`, not `cover`: the catalogue is shot square and this slot used to be
            4:5, so cover was cutting ~28% off the width — which on a t-shirt means both
            sleeves. Fitting the whole garment matters more than filling the corners. */}
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "contain", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#A99F8C",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textAlign: "center",
              padding: 24,
            }}
          >
            {item.placeholder}
          </div>
        )}
        <span style={{ position: "absolute", top: 12, left: 12, background: "#F97B0C", color: "#101010", fontWeight: 900, fontSize: 10, letterSpacing: "0.16em", padding: "6px 10px", border: "2px solid #101010", pointerEvents: "none" }}>
          {item.tag}
        </span>
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <FavoriteButton slug={item.slug} variant="icon" />
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 14, color: "#101010", background: "#F6F1E7", border: "2px solid #101010", padding: "4px 9px", pointerEvents: "none" }}>
            {corner}
          </span>
        </div>
      </div>
      {/* Padding and type sizes live in index.css (.rf-dropcard-*) rather than
          inline, so the phone rule can shrink them. Two cards across a 320px
          screen leaves each about 140px wide, where a 23px name and 20px of
          padding overflow. Inline values would win over the media query. */}
      <div className="rf-dropcard-body" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <span className="rf-dropcard-name" style={{ fontFamily: "Anton, sans-serif", textTransform: "uppercase", letterSpacing: "0.02em" }}>{item.name}</span>
          <span className="rf-dropcard-price" style={{ fontWeight: 900, color: "#F97B0C", whiteSpace: "nowrap" }}>{item.priceFmt}</span>
        </div>
        <p className="rf-dropcard-blurb" style={{ margin: 0, lineHeight: 1.55, color: "#6B6357" }}>{item.blurb}</p>

        {picking ? (
          <div onClick={stop} style={{ display: "flex", flexDirection: "column", gap: 12, border: "2px solid #101010", background: "#F6F1E7", padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.04em" }}>PICK A SIZE</span>
              <button
                onClick={() => setPicking(false)}
                aria-label="Close"
                style={{ background: "none", border: "2px solid #101010", width: 28, height: 28, fontSize: 13, fontWeight: 900, cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => addSize(s)}
                  disabled={adding}
                  aria-label={`Add size ${s} to cart`}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    fontFamily: "Anton, sans-serif",
                    fontSize: 16,
                    minWidth: 52,
                    padding: "10px 12px",
                    border: "2px solid #101010",
                    background: hovered === s ? "#101010" : "#FFFDF8",
                    color: hovered === s ? "#F6F1E7" : "#101010",
                    cursor: "pointer",
                    opacity: adding ? 0.6 : 1,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {error && <span style={{ fontSize: 12, fontWeight: 800, color: "#C0392B" }}>{error}</span>}
            <Link to="/sizing-guide" onClick={stop} style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#6B6357", textDecoration: "underline" }}>
              NOT SURE? SEE THE SIZING GUIDE
            </Link>
          </div>
        ) : (
          <>
            <button
              className="rf-addbtn"
              onClick={(e) => {
                stop(e);
                quickAdd();
              }}
              disabled={adding || authLoading}
              style={{
                fontFamily: "Anton, sans-serif",
                fontSize: 16,
                letterSpacing: "0.1em",
                background: added ? "#F97B0C" : "#101010",
                color: added ? "#101010" : "#F6F1E7",
                border: "2px solid #101010",
                padding: "14px 20px",
                cursor: "pointer",
              }}
            >
              {added ? "ADDED TO CART ✓" : adding ? "ADDING…" : `ADD TO CART — ${item.priceFmt}`}
            </button>
            {error && <span style={{ fontSize: 12, fontWeight: 800, color: "#C0392B" }}>{error}</span>}
          </>
        )}
      </div>

      {/* The whole card is clickable, so this must stop propagation or dismissing the
          dialog would fall through and open the product. */}
      <div onClick={stop}>
        <SignInPrompt
          open={gate}
          onClose={() => setGate(false)}
          action="add to your cart"
          reason="Your cart is saved to your account."
        />
      </div>
    </div>
  );
}

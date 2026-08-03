import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "/reefer-logo.jpg";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";

const FREE_SHIP = 2500;
const peso = (n) => "₱" + Number(n || 0).toLocaleString();

// The mockup pulls this from auth-gate.js copyFor('cart'). Reworded once the cart
// stopped needing an account: this is now an offer to restore a saved cart, not a
// wall in front of an empty one.
const GATE = {
  title: "PICK UP WHERE YOU LEFT OFF",
  message: "Nothing in this cart on this device. Saved items to your account? Sign in to bring them back — or just start shopping, no account needed.",
  reason: "Sign in to bring back your saved cart.",
};
const gateHref = (create) =>
  `/sign-in?return=/cart&reason=${encodeURIComponent(GATE.reason)}${create ? "&mode=create" : ""}`;

/**
 * The mockup expresses these as style-hover / style-active attributes. index.css
 * carries only the hovers shared across pages, so the cart's own live in state.
 */
function Hover({ tag = "button", style, hover, active, children, ...rest }) {
  const [phase, setPhase] = useState("idle");
  // Capitalised into a local so JSX reads it as a component and not a literal
  // <tag> element. (Destructuring straight to `tag: Tag` reads as an unused
  // parameter here — there is no eslint-plugin-react to see the JSX usage.)
  const Tag = tag;
  return (
    <Tag
      {...rest}
      onMouseEnter={() => setPhase("hover")}
      onMouseLeave={() => setPhase("idle")}
      onMouseDown={() => active && setPhase("active")}
      onMouseUp={() => active && setPhase("hover")}
      onFocus={() => setPhase("hover")}
      onBlur={() => setPhase("idle")}
      style={{ ...style, ...(phase === "idle" ? null : hover), ...(phase === "active" ? active : null) }}
    >
      {children}
    </Tag>
  );
}

export default function Cart() {
  const {
    items,
    count,
    selected_count: selectedCount = 0,
    selected_subtotal: selectedSubtotal = 0,
    selected_subtotal_formatted: selectedSubtotalFmt,
    all_selected: allSelected,
    updateQty,
    remove,
    selectItem,
    selectAll,
    loading,
    authed,
    error,
  } = useCart();
  const { loading: authLoading } = useAuth();

  // The context records the server's message for the banner; the rethrow is only
  // there for callers mid-flow, so swallow it rather than leave it unhandled.
  const quiet = (p) => p.catch(() => {});
  // qty 0 is how the API removes a line, which is what "−" on the last one means.
  const changeQty = (id, next) => quiet(updateQty(id, Math.max(0, next)));

  // The summary totals only the TICKED lines — that's what checkout will charge.
  // The free-shipping bar follows the same number, or it would promise free
  // shipping on a threshold the order never reaches.
  const freeShip = selectedSubtotal >= FREE_SHIP;
  const remaining = Math.max(0, FREE_SHIP - selectedSubtotal);
  const shipProgress = Math.min(100, Math.round((selectedSubtotal / FREE_SHIP) * 100)) + "%";
  const nothingSelected = selectedCount === 0 && count > 0;

  const shell = (children) => (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />
      <section className="rf-section" style={{ maxWidth: 1240, margin: "0 auto", padding: "112px 32px 100px" }}>
        {children}
      </section>
      <Footer />
    </div>
  );

  // Rendered on every state of the page, empty or not — same as the mockup.
  const header = (
    <div style={{ marginBottom: 20 }}>
      <Hover
        tag={Link}
        to="/products"
        style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.18em", color: "#6B6357", textDecoration: "none" }}
        hover={{ color: "#F97B0C" }}
      >
        ← CONTINUE SHOPPING
      </Hover>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(44px, 7vw, 96px)", margin: 0, textTransform: "uppercase", lineHeight: 0.86 }}>
          Your cart<span style={{ color: "#F97B0C" }}>.</span>
        </h1>
        {/* count is units, not lines — one line at qty 3 reads "3 ITEMS". */}
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, color: "#6B6357" }}>
          {count} {count === 1 ? "ITEM" : "ITEMS"}
        </span>
      </div>
    </div>
  );

  const banner = error && (
    <div style={{ border: "2px solid #C0392B", background: "#FBEAE7", color: "#C0392B", padding: "14px 16px", fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
      {error}
    </div>
  );

  const emptyState = (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px 0 70px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <img src={logo} alt="" style={{ width: 78, height: 78, borderRadius: 18, animation: "bob 5s ease-in-out infinite" }} />
      <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(32px, 5vw, 52px)", margin: 0, textTransform: "uppercase", lineHeight: 0.9 }}>
        Nothing in here.
      </h2>
      <p style={{ margin: 0, color: "#6B6357", fontSize: 15, fontWeight: 500 }}>Tragic. Fix it before the drop sells out.</p>
      <Hover
        tag={Link}
        to="/products"
        style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "15px 28px", boxShadow: "5px 5px 0 #F97B0C", transition: "transform 0.15s, box-shadow 0.15s" }}
        hover={{ transform: "translate(-2px,-2px)", boxShadow: "7px 7px 0 #F97B0C" }}
      >
        SHOP THE DROP
      </Hover>
    </div>
  );

  // This page IS the cart — you arrive by navigating, so the gate is decided on
  // arrival rather than by intercepting a click, and it has no dismiss: there is
  // nothing to browse behind it. BACK TO THE DROP is the way out.
  const gate = (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(16,16,16,0.72)" }}>
      <div role="dialog" aria-modal="true" aria-label={GATE.title} style={{ width: "min(420px, 100%)", background: "#FFFDF8", border: "2px solid #101010", boxShadow: "12px 12px 0 #F97B0C" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "2px solid #101010" }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.04em" }}>{GATE.title}</span>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <img src={logo} alt="" style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#6B6357" }}>{GATE.message}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Hover
              tag={Link}
              to={gateHref(false)}
              style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", textAlign: "center", textDecoration: "none", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: 14, boxShadow: "4px 4px 0 #101010", transition: "transform 0.15s, box-shadow 0.15s" }}
              hover={{ transform: "translate(-2px,-2px)", boxShadow: "6px 6px 0 #101010" }}
              active={{ transform: "translate(0,0)", boxShadow: "0 0 0 #101010" }}
            >
              SIGN IN
            </Hover>
            <Hover
              tag={Link}
              to={gateHref(true)}
              style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", textAlign: "center", textDecoration: "none", background: "none", color: "#101010", border: "2px solid #101010", padding: 14 }}
              hover={{ background: "#101010", color: "#F6F1E7" }}
            >
              CREATE ACCOUNT
            </Hover>
            <Hover
              tag={Link}
              to="/products"
              style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textAlign: "center", color: "#6B6357", padding: 4, textDecoration: "underline" }}
              hover={{ color: "#101010" }}
            >
              BACK TO THE DROP
            </Hover>
          </div>
        </div>
      </div>
    </div>
  );

  // authLoading covers the /me round trip: until it resolves a signed-in shopper
  // still reads as signed out, and the gate would flash over their own cart.
  // `loading` then covers the cart itself — for a guest that is the catalog fetch
  // that puts names and prices back onto lines stored as slug/size/qty alone.
  if (authLoading || loading) return shell(<>{header}<p style={{ textAlign: "center", padding: "60px 0", color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING YOUR CART…</p></>);
  // The gate is an offer to restore a cart from an account, so it only appears when
  // there is nothing here to lose. A guest holding items gets their cart; sign-in
  // waits for them at checkout, where the order needs an account.
  if (items.length === 0) return shell(<>{header}{banner}{emptyState}{authed ? null : gate}</>);

  // Ticking is save-for-later, and there is no account to save it to yet — a guest's
  // lines are all in. The boxes say so rather than pretending to toggle.
  const selectable = authed;

  const checkbox = (checked, onClick, label) => (
    <button
      onClick={onClick}
      disabled={!selectable}
      title={selectable ? undefined : "Sign in to save items for later"}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      style={{ width: 24, height: 24, flexShrink: 0, border: "2px solid #101010", background: checked ? "#F97B0C" : "#FFFDF8", color: "#101010", fontSize: 13, fontWeight: 900, lineHeight: 1, cursor: selectable ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
    >
      {checked ? "✓" : ""}
    </button>
  );

  // Orders hang off a user id, so this is the one step that genuinely needs an
  // account. Say it on the button rather than letting checkout be the surprise.
  const checkoutHref = authed
    ? "/checkout"
    : `/sign-in?return=/checkout&reason=${encodeURIComponent("Sign in to check out — your cart comes with you.")}`;

  const stepper = { width: 32, height: 32, border: "2px solid #101010", background: "none", fontWeight: 900, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s" };
  const stepperHover = { background: "#101010", color: "#F6F1E7" };

  return shell(
    <>
      {header}
      {banner}

      <div className="rf-2col" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 40, alignItems: "start" }}>
        {/* Line items */}
        <div style={{ display: "flex", flexDirection: "column", border: "2px solid #101010", background: "#FFFDF8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: "2px solid #101010", fontWeight: 900, fontSize: 11, letterSpacing: "0.16em", color: "#6B6357" }}>
            {checkbox(!!allSelected, () => quiet(selectAll(!allSelected)), "Select all items")}
            <span style={{ flex: 1 }}>ITEM</span>
            <span>SUBTOTAL</span>
          </div>

          {items.map((item) => {
            // Unticked lines stay in the cart as save-for-later and are dimmed.
            const dim = item.selected ? 1 : 0.45;
            return (
              <div key={item.id} className="rf-line" style={{ display: "flex", gap: 18, alignItems: "center", padding: "20px 22px", borderBottom: "1px solid #E7DFCE" }}>
                {checkbox(!!item.selected, () => quiet(selectItem(item.id, !item.selected)), `Select ${item.name} for checkout`)}
                <Link to={`/product/${item.slug}`} style={{ width: 84, height: 104, flexShrink: 0, background: "#ECE5D6", border: "2px solid #101010", display: "block", opacity: dim, transition: "opacity 0.2s" }} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, opacity: dim, transition: "opacity 0.2s" }}>
                  <Hover
                    tag={Link}
                    to={`/product/${item.slug}`}
                    style={{ fontFamily: "Anton, sans-serif", fontSize: 21, textTransform: "uppercase", lineHeight: 1, color: "#101010", textDecoration: "none" }}
                    hover={{ color: "#F97B0C" }}
                  >
                    {item.name}
                  </Hover>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6357" }}>Size {item.size} · {item.unit_price_formatted} each</span>
                  {/* Nothing is reserved until checkout, so a line can go stale while
                      it sits here — surface it rather than hide it. */}
                  {item.exceeds_stock && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#C0392B" }}>
                      ⚠ {item.stock > 0 ? `Only ${item.stock} left — reduce to check out` : "Sold out"}
                    </span>
                  )}
                  <button onClick={() => quiet(remove(item.id))} style={{ alignSelf: "flex-start", marginTop: 2, background: "none", border: "none", padding: 0, fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", color: "#C0392B", cursor: "pointer", textDecoration: "underline" }}>REMOVE</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <Hover onClick={() => changeQty(item.id, item.qty - 1)} aria-label={`Decrease ${item.name} quantity`} style={stepper} hover={stepperHover}>−</Hover>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                  <Hover onClick={() => changeQty(item.id, item.qty + 1)} aria-label={`Increase ${item.name} quantity`} style={stepper} hover={stepperHover}>+</Hover>
                </div>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, color: "#F97B0C", whiteSpace: "nowrap", minWidth: 84, textAlign: "right" }}>{item.line_total_formatted}</span>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <aside className="rf-sticky" style={{ position: "sticky", top: 90, border: "2px solid #101010", background: "#FFFDF8", boxShadow: "10px 10px 0 #101010", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 22px", borderBottom: "2px solid #101010" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, letterSpacing: "0.04em" }}>ORDER SUMMARY</span>
          </div>
          <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
                {freeShip ? "FREE SHIPPING UNLOCKED. YOU DID IT." : `${peso(remaining)} AWAY FROM FREE SHIPPING 👀`}
              </p>
              <div style={{ height: 10, background: "#E7DFCE", border: "1px solid #101010", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "#F97B0C", width: shipProgress, transition: "width 0.4s cubic-bezier(.2,.7,.2,1)" }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "#6B6357" }}>
              <span>Subtotal ({selectedCount} selected)</span>
              <span>{selectedSubtotalFmt}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "#6B6357" }}>
              <span>Shipping</span>
              <span>{freeShip ? "FREE" : "Calculated at checkout"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Anton, sans-serif", fontSize: 24, borderTop: "2px solid #101010", paddingTop: 14 }}>
              <span>TOTAL</span>
              <span style={{ color: "#F97B0C" }}>{selectedSubtotalFmt}</span>
            </div>

            {/* Nothing ticked: say why rather than offering a button that can't work. */}
            {nothingSelected ? (
              <span style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#C0392B", border: "2px solid #C0392B", background: "#FBEAE7", padding: 10 }}>
                Tick an item to check out.
              </span>
            ) : (
              <Hover
                tag={Link}
                to={checkoutHref}
                style={{ textAlign: "center", textDecoration: "none", fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.1em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: 16, boxShadow: "5px 5px 0 #101010", transition: "transform 0.15s, box-shadow 0.15s", marginTop: 4 }}
                hover={{ transform: "translate(-2px,-2px)", boxShadow: "7px 7px 0 #101010" }}
                active={{ transform: "translate(0,0)", boxShadow: "0 0 0 #101010" }}
              >
                CHECKOUT ({selectedCount}) →
              </Hover>
            )}

            {!authed && (
              <span style={{ textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#6B6357", lineHeight: 1.5 }}>
                YOU’LL SIGN IN AT CHECKOUT — THIS CART COMES WITH YOU.
              </span>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 2 }}>
              {["GCASH", "MAYA", "CARD", "COD"].map((m) => (
                <span key={m} style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.12em", color: "#101010", border: "1.5px solid #101010", padding: "5px 9px" }}>{m}</span>
              ))}
            </div>
            <span style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.12em", color: "#6B6357", fontWeight: 700 }}>
              DEMO STORE — ORDERS ARE REAL, PAYMENT IS SIMULATED
            </span>
          </div>
        </aside>
      </div>
    </>
  );
}

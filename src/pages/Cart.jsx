import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "/reefer-logo.jpg";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { useFavorites } from "../hooks/useFavorites";
import { addressApi } from "../api/addressApi";
import AddressPrompt, { DISMISS_KEY } from "../components/AddressPrompt";

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
function Hover({ tag: Tag = "button", style, hover, active, children, ...rest }) {
  const [phase, setPhase] = useState("idle");
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
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const navigate = useNavigate();

  // Which line is mid-move, and which just went. Keyed by cart-item id rather than
  // slug: the same product in two sizes is two lines, and only the one tapped should
  // show a spinner or a receipt.
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [saveError, setSaveError] = useState("");

  /*
   * Whether this account has a saved address, fetched once the cart knows it is
   * signed in.
   *
   * Loaded here rather than on the CHECKOUT tap so the button stays instant — asking
   * the API mid-click would put a network round trip between the tap and anything
   * happening. `null` means "not answered yet", which is deliberately distinct from
   * 0: an unanswered fetch must not be read as an empty address book and pop a dialog
   * at someone who has three saved.
   *
   * A failure leaves it null for the same reason. Checkout collects an address inline
   * anyway, so the worst case of staying quiet is the shopper typing it there — far
   * better than a wrong prompt interrupting a real order.
   */
  // One state object TAGGED with the auth state it was fetched under, so signing out
  // invalidates the count by derivation instead of a reset setState in the effect
  // body — which would cost an extra render pass and trip react-hooks'
  // set-state-in-effect rule. Same shape useProduct() uses for its slug.
  const [addrFetch, setAddrFetch] = useState({ forAuthed: false, count: null });
  const [addrPromptOpen, setAddrPromptOpen] = useState(false);

  useEffect(() => {
    if (!authed) return undefined;
    let alive = true;
    addressApi
      .list()
      .then((rows) => alive && setAddrFetch({ forAuthed: true, count: Array.isArray(rows) ? rows.length : 0 }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [authed]);

  const addressCount = authed && addrFetch.forAuthed ? addrFetch.count : null;

  // The context records the server's message for the banner; the rethrow is only
  // there for callers mid-flow, so swallow it rather than leave it unhandled.
  const quiet = (p) => p.catch(() => {});
  // qty 0 is how the API removes a line, which is what "−" on the last one means.
  const changeQty = (id, next) => quiet(updateQty(id, Math.max(0, next)));

  /**
   * Move a line out of the cart and onto the wishlist.
   *
   * Wishlist first, cart second, and only on success: if the favourite write fails we
   * still have the line, whereas removing first would drop the item on the floor with
   * nothing saved. The reverse order can at worst leave it in both places, which the
   * shopper can see and undo.
   *
   * `toggle` is the only add endpoint and it flips, so something already hearted must
   * be left alone — toggling it would quietly UNsave it while the button claims the
   * opposite. Size is lost here because the wishlist is per product, not per variant;
   * that is why the wishlist asks for a size again on the way back.
   */
  const saveForLater = async (item) => {
    if (savingId) return;
    setSavingId(item.id);
    setSaveError("");
    try {
      if (!isFavorite(item.slug)) await toggleFavorite(item.slug);
      await remove(item.id);
      setSavedId(item.id);
      setTimeout(() => setSavedId((id) => (id === item.id ? null : id)), 2600);
    } catch (err) {
      setSaveError(err?.message || `Could not save ${item.name} for later.`);
    } finally {
      setSavingId(null);
    }
  };

  // The summary totals only the TICKED lines — that's what checkout will charge.
  // The free-shipping bar follows the same number, or it would promise free
  // shipping on a threshold the order never reaches.
  const freeShip = selectedSubtotal >= FREE_SHIP;
  const remaining = Math.max(0, FREE_SHIP - selectedSubtotal);
  const shipProgress = Math.min(100, Math.round((selectedSubtotal / FREE_SHIP) * 100)) + "%";
  const nothingSelected = selectedCount === 0 && count > 0;
  const isEmpty = items.length === 0;

  /*
   * Signed in, address book empty, and they have not already waved this away this
   * session — offer to save one before checkout instead of navigating.
   *
   * Three guards, each earning its place:
   *   authed          — a signed-out shopper is already routed to sign-in above.
   *   addressCount===0 — strict, so the `null` "not answered yet" state stays quiet.
   *   !dismissed      — sessionStorage, so tapping CHECKOUT again after choosing
   *                     "another time" goes straight through. The ask is a one-time
   *                     offer, not a toll gate on every attempt. sessionStorage and
   *                     not localStorage: a new visit is a fair time to offer again,
   *                     and the whole thing stops for good the moment an address
   *                     exists, since the count is then non-zero.
   */
  const dismissed = (() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false; // private mode / storage disabled — just show it
    }
  })();
  const needsAddress = authed && addressCount === 0 && !dismissed;

  const onCheckoutClick = (e) => {
    if (!needsAddress) return; // let the Link navigate normally
    e.preventDefault();
    setAddrPromptOpen(true);
  };

  const rememberDismissal = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage disabled — the prompt simply offers again next tap */
    }
  };

  // "Set up my address": hand the address book a way back, so saving one returns
  // them to the cart they were mid-checkout on rather than stranding them in Account.
  const goSetUpAddress = () => {
    rememberDismissal();
    setAddrPromptOpen(false);
    navigate("/account?tab=addresses&from=cart");
  };

  const goCheckoutAnyway = () => {
    rememberDismissal();
    setAddrPromptOpen(false);
    navigate("/checkout");
  };

  // Mounted in the shell rather than beside the button: the dialog is fixed-position
  // and lives above everything, so it belongs outside the scrolling <section> — and
  // this way it survives every branch of the page below without being repeated.
  const shell = (children) => (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />
      <section className="rf-section" style={{ maxWidth: 1240, margin: "0 auto", padding: "112px 32px 100px" }}>
        {children}
      </section>
      <Footer />
      <AddressPrompt
        open={addrPromptOpen}
        onClose={() => setAddrPromptOpen(false)}
        onSetUp={goSetUpAddress}
        onLater={goCheckoutAnyway}
      />
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

  /**
   * The empty message, sized to sit INSIDE the line-items panel rather than replacing
   * the whole page. Keeping the two-column frame means an emptied cart still reads as
   * the cart — same panels, same summary rail — instead of a different screen that
   * happens to share a title.
   *
   * minHeight roughly matches two populated rows, so the panel doesn't collapse to a
   * letterbox next to the summary beside it.
   */
  const emptyState = (
    <div style={{ padding: "56px 24px 60px", minHeight: 260, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <img src={logo} alt="" style={{ width: 72, height: 72, borderRadius: 18, animation: "bob 5s ease-in-out infinite" }} />
      <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(28px, 3.4vw, 42px)", margin: 0, textTransform: "uppercase", lineHeight: 0.9 }}>
        Nothing in here.
      </h2>
      <p style={{ margin: 0, color: "#6B6357", fontSize: 14.5, fontWeight: 500, maxWidth: 340, lineHeight: 1.6 }}>
        Tragic. Fix it before the drop sells out.
      </p>
      <Hover
        tag={Link}
        to="/products"
        style={{ marginTop: 4, fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "15px 28px", boxShadow: "5px 5px 0 #F97B0C", transition: "transform 0.15s, box-shadow 0.15s" }}
        hover={{ transform: "translate(-2px,-2px)", boxShadow: "7px 7px 0 #F97B0C" }}
      >
        SHOP THE DROP
      </Hover>
      {/* Saved things are one tap away and are the likeliest reason this is empty. */}
      {authed && (
        <Hover
          tag={Link}
          to="/account?tab=favorites"
          style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357", textDecoration: "underline", textUnderlineOffset: 3 }}
          hover={{ color: "#101010" }}
        >
          ♥ CHECK YOUR SAVED ITEMS
        </Hover>
      )}
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


  // The order summary rail. Shared by the full and empty carts so the page keeps
  // its shape either way — an empty cart that collapses to a single centred
  // message reads like a different page rather than the same one, emptied.
  // Saving the LAST line empties the cart, so this has to render on the empty branch
  // too — otherwise the one case where the feedback matters most is the one without it.
  const moveBanners = (
    <>
    {/* The line disappears the moment it is saved, so without this the shopper sees
        an item vanish and has to guess where it went. */}
    {savedId && (
      <div role="status" style={{ border: "2px solid #101010", background: "#F97B0C", padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, fontSize: 12.5, letterSpacing: "0.04em" }}>♥ Saved for later — it's in your favourites now.</span>
        <Link to="/account?tab=favorites" style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#101010", textDecoration: "underline", textUnderlineOffset: 3, whiteSpace: "nowrap" }}>
        VIEW WISHLIST →
        </Link>
      </div>
    )}
    {saveError && (
      <div role="alert" style={{ border: "2px solid #C0392B", background: "#FBEAE7", color: "#C0392B", padding: "12px 16px", marginBottom: 20, fontWeight: 700, fontSize: 12.5 }}>{saveError}</div>
    )}
    </>
  );

  const summary = (
  <aside className="rf-sticky" style={{ position: "sticky", top: 90, border: "2px solid #101010", background: "#FFFDF8", boxShadow: "10px 10px 0 #101010", display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "20px 22px", borderBottom: "2px solid #101010" }}>
      <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, letterSpacing: "0.04em" }}>ORDER SUMMARY</span>
    </div>
    <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: isEmpty ? "#6B6357" : "#101010" }}>
          {/* "₱2,500 away from free shipping" is a taunt at someone holding nothing.
              State the threshold instead — same fact, no scolding. */}
          {isEmpty
            ? `FREE SHIPPING OVER ${peso(FREE_SHIP)}`
            : freeShip
              ? "FREE SHIPPING UNLOCKED. YOU DID IT."
              : `${peso(remaining)} AWAY FROM FREE SHIPPING 👀`}
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

      {/* Empty: keep the button in place so the rail holds its shape, but inert and
          plainly so. The live call to action lives in the panel on the left, where
          the shopper is already looking. */}
      {isEmpty ? (
        <span
          aria-disabled="true"
          style={{ textAlign: "center", fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.1em", background: "#ECE5D6", color: "#A99F8C", border: "2px solid #C9C0B0", padding: 16, marginTop: 4, cursor: "not-allowed" }}
        >
          CHECKOUT
        </span>
      ) : nothingSelected ? (
        <span style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#C0392B", border: "2px solid #C0392B", background: "#FBEAE7", padding: 10 }}>
          Tick an item to check out.
        </span>
      ) : (
        <Hover
          tag={Link}
          to={checkoutHref}
          onClick={onCheckoutClick}
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
  );

  const stepper = { width: 32, height: 32, border: "2px solid #101010", background: "none", fontWeight: 900, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s" };
  const stepperHover = { background: "#101010", color: "#F6F1E7" };

  // Empty, but the page keeps its bones: same two columns, same panel chrome, same
  // summary rail. Only the rows are replaced — by the message — and the checkout
  // button goes inert. The alternative, swapping in one centred block, made an
  // emptied cart look like a navigation mistake rather than an empty cart.
  if (isEmpty)
    return shell(
      <>
        {header}
        {banner}
        {moveBanners}

        <div className="rf-2col" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 40, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", border: "2px solid #101010", background: "#FFFDF8" }}>
            {/* Same header row as a full cart, minus the select-all — there is nothing
                to select, and a live checkbox over zero rows is a broken promise. */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: "2px solid #101010", fontWeight: 900, fontSize: 11, letterSpacing: "0.16em", color: "#A99F8C" }}>
              <span style={{ flex: 1 }}>ITEM</span>
              <span>SUBTOTAL</span>
            </div>
            {emptyState}
          </div>

          {summary}
        </div>

        {authed ? null : gate}
      </>
    );

  return shell(
    <>
      {header}
      {banner}

      {moveBanners}

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
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 2, flexWrap: "wrap" }}>
                    <button onClick={() => quiet(remove(item.id))} style={{ background: "none", border: "none", padding: 0, fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", color: "#C0392B", cursor: "pointer", textDecoration: "underline" }}>REMOVE</button>
                    <span aria-hidden="true" style={{ color: "#C9C0B0" }}>|</span>
                    {/* Not styled as a danger action, unlike REMOVE — nothing is lost,
                        the item just changes shelves. */}
                    <button
                      onClick={() => saveForLater(item)}
                      disabled={!!savingId}
                      style={{ background: "none", border: "none", padding: 0, fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", color: "#101010", cursor: savingId ? "progress" : "pointer", textDecoration: "underline", opacity: savingId && savingId !== item.id ? 0.4 : 1 }}
                    >
                      {savingId === item.id ? "SAVING…" : "SAVE FOR LATER"}
                    </button>
                    {isFavorite(item.slug) && (
                      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#6B6357" }}>♥ ALREADY IN FAVOURITES</span>
                    )}
                  </div>
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

        {summary}
      </div>
    </>
  );
}

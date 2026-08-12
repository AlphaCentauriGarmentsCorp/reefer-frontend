import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "/reefer-logo.jpg";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { orderApi } from "../api/orderApi";
import { accountApi } from "../api/accountApi";
import { addressApi } from "../api/addressApi";
import { discountApi } from "../api/discountApi";

/*
 * The shipping-method picker is gone from the UI, but the API still requires a
 * `shipping_method` and validates it against config('reefer.shipping_methods') — so
 * every order is placed on 'golocal', the free option. Its fee is 0 unconditionally,
 * which is why nothing downstream has to compute one any more.
 *
 * Bring the picker back by restoring the list here and the block in step 1; the
 * server has always supported both and never needed changing.
 */
const SHIPPING_METHOD = "golocal";
const PAYMENTS = [
  { id: "gcash", label: "GCash" },
  { id: "maya", label: "Maya" },
  { id: "card", label: "Card" },
  { id: "cod", label: "COD" },
];

const field = { fontFamily: "Archivo, sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 14px", border: "2px solid #101010", background: "#FFFDF8", color: "#101010", width: "100%" };
const lbl = { fontWeight: 900, fontSize: 10, letterSpacing: "0.14em", color: "#6B6357" };
// Barangay, Region and Zip are `nullable` in StoreOrderRequest — the inputs already
// omit `required`, but nothing on screen said so, leaving eight fields that all looked
// compulsory. Marked rather than hidden: PH couriers do route on barangay, so it is
// worth filling when known — just not worth stalling an order over.
const optionalTag = { fontWeight: 700, fontSize: 9, letterSpacing: "0.08em", color: "#A99F8C", textTransform: "none" };
const sectionHead = { fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.04em", textTransform: "uppercase", borderBottom: "2px solid #101010", paddingBottom: 10 };
const peso = (n) => "₱" + Number(n || 0).toLocaleString();

const blankForm = () => ({ email: "", firstName: "", lastName: "", mobile: "", street: "", barangay: "", city: "", province: "", region: "", zip: "" });

// barangay stays its own field: orders.barangay is a real column and PH couriers route on it.
const addressToForm = (a, email) => {
  const nm = String(a.name || "").trim().split(/\s+/);
  return {
    email: email || "",
    firstName: nm[0] || "",
    lastName: nm.slice(1).join(" "),
    mobile: a.phone || "",
    street: a.street || "",
    barangay: a.barangay || "",
    city: a.city || "",
    province: a.province || "",
    region: a.region || "",
    zip: a.postal || "",
  };
};

/**
 * The account's contact details as form defaults — name, email, phone, no address.
 *
 * This used to be pushed into the card list as an "ACCOUNT INFO" tile, which put a
 * pickable "shipping address" in front of the shopper that contained no address:
 * selecting it looked like a choice but left the street blank and the form open. The
 * prefill it provided is genuinely useful, though, so it survives as seed values while
 * the misleading card does not.
 */
const contactForm = (account) => {
  const user = account?.user || {};
  const parts = String(user.name || "").trim().split(/\s+/).filter(Boolean);
  return {
    ...blankForm(),
    email: user.email || "",
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
    mobile: user.phone || "",
  };
};

/** Pickable cards — saved addresses only. Every one of these has a street. */
const cardsFromAccount = (account) => {
  const user = account?.user || {};
  const email = user.email || "";
  const cards = [];

  (account?.addresses || []).forEach((a, i) => {
    cards.push({
      tag: a.is_default_shipping ? "DEFAULT SHIPPING" : a.is_default_billing ? "DEFAULT BILLING" : "SAVED ADDRESS " + (i + 1),
      name: a.name || user.name || "",
      line1: [a.street, a.barangay].filter(Boolean).join(", "),
      line2: [a.city, a.province, a.postal].filter(Boolean).join(", "),
      phone: a.phone || user.phone || "",
      form: addressToForm({ ...a, name: a.name || user.name || "", phone: a.phone || user.phone || "" }, email),
    });
  });

  return cards;
};

export default function Checkout() {
  const { user } = useAuth();
  const location = useLocation();
  const cart = useCart();
  const { authed, loading, refresh } = cart;

  /*
   * "Buy it now" from a product page: one line handed over in router state, which was
   * never written to the cart. POST /orders prices the `items` it is sent and only
   * removes those variants from the cart afterwards, so an item that was never in the
   * cart orders identically and leaves the cart untouched — nothing unticked, no
   * abandoned line left behind.
   *
   * React Router keeps this in history.state, so a reload of /checkout survives; a
   * fresh navigation here does not, which is right — a direct purchase is one shot.
   */
  const handoff = location.state?.buyNow || null;
  // Router state is history, and history can be hand-edited or left over from an older
  // build. Anything without the three fields the order actually needs falls back to the
  // cart rather than rendering a line the server would reject.
  const buyNow = handoff?.slug && handoff?.size && Number(handoff?.qty) > 0 ? handoff : null;
  const buyNowSubtotal = buyNow ? Number(buyNow.price || 0) * Number(buyNow.qty || 0) : 0;

  // Only the ticked lines are ordered — unticked ones are save-for-later and the
  // server prices exactly what we send, so the two must agree.
  const items = buyNow
    ? [{
        id: "buy-now",
        slug: buyNow.slug,
        size: buyNow.size,
        qty: buyNow.qty,
        name: buyNow.name,
        line_total_formatted: peso(buyNowSubtotal),
      }]
    : (cart.items || []).filter((i) => i.selected);

  const [step, setStep] = useState("shipping"); // shipping | review
  const [phase, setPhase] = useState("form"); // form | processing | success | fail
  const [form, setForm] = useState(blankForm);
  const [payment, setPayment] = useState("gcash");
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [selectedAddr, setSelectedAddr] = useState(-1); // index into cards; -1 = new address form
  const [showForm, setShowForm] = useState(true);
  const [saveAddress, setSaveAddress] = useState(true);
  const [formError, setFormError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [placed, setPlaced] = useState(null); // the order row the API wrote
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState(null); // the validated preview, not a guarantee
  const [applying, setApplying] = useState(false);
  const [codeError, setCodeError] = useState("");
  const emailRef = useRef(null);

  // The cart provider fetches after first paint, so a hard reload onto /checkout
  // arrives with an empty cart for a beat. Hold the empty state back that long
  // rather than flash "nothing to check out" over a cart that is merely in flight.
  const [settling, setSettling] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSettling(false), 400);
    return () => clearTimeout(t);
  }, []);

  // The mockup floats the summary above the form once the grid stacks; inline
  // styles can't express that media query, so track the breakpoint in JS.
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 980px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const on = (e) => setNarrow(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // The account is the source of truth for saved addresses — a shopper who saved
  // one on their phone should not be made to retype it on a laptop.
  useEffect(() => {
    if (!authed) {
      setAccountLoading(false);
      return;
    }
    let alive = true;
    accountApi
      .dashboard()
      .then((data) => {
        if (!alive) return;
        setAccount(data);
        // A saved address, if there is one, fills the form and closes it. With none,
        // seed just the contact half so the shopper types the address and not their
        // own email again — the form stays open because it still needs a street.
        const cards = cardsFromAccount(data);
        if (cards.length) {
          setForm(cards[0].form);
          setSelectedAddr(0);
          setShowForm(false);
        } else {
          setForm(contactForm(data));
        }
      })
      .catch(() => {}) // never block checkout on the address book
      .finally(() => {
        if (alive) setAccountLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authed]);

  // Fallback prefill for when /account is still in flight or unreachable.
  useEffect(() => {
    if (!user) return;
    const parts = String(user.name || "").trim().split(/\s+/);
    setForm((f) => ({
      ...f,
      email: f.email || user.email || "",
      firstName: f.firstName || parts[0] || "",
      lastName: f.lastName || parts.slice(1).join(" "),
    }));
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const cards = account ? cardsFromAccount(account) : [];
  const selectCard = (i) => {
    setForm(cards[i].form);
    setSelectedAddr(i);
    setShowForm(false);
    setFormError("");
  };

  const openForm = () => {
    setShowForm(true);
    setSelectedAddr(-1);
    setTimeout(() => {
      emailRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      emailRef.current?.focus();
    }, 120);
  };

  // "+ New Address" empties the address half only — the contact details they just
  // confirmed are still theirs, and retyping them is not what they asked for.
  const newAddress = () => {
    setForm((f) => ({ ...f, street: "", barangay: "", city: "", province: "", region: "", zip: "" }));
    openForm();
  };

  // Ordered lines while the cart still holds them; the order's own lines once it
  // is placed, because the server has removed them from the cart by then.
  const lines = placed
    ? (placed.items || []).map((i, idx) => ({ key: "p" + idx, name: i.name, size: i.size, qty: i.qty, total: peso(i.line_total) }))
    : items.map((i) => ({ key: i.id, name: i.name, size: i.size, qty: i.qty, total: i.line_total_formatted }));

  const subtotal = placed ? placed.subtotal ?? 0 : buyNow ? buyNowSubtotal : cart.selected_subtotal ?? 0;
  const subtotalFmt = placed ? peso(placed.subtotal) : buyNow ? peso(buyNowSubtotal) : cart.selected_subtotal_formatted ?? "₱0";
  // Free shipping is still earned on the pre-discount basket — a voucher is a
  // thank-you, not a reason to take the free delivery back off the same order.
  // golocal is free unconditionally, so a quote is always 0; once the server has
  // written the row its own figure is the truth.
  const shipFee = placed ? placed.shipping_fee ?? 0 : 0;
  // A preview is a quote, so clamp it: a stale one must never show a discount
  // larger than the basket it comes off.
  const quoted = (placed ? placed.discount_amount ?? applied?.discount_amount : applied?.discount_amount) ?? 0;
  const discountAmount = Math.min(Math.max(0, quoted), subtotal);
  const discountCode = (placed ? placed.discount_code : "") || applied?.code || "";
  // Once the server has written the row its total is the truth; until then we quote.
  const total = placed && typeof placed.total === "number" ? placed.total : subtotal - discountAmount + shipFee;
  const count = placed ? lines.reduce((n, l) => n + l.qty, 0) : buyNow ? Number(buyNow.qty || 0) : cart.selected_count ?? 0;
  const payLabel = PAYMENTS.find((p) => p.id === payment)?.label || "";

  const goReview = (e) => {
    e.preventDefault();
    // A contact-only card leaves the address blank — say so here rather than
    // spending a round trip to have the server say it.
    if (!form.email || !form.street || !form.city) {
      setFormError("We still need an email, street and city before we can ship this.");
      openForm();
      return;
    }
    setFormError("");
    setStep("review");
    window.scrollTo(0, 0);
  };
  const goShipping = () => {
    setStep("shipping");
    window.scrollTo(0, 0);
  };

  /**
   * Save the address they just ordered with, so the next checkout is one tap.
   * Skipped when they untick the box or when the same street+city is already on
   * file — and never allowed to turn a placed order into an error on screen.
   */
  const rememberAddress = async () => {
    if (!saveAddress || !form.street || !form.city) return;
    const existing = account?.addresses || [];
    const already = existing.some(
      (a) =>
        String(a.street || "").trim().toLowerCase() === form.street.trim().toLowerCase() &&
        String(a.city || "").trim().toLowerCase() === form.city.trim().toLowerCase()
    );
    if (already) return;

    await addressApi.create({
      name: `${form.firstName} ${form.lastName}`.trim() || "Me",
      phone: form.mobile,
      street: form.street,
      barangay: form.barangay || null,
      city: form.city,
      province: form.province,
      region: form.region || null,
      postal: form.zip || null,
      // Their first saved address is almost certainly where they want things sent.
      is_default_shipping: existing.length === 0,
    });

    const onFile = account?.user?.phone;
    if (!String(onFile || "").trim() && form.mobile) await accountApi.update({ phone: form.mobile });
  };

  const applyCode = async () => {
    const code = codeInput.trim();
    if (!code || applying) return;

    // POST /discounts/validate quotes against the lines ticked in the cart, and a
    // direct purchase deliberately has none. Rather than refuse a perfectly good
    // voucher with "tick the items you are buying", carry it to POST /orders, which
    // re-prices every code against the lines it is actually given. The refusal path
    // below already handles a code the order rejects, so nothing here is a promise.
    if (buyNow) {
      setApplied({ code: code.toUpperCase(), description: "We’ll take it off at payment", deferred: true });
      setCodeInput("");
      setCodeError("");
      return;
    }

    setApplying(true);
    setCodeError("");
    try {
      const res = await discountApi.validate(code);
      setApplied(res.data || null);
      setCodeInput("");
    } catch (err) {
      // 422 carries the reason in the shopper's own language; anything else is ours.
      setApplied(null);
      setCodeError(err?.message || "We couldn’t apply that code. Try again in a moment.");
    } finally {
      setApplying(false);
    }
  };

  const removeCode = () => {
    setApplied(null);
    setCodeError("");
    setCodeInput("");
  };

  // The order POST re-resolves the code, so one that was fine at preview can still
  // be refused here — expired, or its last use went to someone else mid-checkout.
  const codeWasRefused = (err) => {
    if (err?.status !== 422) return false;
    // When the server names the fields, believe it — sniffing the message instead
    // would read "the postal code field is required" as a dead voucher.
    if (err.errors) return Boolean(err.errors.discount_code);
    return /discount|voucher|code/i.test(err.message || "");
  };

  const runPayment = async (ok) => {
    setPhase("processing");
    setCheckoutError("");
    try {
      const payloadItems = items.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty }));
      if (!payloadItems.length) throw new Error("Nothing is selected for checkout.");
      const res = await orderApi.create({
        email: form.email,
        ship_to_name: `${form.firstName} ${form.lastName}`.trim() || "Guest",
        phone: form.mobile,
        street: form.street,
        barangay: form.barangay || null,
        city: form.city,
        province: form.province,
        region: form.region || null,
        postal: form.zip || null,
        shipping_method: SHIPPING_METHOD,
        payment_method: payment,
        items: payloadItems,
        // The code, never the money it is worth — the server re-prices it.
        ...(applied?.code ? { discount_code: applied.code } : {}),
        ...(ok ? {} : { simulate: "fail" }),
      });
      // Set the order before refreshing: the server has just emptied the ticked
      // lines, and the empty-cart guard must not flash behind the modal.
      setPlaced(res.data || {});
      setPhase("success");
      rememberAddress().catch(() => {});
      refresh(); // server removed only the ordered lines; re-read for the nav badge
      window.scrollTo(0, 0);
    } catch (err) {
      // A decline leaves the cart intact server-side, so re-read rather than assume.
      refresh();
      // A refused code must come off before they can retry: leaving it on would
      // either loop them through the same 422 or, worse, let them press pay again
      // on a total the server has already said it will not honour.
      if (applied && codeWasRefused(err)) {
        const why = err?.errors?.discount_code?.[0] || err?.message || "That code is no longer valid.";
        setApplied(null);
        setCodeError(why);
        setCheckoutError(`${why} We’ve taken it off — your total is now ${peso(subtotal + shipFee)}. Nothing was charged.`);
      } else {
        setCheckoutError(err?.message || "Something went wrong placing your order.");
      }
      setPhase("fail");
    }
  };

  // ---- Missing-details guide ----
  // Guidance, never a wall: it names what is missing, says why, and the form is
  // right below. The server still validates everything on POST /orders.
  const missing = [];
  if (account) {
    const u = account.user || {};
    const addrs = account.addresses || [];
    if (!String(u.name || "").trim()) missing.push("name");
    if (!String(u.phone || "").trim() && !addrs.some((a) => String(a.phone || "").trim())) missing.push("phone");
    if (!addrs.some((a) => String(a.street || "").trim())) missing.push("address");
  }
  const phoneOnFile = String(account?.user?.phone || "").trim() || (account?.addresses || []).find((a) => String(a.phone || "").trim())?.phone || "";
  const addressOnFile = (account?.addresses || []).find((a) => String(a.street || "").trim());
  const checklist = [
    { key: "name", label: "Your name", done: account?.user?.name || "On file", todo: "So we know who the parcel is for." },
    { key: "phone", label: "Mobile number", done: phoneOnFile || "On file", todo: "The courier calls this when they are outside." },
    { key: "address", label: "Delivery address", done: addressOnFile ? [addressOnFile.street, addressOnFile.city].filter(Boolean).join(", ") : "On file", todo: "Where the drop actually lands." },
  ];

  // ---- Shell: the mockup strips checkout down to a logo, an eyebrow and a way back ----
  const shell = (children) => (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <nav className="rf-nav" style={{ position: "sticky", top: 0, zIndex: 60, background: "#F6F1E7", borderBottom: "2px solid #101010", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 32px", gap: 24 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#101010" }}>
          <img src={logo} alt="Reefer" style={{ width: 36, height: 36, borderRadius: 6, display: "block" }} />
          <span className="rf-wordmark" style={{ fontFamily: "Anton, sans-serif", fontSize: 22, letterSpacing: "0.06em" }}>REEFER</span>
          <span className="rf-navmeta" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#6B6357", borderLeft: "1px solid #C9C0B0", paddingLeft: 12 }}>SECURE CHECKOUT</span>
        </Link>
        {/* A direct purchase never came from the cart, so pointing them at one they
            may not even have filled is a dead end — send them back to the product. */}
        <Link to={buyNow ? `/product/${buyNow.slug}` : "/cart"} className="rf-navlink" style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", color: "#101010", textDecoration: "none" }}>
          {buyNow ? "← BACK TO ITEM" : "← BACK TO CART"}
        </Link>
      </nav>
      {children}
    </div>
  );

  const centered = (children) => shell(<section className="rf-section" style={{ maxWidth: 700, margin: "0 auto", padding: "80px 32px 130px", textAlign: "center" }}>{children}</section>);

  // ---- Guards ----
  if (!authed) {
    return centered(
      <>
        <h1 style={{ fontFamily: "Anton, sans-serif", fontSize: "clamp(40px, 6vw, 72px)", margin: 0, textTransform: "uppercase" }}>Sign in to check out.</h1>
        <Link to="/sign-in?return=/checkout" className="rf-cta" style={{ display: "inline-block", marginTop: 22, fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "14px 26px", boxShadow: "5px 5px 0 #F97B0C" }}>SIGN IN</Link>
      </>
    );
  }
  // Once the order is in flight the guards must stand down: runPayment() calls
  // refresh(), which flips the cart back to loading, and a decline leaves `placed`
  // null — so keying these on `placed` alone buries the failure modal under LOADING.
  const settled = phase === "form";
  // A direct purchase carries its own line, so it must not wait on the cart round trip.
  if (settled && !buyNow && (loading || (settling && items.length === 0))) {
    return centered(<p style={{ color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING…</p>);
  }
  if (settled && items.length === 0) {
    // Distinguish "cart is empty" from "cart has items but none are ticked" —
    // the fix for the second one is on the cart page, not the catalog.
    const hasUnselected = (cart.items || []).length > 0;
    return centered(
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <img src={logo} alt="" style={{ width: 72, height: 72, borderRadius: 16, animation: "bob 5s ease-in-out infinite" }} />
        <h2 style={{ fontFamily: "Anton, sans-serif", fontSize: 36, margin: 0, textTransform: "uppercase" }}>Nothing to check out.</h2>
        <p style={{ color: "#6B6357", margin: 0, fontWeight: 600 }}>{hasUnselected ? "Tick the items you want to buy over in your cart." : "Your cart is empty."}</p>
        <Link to={hasUnselected ? "/cart" : "/products"} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "15px 28px", boxShadow: "5px 5px 0 #F97B0C" }}>
          {hasUnselected ? "BACK TO CART" : "SHOP THE DROP"}
        </Link>
      </div>
    );
  }

  const reviewing = step === "review";
  const tab = (mark, label, on, divider) => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, background: on ? "#F97B0C" : "#F6F1E7", color: "#101010", borderRight: divider ? "2px solid #101010" : "none" }}>
      <span style={{ fontFamily: "Anton, sans-serif", fontSize: 14, width: 26, height: 26, borderRadius: 999, border: "2px solid #101010", display: "flex", alignItems: "center", justifyContent: "center" }}>{mark}</span>
      <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );

  const overlaying = phase === "processing";
  // Inert the moment a payment is in flight: repricing the basket underneath a
  // charge is how a shopper ends up disputing one.
  const codeLocked = applying || phase !== "form";
  const resulting = phase === "success" || phase === "fail";
  const failed = phase === "fail";

  return shell(
    <>
      <section className="rf-2col rf-section" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 100px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, alignItems: "start" }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {/* Step tabs */}
          <div style={{ display: "flex", border: "2px solid #101010" }}>
            {tab(reviewing ? "✓" : "1", "Shipping", true, true)}
            {tab("2", "Review & Payments", reviewing, false)}
          </div>

          {/* ============ STEP 1: SHIPPING ============ */}
          {!reviewing && (
            <form onSubmit={goReview} style={{ display: "flex", flexDirection: "column", gap: 26, animation: "fadeUp 0.35s both" }}>
              {/* Missing-details guide — only once the account has landed and only
                  if something is actually absent. */}
              {!accountLoading && missing.length > 0 && (
                <div style={{ border: "2px solid #101010", background: "#FFFDF8", boxShadow: "6px 6px 0 #F97B0C", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#F97B0C", borderBottom: "2px solid #101010" }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>👋</span>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.03em", color: "#101010" }}>
                        {missing.length === 3 ? "FIRST ORDER? LET'S GET YOU SET UP." : "ALMOST THERE — A COUPLE OF THINGS MISSING."}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "#101010", opacity: 0.75 }}>Your account is missing {missing.join(" and ")}.</span>
                    </div>
                  </div>
                  <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {checklist.map((c) => {
                        const has = !missing.includes(c.key);
                        return (
                          <div key={c.key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <span style={{ width: 20, height: 20, flexShrink: 0, border: "2px solid #101010", background: has ? "#1F8A5B" : "#FFFDF8", color: has ? "#F6F1E7" : "#101010", fontSize: 11, fontWeight: 900, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>{has ? "✓" : ""}</span>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              <span style={{ fontWeight: 800, fontSize: 13, color: has ? "#6B6357" : "#101010" }}>{c.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "#6B6357", lineHeight: 1.45 }}>{has ? c.done : c.todo}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#6B6357", fontWeight: 500, borderTop: "1px solid #E7DFCE", paddingTop: 12 }}>
                      Fill these into the form below and tick “save to my account” — we will remember them, and your next checkout is one tap. You can also set them up properly in My Account first.
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {/* Only when the form is CLOSED. On a first order it is already
                          open directly below this banner, so the button was offering to
                          reveal something the shopper was looking at — and its scroll +
                          focus landed on a field already in view. It still earns its
                          place in the other shape this banner appears in: a saved
                          address whose phone is missing, where the form starts collapsed
                          behind the address card. */}
                      {!showForm && (
                        <button type="button" onClick={openForm} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "11px 18px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C" }}>FILL IT IN BELOW ↓</button>
                      )}
                      <Link to="/account" style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: "11px 18px" }}>SET UP IN MY ACCOUNT</Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping address */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={sectionHead}>Shipping Address</span>

                {cards.length > 0 && (
                  <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {cards.map((c, i) => {
                      const on = selectedAddr === i;
                      return (
                        <button type="button" key={c.tag + i} onClick={() => selectCard(i)} style={{ position: "relative", textAlign: "left", border: "2px solid #101010", background: "#FFFDF8", padding: "18px 18px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4, boxShadow: on ? "5px 5px 0 #F97B0C" : "none", transition: "box-shadow 0.15s, transform 0.15s" }}>
                          <span style={{ position: "absolute", top: 12, right: 12, width: 24, height: 24, border: "2px solid #101010", borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: on ? "#101010" : "transparent", color: on ? "#F6F1E7" : "#101010", fontSize: 13, fontWeight: 900 }}>{on ? "✓" : ""}</span>
                          <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.16em", color: "#F97B0C" }}>{c.tag}</span>
                          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, textTransform: "uppercase", lineHeight: 1.05, marginTop: 2 }}>{c.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#4A453D", lineHeight: 1.5 }}>{c.line1}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#4A453D", lineHeight: 1.5 }}>{c.line2}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6357", marginTop: 2 }}>{c.phone}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button type="button" onClick={() => (showForm ? setShowForm(false) : newAddress())} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "4px 0", fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", color: "#101010", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>
                  {showForm ? "− Hide new address form" : "+ New Address"}
                </button>

                {showForm && (
                  <div style={{ border: "2px solid #101010", background: "#FFFDF8", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.3s both" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>EMAIL</span><input ref={emailRef} type="email" required placeholder="you@email.com" value={form.email} onChange={set("email")} style={field} /></label>
                    <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>FIRST NAME</span><input required placeholder="Juan" value={form.firstName} onChange={set("firstName")} style={field} /></label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>LAST NAME</span><input placeholder="dela Cruz" value={form.lastName} onChange={set("lastName")} style={field} /></label>
                    </div>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>MOBILE NUMBER</span><input type="tel" required placeholder="0917 000 0000" value={form.mobile} onChange={set("mobile")} style={field} /></label>
                    <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>STREET ADDRESS</span><input required placeholder="Unit / House No., Street" value={form.street} onChange={set("street")} style={field} /></label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>BARANGAY <span style={optionalTag}>(optional)</span></span><input placeholder="Poblacion" value={form.barangay} onChange={set("barangay")} style={field} /></label>
                    </div>
                    <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>CITY / MUNICIPALITY</span><input required placeholder="Quezon City" value={form.city} onChange={set("city")} style={field} /></label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>PROVINCE</span><input required placeholder="Metro Manila" value={form.province} onChange={set("province")} style={field} /></label>
                    </div>
                    <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>REGION <span style={optionalTag}>(optional)</span></span><input placeholder="NCR" value={form.region} onChange={set("region")} style={field} /></label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>ZIP CODE <span style={optionalTag}>(optional)</span></span><input placeholder="1100" value={form.zip} onChange={set("zip")} style={field} /></label>
                    </div>
                    {/* Without this they would be asked for the same details again next order. */}
                    <button type="button" onClick={() => setSaveAddress((v) => !v)} role="checkbox" aria-checked={saveAddress} style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "4px 0", cursor: "pointer", textAlign: "left" }}>
                      <span style={{ width: 24, height: 24, flexShrink: 0, border: "2px solid #101010", background: saveAddress ? "#F97B0C" : "#FFFDF8", color: "#101010", fontSize: 12, fontWeight: 900, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>{saveAddress ? "✓" : ""}</span>
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: "#6B6357" }}>Save this to my account so next time is one tap</span>
                    </button>
                    {/* Was "USE THIS ADDRESS", styled as a filled black CTA sitting at
                        the end of the form — which read as the button that submits it.
                        It does not: it only collapses the form, and NEXT → is the real
                        submit. Two primary-looking buttons with one meaning between them
                        is a coin toss, so this one says what it does and looks like the
                        secondary action it is. */}
                    <button type="button" onClick={() => setShowForm(false)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: "4px 0", fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.06em", color: "#6B6357", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>− Collapse this form</button>
                  </div>
                )}
              </div>

              {formError && <span style={{ fontSize: 12, fontWeight: 700, color: "#C0392B", border: "2px solid #C0392B", background: "#FBEAE7", padding: 10, lineHeight: 1.5 }}>{formError}</span>}

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, borderTop: "2px solid #101010", paddingTop: 18 }}>
                <p style={{ margin: 0, maxWidth: 520, fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: "#101010" }}>
                  This drop is reserved for you for the next <span style={{ color: "#F97B0C" }}>10 minutes</span> — check out now before it rides away. 🌊
                </p>
                {/* Not .rf-cta — its hover forces an orange shadow, which vanishes
                    against this button's orange fill. */}
                <button type="submit" style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.08em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: "15px 40px", cursor: "pointer", boxShadow: "5px 5px 0 #101010", transition: "transform 0.15s, box-shadow 0.15s" }}>NEXT →</button>
              </div>
            </form>
          )}

          {/* ============ STEP 2: REVIEW & PAYMENTS ============ */}
          {reviewing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 26, animation: "fadeUp 0.35s both" }}>
              {/* Ship-to recap */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "2px solid #101010", paddingBottom: 10 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.04em", textTransform: "uppercase" }}>Shipping To</span>
                  <button onClick={goShipping} style={{ background: "none", border: "none", padding: 0, fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", color: "#101010", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>EDIT</button>
                </div>
                <div style={{ border: "2px solid #101010", background: "#FFFDF8", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 16, textTransform: "uppercase" }}>{`${form.firstName} ${form.lastName}`.trim() || "Your name"}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#4A453D", lineHeight: 1.5 }}>
                    {[form.street, form.barangay, form.city, form.province, form.zip, form.region].filter(Boolean).join(", ") || "No address entered"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6357" }}>{form.mobile || "—"} · {form.email}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#1F8A5B", marginTop: 4 }}>FREE SHIPPING</span>
                </div>
              </div>

              {/* Payment */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={sectionHead}>Payment Method</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {PAYMENTS.map((p) => {
                    const on = payment === p.id;
                    return (
                      <button key={p.id} onClick={() => setPayment(p.id)} style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.06em", padding: "11px 18px", border: "2px solid #101010", cursor: "pointer", background: on ? "#101010" : "#FFFDF8", color: on ? "#F6F1E7" : "#101010" }}>{p.label}</button>
                    );
                  })}
                </div>
                <div style={{ border: "2px dashed #C9C0B0", background: "#F1EADC", padding: "26px 20px", textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, textTransform: "uppercase", color: "#6B6357" }}>{payLabel} — placeholder</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.6, color: "#6B6357", fontWeight: 600 }}>
                    Only the card/e-wallet charge is faked — the buttons below choose which answer the gateway gives. Everything after that is real: SUCCESS writes the order, takes the stock down and clears the items from your cart. FAILURE writes nothing at all.
                  </span>
                </div>
                <div className="rf-stack-sm" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <button onClick={() => runPayment(true)} disabled={overlaying} style={{ flex: 1, minWidth: 180, fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#1F8A5B", color: "#F6F1E7", border: "2px solid #101010", padding: 15, cursor: "pointer", boxShadow: "4px 4px 0 #101010" }}>SIMULATE SUCCESS ✓</button>
                  <button onClick={() => runPayment(false)} disabled={overlaying} style={{ flex: 1, minWidth: 180, fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#C0392B", color: "#F6F1E7", border: "2px solid #101010", padding: 15, cursor: "pointer", boxShadow: "4px 4px 0 #101010" }}>SIMULATE FAILURE ✕</button>
                </div>
                <button onClick={goShipping} style={{ alignSelf: "flex-start", background: "none", border: "2px solid #101010", padding: "11px 20px", fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em", color: "#101010", cursor: "pointer" }}>← BACK TO SHIPPING</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <aside className="rf-sticky" style={{ position: "sticky", top: 90, order: narrow ? -1 : 0, border: "2px solid #101010", background: "#FFFDF8", boxShadow: "10px 10px 0 #101010", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 22px", borderBottom: "2px solid #101010" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.04em" }}>ORDER · {count} {count === 1 ? "ITEM" : "ITEMS"}</span>
          </div>
          <div style={{ padding: "8px 22px", maxHeight: 320, overflowY: "auto" }}>
            {lines.map((l) => (
              <div key={l.key} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #E7DFCE" }}>
                <div style={{ position: "relative", width: 52, height: 64, flexShrink: 0, background: "#ECE5D6", border: "2px solid #101010" }}>
                  <span style={{ position: "absolute", top: -9, right: -9, background: "#101010", color: "#F6F1E7", minWidth: 20, height: 20, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{l.qty}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, textTransform: "uppercase", lineHeight: 1 }}>{l.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#6B6357" }}>Size {l.size}</span>
                </div>
                <span style={{ fontWeight: 900, fontSize: 14, color: "#F97B0C", whiteSpace: "nowrap" }}>{l.total}</span>
              </div>
            ))}
          </div>
          {/* Discount code. What comes back is a quote — POST /orders reprices it. */}
          {!placed && (
            <div style={{ padding: "16px 22px", borderTop: "2px solid #101010", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={lbl}>DISCOUNT CODE</span>
              {applied ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, border: "2px solid #101010", background: "#F97B0C", padding: "10px 12px" }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1 }}>{applied.code}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#101010", opacity: 0.75, lineHeight: 1.4 }}>{applied.description || "Applied to this order"}</span>
                  </span>
                  <button type="button" onClick={removeCode} disabled={codeLocked} style={{ flexShrink: 0, background: "none", border: "none", padding: 0, fontFamily: "Archivo, sans-serif", fontWeight: 900, fontSize: 10, letterSpacing: "0.14em", color: "#101010", cursor: codeLocked ? "not-allowed" : "pointer", textDecoration: "underline", textUnderlineOffset: 3, opacity: codeLocked ? 0.5 : 1 }}>REMOVE</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCode(); } }}
                    disabled={codeLocked}
                    placeholder="ENTER CODE"
                    aria-label="Discount code"
                    style={{ ...field, flex: 1, minWidth: 0, textTransform: "uppercase", letterSpacing: "0.08em", opacity: codeLocked ? 0.55 : 1 }}
                  />
                  <button type="button" onClick={applyCode} disabled={codeLocked || !codeInput.trim()} style={{ flexShrink: 0, fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "0 18px", cursor: codeLocked || !codeInput.trim() ? "not-allowed" : "pointer", opacity: codeLocked || !codeInput.trim() ? 0.5 : 1 }}>{applying ? "…" : "APPLY"}</button>
                </div>
              )}
              {codeError && <span style={{ fontSize: 12, fontWeight: 700, color: "#C0392B", border: "2px solid #C0392B", background: "#FBEAE7", padding: 10, lineHeight: 1.5 }}>{codeError}</span>}
            </div>
          )}

          <div style={{ padding: "18px 22px", borderTop: "2px solid #101010", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#6B6357" }}><span>Subtotal</span><span>{subtotalFmt}</span></div>
            {discountAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 800, color: "#F97B0C" }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Discount{discountCode ? ` · ${discountCode}` : ""}</span>
                <span style={{ whiteSpace: "nowrap" }}>−{peso(discountAmount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: "#6B6357" }}><span>Shipping</span><span>{shipFee === 0 ? "FREE" : peso(shipFee)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Anton, sans-serif", fontSize: 22, borderTop: "2px solid #101010", paddingTop: 12 }}><span>TOTAL</span><span style={{ color: "#F97B0C" }}>{peso(total)}</span></div>
            {/* A deferred code has no quote to show yet, so say plainly that the figure
                above is the before-discount one — never let it read as the final charge. */}
            {!placed && applied?.deferred && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#6B6357", lineHeight: 1.5 }}>
                {applied.code} comes off when you pay — this total doesn’t include it yet.
              </span>
            )}
          </div>
        </aside>
      </section>

      {/* Processing overlay. Kept mounted so it can fade; `visibility` (not display)
          because it must also leave the tab order while hidden. */}
      <div aria-hidden={!overlaying} style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(16,16,16,0.6)", opacity: overlaying ? 1 : 0, visibility: overlaying ? "visible" : "hidden", pointerEvents: overlaying ? "auto" : "none", transition: "opacity 0.25s, visibility 0.25s" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ width: 54, height: 54, border: "5px solid rgba(246,241,231,0.25)", borderTopColor: "#F97B0C", borderRadius: 999, animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.1em", color: "#F6F1E7" }}>PROCESSING PAYMENT…</span>
        </div>
      </div>

      {/* Result modal */}
      <div role="dialog" aria-modal="true" aria-hidden={!resulting} style={{ position: "fixed", inset: 0, zIndex: 160, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(16,16,16,0.6)", opacity: resulting ? 1 : 0, visibility: resulting ? "visible" : "hidden", pointerEvents: resulting ? "auto" : "none", transition: "opacity 0.25s, visibility 0.25s" }}>
        <div style={{ width: "min(400px, 100%)", background: "#F6F1E7", border: "2px solid #101010", boxShadow: `12px 12px 0 ${failed ? "#C0392B" : "#1F8A5B"}`, transform: resulting ? "scale(1)" : "scale(0.9)", transition: "transform 0.3s cubic-bezier(.2,.9,.3,1.2)", textAlign: "center", padding: "34px 28px 28px", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ width: 66, height: 66, margin: "0 auto 18px", borderRadius: 16, background: failed ? "#C0392B" : "#1F8A5B", border: "2px solid #101010", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 34, color: "#F6F1E7", lineHeight: 1 }}>{failed ? "✕" : "✓"}</span>
          </div>
          <h2 style={{ fontFamily: "Anton, sans-serif", fontSize: 32, margin: "0 0 8px", textTransform: "uppercase", lineHeight: 0.92 }}>{failed ? "Payment failed." : "Order placed!"}</h2>
          <p style={{ margin: "0 0 20px", fontSize: 14, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>
            {failed
              ? "Your payment didn’t go through (simulated). Nothing was charged, no order was placed, and your cart is exactly as you left it."
              : "Salamat! Your order is saved and the stock is set aside. The card charge is the only simulated part."}
          </p>

          {/* The real row the API just wrote — not a made-up confirmation. */}
          {!failed && placed?.order_number && (
            <div style={{ border: "2px solid #101010", background: "#FFFDF8", padding: "14px 16px", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.16em", color: "#6B6357" }}>ORDER NUMBER</span>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, letterSpacing: "0.02em" }}>{placed.order_number}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.16em", color: "#6B6357" }}>TOTAL PAID</span>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, color: "#F97B0C" }}>{placed.total_formatted}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.16em", color: "#6B6357" }}>PAYMENT</span>
                <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {[placed.payment_method, placed.payment_status].filter(Boolean).join(" · ")}
                </span>
              </div>
              {placed.payment_ref && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 9, letterSpacing: "0.16em", color: "#6B6357" }}>REFERENCE</span>
                  <span style={{ fontWeight: 700, fontSize: 11, color: "#6B6357" }}>{placed.payment_ref}</span>
                </div>
              )}
            </div>
          )}

          {/* Why the server refused, in its own words. */}
          {failed && checkoutError && (
            <div style={{ border: "2px solid #C0392B", background: "#FBEAE7", color: "#C0392B", padding: "12px 14px", marginBottom: 20, fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>{checkoutError}</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {failed ? (
              <>
                <button onClick={() => { setPhase("form"); setCheckoutError(""); }} style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: 15, cursor: "pointer", boxShadow: "4px 4px 0 #101010" }}>TRY AGAIN</button>
                <Link to="/cart" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: 15 }}>BACK TO CART</Link>
              </>
            ) : (
              <>
                {/* Straight to My Orders, not the account landing page — the order
                    they just placed, and its stage tracker, are the only reason they
                    tapped a button labelled TRACK ORDER. */}
                <Link to="/account?tab=orders" className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: 15, boxShadow: "4px 4px 0 #F97B0C" }}>TRACK ORDER</Link>
                <Link to="/products" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: 15 }}>KEEP SHOPPING</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import logo from "/reefer-logo.jpg";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";
import { useProduct, useProducts } from "../hooks/useProducts";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import FavoriteButton from "../components/product/FavoriteButton";
import Reviews from "../components/product/Reviews";
import Seo, { withBrand } from "../components/Seo";
import SignInPrompt from "../components/SignInPrompt";
import ImageZoom from "../components/product/ImageZoom";
import { stockAlertApi } from "../api/stockAlertApi";

// Square, matching the catalogue's shot ratio, so a thumbnail shows the same garment
// the big frame does instead of a cropped core of it.
const CREAM_THUMB = { width: 84, aspectRatio: "1 / 1", border: "2px solid #101010", background: "#ECE5D6", cursor: "pointer", padding: 0, display: "block", position: "relative" };

const TYPE_LABEL = { tee: "TEES", hoodie: "HOODIES", shorts: "SHORTS", underwear: "BASE LAYER", bag: "BAGS", socks: "SOCKS" };
const AUD_LABEL = { men: "MEN'S", women: "WOMEN'S", unisex: "UNISEX", accessories: "ACCESSORIES" };

// The API has no print/care/origin columns, so these ride along client-side like
// the mockup does — FABRIC only backfills when the product carries no material.
const FABRIC = {
  tee: "100% combed cotton, 220gsm. Pre-shrunk, garment-washed.",
  hoodie: "380gsm cotton-poly fleece, brushed interior. Ribbed cuffs + hem.",
  shorts: "Quick-dry nylon shell with mesh lining.",
  underwear: "Soft-rib combed cotton, bonded waistband.",
  bag: "Water-resistant coated canvas, taped seams.",
  socks: "Combed-cotton blend with arch support.",
};
const PRINT = {
  tee: "1–2 colour halftone screen print, hand-pulled in Quezon City.",
  hoodie: "Tonal halftone wave, screen printed across the chest.",
  shorts: "Screened side hit + woven hem patch.",
  underwear: "Woven Reefer hem tag, no front print.",
  bag: "Screened wave graphic, one side.",
  socks: "Woven wave at the cuff.",
};

// nominal flat length (inches) per size — drives the proportional compare scale
const SIZE_LEN = { XS: 26, S: 27.5, M: 29, L: 30.5, XL: 31.5, "2XL": 32.5, "3XL": 33.5, OS: 30 };

const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH");

// These stay mounted so the fade can play, so `visibility` has to do the closing:
// pointer-events alone still leaves the buttons focusable, and tabbing onto the
// invisible "CONFIRM · ADD TO CART" would post a real cart line.
const overlay = (open, z, dim) => ({
  position: "fixed", inset: 0, zIndex: z, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  background: `rgba(16,16,16,${dim})`, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
  visibility: open ? "visible" : "hidden", transition: "opacity 0.25s, visibility 0.25s",
});

const errorBox = { border: "2px solid #C0392B", background: "#FBEAE7", color: "#C0392B", padding: "14px 16px", fontWeight: 700, fontSize: 13 };

function stars(avg) {
  const n = Math.round(avg || 0);
  return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
}

/** Qty stepper. Local hover state stands in for the mockup's style-hover. */
function StepButton({ onClick, disabled, edge, children }) {
  const [hover, setHover] = useState(false);
  const lit = hover && !disabled;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46, minHeight: 52, border: "none", [edge]: "2px solid #101010",
        background: lit ? "#101010" : "none", color: lit ? "#F6F1E7" : "#101010",
        fontSize: 20, fontWeight: 900, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1, transition: "background 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { product, loading, notFound, error } = useProduct(slug);
  const { products: catalog } = useProducts();
  const { user, loading: authLoading } = useAuth();
  const { add } = useCart();
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  // A count, not a flag: the alert replays its shake on every press, and a boolean
  // that is already true would make the second press look like nothing happened.
  const [sizeError, setSizeError] = useState(0);
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState("");
  const [activeThumb, setActiveThumb] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [thankOpen, setThankOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  // The zoom viewer is mounted only while open and remounted per opening (see `nonce`),
  // so each visit starts at 1x centred without an effect reaching in to reset it.
  const [zoom, setZoom] = useState(null); // { src, nonce } | null
  const openZoom = (src) => setZoom((z) => ({ src, nonce: (z?.nonce ?? 0) + 1 }));
  // Which button raised the sign-in gate — the wording has to name what they were
  // actually trying to do, and "add to your cart" is wrong for a direct purchase.
  const [gateIntent, setGateIntent] = useState("cart"); // cart | buy
  const [compareMode, setCompareMode] = useState(false);
  const [comparePicks, setComparePicks] = useState([]);
  const [compareFocus, setCompareFocus] = useState(1);
  // Sizes this visit has an alert on — keyed by size so flipping back to one
  // already asked about still shows the confirmation.
  const [alertedSizes, setAlertedSizes] = useState([]);
  const [alertBusy, setAlertBusy] = useState(false);
  const [alertError, setAlertError] = useState("");
  const sizeRowRef = useRef(null);

  // The gallery reflow (main image on top, thumbs as a strip below) can't be an
  // inline style, and index.css has no rule for it — so measure it here instead.
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 980px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 980px)");
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // "More from the drop" re-enters this same route, so wipe the previous pick.
  useEffect(() => {
    setSize(null);
    setQty(1);
    setSizeError(0);
    setCartError("");
    setActiveThumb(0);
    setDescOpen(false);
    setConfirmOpen(false);
    setThankOpen(false);
    setCompareMode(false);
    setComparePicks([]);
    setAlertedSizes([]);
    setAlertBusy(false);
    setAlertError("");
  }, [slug]);

  // Falls back to the bare brand while the fetch is in flight so the tab doesn't
  // keep advertising the product we just navigated away from.
  const pageTitle = product ? withBrand(product.name) : "REEFER MNL";

  const shell = (children) => (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Seo title={pageTitle} description={product?.blurb} />
      <Nav />
      {children}
      <Footer />
    </div>
  );

  if (loading) return shell(<p style={{ textAlign: "center", padding: "180px 0", color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING…</p>);
  if (notFound)
    return shell(
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "170px 32px 120px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <img src={logo} alt="" style={{ width: 72, height: 72, borderRadius: 16, animation: "bob 5s ease-in-out infinite" }} />
        <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(40px, 7vw, 72px)", margin: 0, textTransform: "uppercase" }}>Gone with the tide.</h1>
        <p style={{ margin: 0, color: "#6B6357", fontSize: 15 }}>That drop isn't here. Back to the shop before the next one sells out.</p>
        <Link to="/products" className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "14px 26px", boxShadow: "5px 5px 0 #F97B0C" }}>
          BROWSE ALL PRODUCTS
        </Link>
      </div>
    );
  if (error || !product) return shell(<p style={{ textAlign: "center", padding: "180px 0", color: "#C0392B", fontWeight: 700 }}>Couldn't load this product.</p>);

  // Exit ramp: same type first (a tee suggests tees), then anything else.
  const related = catalog
    .filter((p) => p.slug !== product.slug)
    .sort((a, b) => (b.type === product.type) - (a.type === product.type))
    .slice(0, 4);

  const typeLabel = TYPE_LABEL[product.type] || (product.type || "").toUpperCase();
  const audienceLabel = AUD_LABEL[product.audience] || (product.audience || "").toUpperCase();

  const details = [
    { k: "FABRIC", v: product.material || FABRIC[product.type] },
    { k: "PRINT", v: PRINT[product.type] },
    { k: "CARE", v: "Cold wash inside-out. Hang dry. Don’t iron the print." },
    { k: "ORIGIN", v: "Designed & printed in Quezon City, PH." },
  ].filter((d) => d.v);

  // Gallery: front (shared with the shop card) + back + detail.
  const views = [
    { key: "front", placeholder: product.placeholder || `Drop the ${product.name} shot`, src: product.image },
    { key: "back", placeholder: "Drop the back shot" },
    { key: "detail", placeholder: "Drop a detail shot" },
  ];
  const active = Math.min(activeThumb, views.length - 1);

  // Per-size stock. `variants` only rides along on the show endpoint; fall back to
  // the flat `sizes` list (every size selectable) when it isn't there.
  const stockBySize = {};
  (product.variants || []).forEach((v) => {
    stockBySize[v.size] = v.stock;
  });

  // Weight and flat dimensions per size, straight off the inventory record. Only the
  // sizes actually offered, and only these two fields — the same variant row also
  // carries warehouse, shelf and allocation figures, which are nobody's business out
  // here and are not sent to the client in the first place.
  const spec = (product.variants || [])
    .filter((v) => (product.sizes || []).includes(v.size))
    .filter((v) => v.weight_grams != null || v.dimensions)
    .sort((a, b) => (product.sizes || []).indexOf(a.size) - (product.sizes || []).indexOf(b.size));
  const sizes = product.sizes?.length ? product.sizes : (product.variants || []).map((v) => v.size);
  const soldOut = (s) => stockBySize[s] === 0;
  const cap = size && stockBySize[size] != null ? stockBySize[size] : null;
  const sizeSoldOut = !!size && soldOut(size);
  const alerted = !!size && alertedSizes.includes(size);

  const ratingCount = product.rating_count || 0;
  const ratingAverageLabel = ratingCount ? Number(product.rating_average).toFixed(1) : "—";
  const ratingCountLabel = ratingCount === 0 ? "No ratings yet" : ratingCount === 1 ? "1 rating" : `${ratingCount} ratings`;

  // Interpolating blurb straight in put the literal word "null" at the top of the
  // description for any product created in the stock manager, whose Add Product
  // form has no blurb field. The boilerplate half stands on its own without it.
  const blurbText = (product.blurb || "").trim();
  const descFull = `${blurbText ? blurbText + " " : ""}Cut for an everyday relaxed fit and printed in small batches in Quezon City — once this colourway sells out, it’s gone for good.`;
  const descClamped = descFull.length > 138;
  const descText = descOpen || !descClamped ? `${descFull} ` : `${descFull.slice(0, 138).trim()}… `;

  const compareOn = compareMode && comparePicks.length === 2;
  const compareMax = compareOn ? Math.max(SIZE_LEN[comparePicks[0]] || 30, SIZE_LEN[comparePicks[1]] || 30) : 1;
  const compareStatus =
    comparePicks.length === 0 ? "TAP A SIZE ABOVE ↑" : comparePicks.length === 1 ? "TAP A SIZE TO COMPARE ↑" : "TAP A SIZE BUTTON TO VIEW · CLICK IMAGE TO RESET";

  const toggleCompare = () => {
    setCompareMode((m) => !m);
    setComparePicks([]);
    setCompareFocus(1);
  };

  const pickCompare = (sz) => {
    setComparePicks((prev) => {
      const picks = prev.length >= 2 ? [] : prev.slice();
      if (!picks.includes(sz)) picks.push(sz);
      return picks;
    });
    setCompareFocus(1);
  };

  /**
   * Refuse the press and point at what's missing.
   *
   * The message lives with the size buttons — that's where the ↑ points and where the
   * fix is — but the shopper's eyes are ~150px lower, on the CTA they just pressed, so
   * it has to carry enough weight to be caught in peripheral vision. On a stacked
   * phone layout the size row can be scrolled off entirely, hence the bring-into-view;
   * it's guarded so an already-visible row never jumps under anyone.
   */
  const askForSize = () => {
    setSizeError((n) => n + 1);
    const row = sizeRowRef.current;
    if (!row) return;
    const box = row.getBoundingClientRect();
    if (box.top < 80 || box.bottom > window.innerHeight) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const pickSize = (s) => {
    setSize(s);
    setSizeError(0);
    setCartError("");
    setAlertError("");
    const stock = stockBySize[s];
    if (stock != null && stock > 0) setQty((q) => Math.min(q, stock));
  };

  // Fabric, care, origin, the per-size measurement table and the fit note.
  // Declared once and placed by breakpoint: the gallery column on desktop,
  // under the buy controls when the layout stacks.
  const detailsBlock = (
    <div style={{ borderTop: "2px solid #101010", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.04em" }}>THE DETAILS</span>
        {details.map((d) => (
          <div key={d.k} style={{ display: "flex", gap: 12, fontSize: 14, lineHeight: 1.5 }}>
            <span style={{ fontWeight: 900, letterSpacing: "0.08em", color: "#6B6357", minWidth: 92, flexShrink: 0 }}>{d.k}</span>
            <span style={{ color: "#3A362F" }}>{d.v}</span>
          </div>
        ))}
      </div>

      {/* Measurements per size. Flat width x length in cm, and the shipping
          weight — the two things people ask before buying online, and the two
          the warehouse record can answer exactly. */}
      {spec.length > 0 && (
        <div className="rf-scroll-x" style={{ border: "2px solid #101010", background: "#FFFDF8" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 300 }}>
            <thead>
              <tr style={{ background: "#ECE5D6" }}>
                {["SIZE", "FLAT (CM)", "WEIGHT"].map((h, i) => (
                  <th
                    key={h}
                    style={{ textAlign: i === 0 ? "left" : "right", padding: "10px 14px", fontWeight: 900, fontSize: 10, letterSpacing: "0.14em", color: "#6B6357", borderBottom: "2px solid #101010" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.map((v) => (
                <tr key={v.size} style={{ borderBottom: "1px solid #E7DFCE" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "Anton, sans-serif", fontSize: 15 }}>{v.size}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#3A362F" }}>
                    {v.dimensions || "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#3A362F" }}>
                    {v.weight_grams != null ? `${Math.round(v.weight_grams)} g` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {product.fit_name && (
        <div style={{ background: "#101010", color: "#F6F1E7", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.04em", color: "#F97B0C" }}>{product.fit_name}</span>
          <span style={{ fontSize: 13, lineHeight: 1.55, color: "#D8D2C6" }}>{product.fit_desc}</span>
        </div>
      )}
    </div>
  );

  const signInPath = `/sign-in?return=${encodeURIComponent(`/product/${product.slug}`)}`;

  const addToCart = () => {
    // A stored token is still being verified. Adding now could file a signed-in
    // shopper's pick in the guest cart, where only their next sign-in would find it.
    if (authLoading) return;
    // Signed out: ask before filing anything. The guest cart still exists and still
    // merges at sign-in, so nothing is lost if they choose to keep browsing — but a
    // shopper who never signs in used to build a cart that quietly evaporated with the
    // tab, and only discovered the account requirement at checkout. Asking here costs
    // one dismissible dialog and moves that discovery to the first click.
    if (!user) {
      setGateIntent("cart");
      setGateOpen(true);
      return;
    }
    if (!size) {
      askForSize();
      return;
    }
    setCartError("");
    setConfirmOpen(true);
  };

  /**
   * Straight to checkout with this one item, deliberately without touching the cart.
   *
   * The line rides along in router state rather than being filed as a cart line and
   * ticked: a direct purchase that quietly unticked the rest of someone's cart — or
   * that left its item behind when they backed out — would be a worse trade than the
   * few branches this costs Checkout. The server prices whatever /orders is sent, so
   * a line that was never in the cart is ordered exactly like one that was.
   *
   * No confirm step, unlike Add to cart: checkout IS the confirmation, and it is one
   * tap away from the shopper's own back button.
   */
  const buyItNow = () => {
    if (authLoading) return;
    if (!user) {
      setGateIntent("buy");
      setGateOpen(true);
      return;
    }
    if (!size) {
      askForSize();
      return;
    }
    navigate("/checkout", {
      state: {
        buyNow: {
          slug: product.slug,
          size,
          qty,
          // Name and price are for the summary panel only; POST /orders re-resolves
          // both from the database, so a stale figure here can never be charged.
          name: product.name,
          price: product.price,
        },
      },
    });
  };

  const confirmAdd = async () => {
    if (!size) return;
    setAdding(true);
    setCartError("");
    try {
      await add(product.slug, size, qty); // POST /v1/cart/items, or localStorage while signed out
      setConfirmOpen(false);
      setThankOpen(true);
    } catch (err) {
      // A hydrated user with a dead token: send them back through sign-in.
      if (err?.status === 401) {
        navigate(signInPath);
        return;
      }
      // Otherwise keep the confirm open and say why — e.g. "Only 2 left in that size."
      const field = err?.errors && Object.values(err.errors)[0];
      setCartError(field?.[0] || err?.message || "Could not add that to your cart.");
    } finally {
      setAdding(false);
    }
  };

  const notifyMe = async () => {
    if (authLoading || !size || alertBusy) return;
    // Unlike the cart, an alert has nowhere to land without an account — there is
    // no address to email and nothing to tie it to.
    if (!user) {
      navigate(signInPath);
      return;
    }
    setAlertBusy(true);
    setAlertError("");
    try {
      await stockAlertApi.create(product.slug, size);
      setAlertedSizes((prev) => (prev.includes(size) ? prev : [...prev, size]));
    } catch (err) {
      // 409 = they already asked for this exact variant. Same answer as success.
      if (err?.status === 409) {
        setAlertedSizes((prev) => (prev.includes(size) ? prev : [...prev, size]));
      } else if (err?.status === 401) {
        navigate(signInPath);
      } else {
        const field = err?.errors && Object.values(err.errors)[0];
        setAlertError(field?.[0] || err?.message || "Couldn't set that alert. Try again.");
      }
    } finally {
      setAlertBusy(false);
    }
  };

  return shell(
    <>
    <section style={{ maxWidth: 1240, margin: "0 auto", padding: "112px 32px 60px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: 8, fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: "#6B6357", marginBottom: 22, flexWrap: "wrap" }}>
        <Link to="/shop" className="rf-footlink" style={{ color: "#6B6357", textDecoration: "none" }}>SHOP</Link>
        <span>/</span>
        <Link to={`/products?type=${product.type}`} className="rf-footlink" style={{ color: "#6B6357", textDecoration: "none" }}>{typeLabel}</Link>
        <span>/</span>
        <span style={{ color: "#101010" }}>{product.name}</span>
      </div>

      <div className="rf-2col" style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 44, alignItems: "start" }}>
        {/* Left column: the gallery, and on a wide screen the spec block too.
            Square photos left ~780px of nothing under the gallery while the buy
            column ran on past it, so the reference material moves in to fill it.
            Stacked layouts keep the old order — see the note by `detailsBlock`. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ display: "flex", gap: 16, alignItems: narrow ? "stretch" : "flex-start", flexDirection: narrow ? "column" : "row" }}>
          <div style={{ display: "flex", flexDirection: narrow ? "row" : "column", gap: 12, width: narrow ? "auto" : 84, flexShrink: 0, order: narrow ? 2 : 0 }}>
            {views.map((v, i) => (
              <button
                key={v.key}
                onClick={() => setActiveThumb(i)}
                aria-label={`View ${v.key}`}
                style={{ ...CREAM_THUMB, boxShadow: i === active ? "4px 4px 0 #F97B0C" : "none", transition: "box-shadow 0.15s" }}
              >
                {v.src && <img src={v.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#FFFFFF" }} />}
              </button>
            ))}
          </div>
          <div style={{ position: "relative", flex: 1, background: views[active].src ? "#FFFFFF" : "#ECE5D6", border: "2px solid #101010", boxShadow: "10px 10px 0 #101010" }}>
            {/* Square and `contain`, matching how the catalogue is shot. This frame was
                4:5 with `cover`, which sliced ~24% off the width of every photo — on a
                tee that is both sleeves gone. */}
            <div style={{ width: "100%", aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center", color: "#A99F8C", fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", textAlign: "center", padding: views[active].src ? 0 : 24, opacity: compareOn ? 0 : 1 }}>
              {views[active].src ? (
                <button
                  type="button"
                  onClick={() => openZoom(views[active].src)}
                  aria-label={`Zoom into ${product.name}`}
                  style={{ width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in", display: "block" }}
                >
                  <img src={views[active].src} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                </button>
              ) : (
                views[active].placeholder
              )}
            </div>

            {/* Affordance, not decoration: nothing else on the page says the shot can be
                opened, and a cursor change alone never reaches a touch device. Hidden
                while comparing so it can't sit over the size overlay. */}
            {views[active].src && !compareOn && (
              <span
                aria-hidden="true"
                style={{ position: "absolute", bottom: 12, right: 12, display: "flex", alignItems: "center", gap: 6, background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "6px 10px", fontWeight: 900, fontSize: 10, letterSpacing: "0.16em", pointerEvents: "none", zIndex: 3 }}
              >
                <span style={{ fontSize: 12, lineHeight: 1 }}>⌕</span> TAP TO ZOOM
              </span>
            )}

            {/* Compare overlay: two frames scaled by nominal flat length. */}
            {compareOn && (
              <div onClick={() => setComparePicks([])} style={{ position: "absolute", inset: 0, zIndex: 4, background: "#ECE5D6", cursor: "pointer" }}>
                {comparePicks.map((sz, i) => {
                  const r = (SIZE_LEN[sz] || 30) / compareMax;
                  return (
                    <div
                      key={sz}
                      // Width is deliberately 4/5 of the height. These frames used to
                      // take both dimensions from a 4:5 container and so came out
                      // garment-shaped; the container is square now (to stop cropping
                      // the photos), so the silhouette has to be stated here instead of
                      // inherited, or a tee reads as a square swatch.
                      style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: `${r * 80}%`, height: `${r * 100}%`, border: "2px solid #101010", background: "#FFFDF8", opacity: i === compareFocus ? 1 : 0.25, zIndex: i === compareFocus ? 3 : 2, transition: "opacity 0.2s" }}
                    />
                  );
                })}
                <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 6 }}>
                  {comparePicks.map((sz, i) => (
                    <button
                      key={sz}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompareFocus(i);
                      }}
                      style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em", color: "#101010", border: "2px solid #101010", padding: "4px 12px", cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1.1, background: i === compareFocus ? "#F97B0C" : "#F6F1E7", opacity: i === compareFocus ? 1 : 0.65 }}
                    >
                      SIZE {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.tag && (
              <span style={{ position: "absolute", top: 14, left: 14, background: "#F97B0C", color: "#101010", fontWeight: 900, fontSize: 11, letterSpacing: "0.16em", padding: "6px 12px", border: "2px solid #101010", pointerEvents: "none", zIndex: 5 }}>
                {product.tag}
              </span>
            )}
          </div>
        </div>

        {!narrow && detailsBlock}
        </div>

        {/* Info */}
        {/* Deliberately NOT sticky, unlike the summary rails on cart/checkout. Once the
            spec block moved into the gallery column this one became shorter than the
            viewport, so sticky finally engaged — and the two columns visibly came apart
            while scrolling. The page reads as one thing when they travel together. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.2em", color: "#F97B0C" }}>
              {audienceLabel} · {typeLabel}
            </span>
            <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(38px, 5vw, 64px)", margin: "6px 0 0", textTransform: "uppercase", lineHeight: 0.9 }}>{product.name}</h1>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 34, color: "#F97B0C" }}>{product.price_formatted}</span>
            {/* The mockup showed a struck-through "was" price derived as price * 1.6.
                That is fine in a design comp with dummy data, but on a live store it
                advertises a saving against a price nothing was ever sold at. Bring it
                back only alongside a real compare-at price on the product. */}
            <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.1em", color: "#101010", background: "#F97B0C", border: "2px solid #101010", padding: "3px 9px" }}>{product.stock_label}</span>
          </div>

          {/* Rating summary — public, and shown even at zero so the count anchors
              the jump down to the reviews. */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 17, letterSpacing: 2, color: "#F97B0C", lineHeight: 1 }}>{stars(product.rating_average)}</span>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.02em" }}>{ratingAverageLabel}</span>
            <a href="#reviews" className="rf-footlink" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#6B6357", textDecoration: "underline" }}>{ratingCountLabel}</a>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.04em" }}>DESCRIPTIONS</span>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "#3A362F" }}>
              {descText}
              {descClamped && (
                <button onClick={() => setDescOpen((o) => !o)} style={{ border: "none", background: "none", color: "#F97B0C", fontWeight: 700, cursor: "pointer", padding: "0 0 0 6px", fontSize: 14 }}>
                  {descOpen ? "less" : "more"}
                </button>
              )}
            </p>
          </div>

          {/* Size selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.16em" }}>SELECT SIZE</span>
              <Link to="/sizing-guide" style={{ fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", color: "#F97B0C", textDecoration: "none" }}>SIZING GUIDE →</Link>
            </div>
            {/* Ringed while the complaint is live: the message says what's wrong, the
                ring says where. Outline rather than border so nothing reflows. */}
            <div
              ref={sizeRowRef}
              style={{
                display: "flex", flexWrap: "wrap", gap: 8,
                // Hugs the buttons instead of the column, so the ring frames the
                // choices rather than a band of empty cream. Still wraps normally:
                // fit-content is capped by the space available.
                width: "fit-content", maxWidth: "100%",
                outline: sizeError ? "2px dashed #C0392B" : "none",
                outlineOffset: 5,
              }}
            >
              {sizes.map((s) => {
                const out = soldOut(s);
                const on = compareMode ? comparePicks.includes(s) : size === s;
                return (
                  <button
                    key={s}
                    onClick={() => (compareMode ? pickCompare(s) : pickSize(s))}
                    // Sold-out sizes stay struck through and muted, but stay
                    // clickable: picking one swaps ADD TO CART for the alert.
                    aria-label={out ? `${s} — sold out` : undefined}
                    title={out ? "Sold out — pick it to get an alert when it's back" : undefined}
                    style={{
                      fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.04em", minWidth: 52, padding: "12px 14px",
                      cursor: "pointer",
                      background: on ? "#101010" : "#FFFDF8",
                      color: on ? (out ? "#C9C0B0" : "#F6F1E7") : out ? "#C9C0B0" : "#101010",
                      border: `2px solid ${out && !on ? "#C9C0B0" : "#101010"}`,
                      textDecoration: out ? "line-through" : "none",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {/* Keyed on the count so React remounts it and the shake replays every
                press. role="alert" makes a screen reader announce it, which the old
                silent <span> never did. */}
            {sizeError > 0 && (
              <div
                key={sizeError}
                role="alert"
                className="rf-nudge"
                style={{
                  display: "flex", alignItems: "center", gap: 10, alignSelf: "flex-start",
                  fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.05em",
                  background: "#C0392B", color: "#FFF4F2",
                  border: "2px solid #101010", padding: "11px 15px",
                  boxShadow: "4px 4px 0 #101010",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>↑</span>
                PICK A SIZE FIRST
              </div>
            )}
            <button onClick={toggleCompare} style={{ alignSelf: "flex-start", fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.08em", background: compareMode ? "#F97B0C" : "#101010", color: compareMode ? "#101010" : "#F6F1E7", border: "2px solid #101010", padding: "9px 16px", cursor: "pointer", boxShadow: "3px 3px 0 #F97B0C", marginTop: 4 }}>
              {compareMode ? "CANCEL COMPARE" : "COMPARE SIZE"}
            </button>
            {compareMode && <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#F97B0C" }}>{compareStatus}</span>}
          </div>

          {/* Qty + favorites */}
          <div style={{ display: "flex", gap: 12, alignItems: "stretch", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", border: "2px solid #101010" }}>
              <StepButton edge="borderRight" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</StepButton>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, minWidth: 44, textAlign: "center" }}>{qty}</span>
              <StepButton edge="borderLeft" onClick={() => setQty((q) => (cap ? Math.min(cap, q + 1) : q + 1))} disabled={cap != null && qty >= cap}>+</StepButton>
            </div>
            <FavoriteButton slug={product.slug} />
          </div>

          {/* Same slot, same box: a sold-out size can't be bought, so the CTA
              becomes the waitlist instead of a dead disabled button. */}
          {sizeSoldOut ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerted ? (
                <div role="status" style={{ width: "100%", fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: 17, boxShadow: "6px 6px 0 #F97B0C", textAlign: "center", boxSizing: "border-box" }}>
                  WE’LL EMAIL YOU ✓
                </div>
              ) : (
                <button onClick={notifyMe} disabled={alertBusy || authLoading} className="rf-cta" style={{ width: "100%", fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.06em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: 17, cursor: alertBusy ? "progress" : "pointer", boxShadow: "6px 6px 0 #101010", opacity: alertBusy ? 0.7 : 1 }}>
                  {alertBusy ? "SETTING ALERT…" : "NOTIFY ME WHEN IT’S BACK"}
                </button>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", color: "#6B6357", lineHeight: 1.5 }}>
                {alerted
                  ? `Size ${size} is sold out — we’ll email you the moment it lands back.`
                  : `Size ${size} is sold out. Get the email the moment it restocks.`}
              </span>
              {alertError && <div style={errorBox}>{alertError}</div>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={addToCart} disabled={adding || authLoading} className="rf-cta" style={{ width: "100%", fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: 17, cursor: "pointer", boxShadow: "6px 6px 0 #F97B0C", opacity: adding ? 0.7 : 1 }}>
                {adding ? "ADDING…" : size ? `ADD TO CART — ${product.price_formatted}` : "ADD TO CART"}
              </button>
              {/* Second, not first: most shoppers here are still building a basket,
                  and the drop is sold as a set. Orange-on-black keeps it clearly a
                  peer of the CTA above rather than a link buried under it. */}
              <button onClick={buyItNow} disabled={adding || authLoading} className="rf-cta" style={{ width: "100%", fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.06em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: 17, cursor: "pointer", boxShadow: "6px 6px 0 #101010" }}>
                BUY IT NOW
              </button>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.02em", color: "#6B6357", lineHeight: 1.5 }}>
                Buy it now takes just this{qty > 1 ? ` ×${qty}` : ""} straight to checkout — your cart stays as it is.
              </span>
            </div>
          )}

          {cartError && !confirmOpen && <div style={errorBox}>{cartError}</div>}

          {/* Trust row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
            {["GCASH", "MAYA", "COD"].map((m) => (
              <span key={m} style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.14em", border: "2px solid #101010", padding: "6px 10px" }}>{m}</span>
            ))}
            <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: "0.1em", color: "#6B6357", padding: "6px 4px" }}>MNL 1–3 DAYS · PROVINCIAL 3–7</span>
          </div>

          {/* On a stacked layout the spec block stays here, under the buy
              controls — moving it above them would push ADD TO CART off the
              first screen on a phone. Wide screens render it in the gallery
              column instead, where the square photo leaves room. */}
          {narrow && detailsBlock}
        </div>
      </div>
    </section>

    {/* Ratings — full width, outside the two-column grid (the info column is sticky).
        Reviews first, then Related: reviews are about THIS product, Related is the
        exit ramp. */}
    <Reviews slug={product.slug} />

    {related.length > 0 && (
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "10px 32px 70px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderTop: "2px solid #101010", paddingTop: 22, marginBottom: 24 }}>
          <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(26px, 3.5vw, 44px)", margin: 0, textTransform: "uppercase" }}>
            More from the drop<span style={{ color: "#F97B0C" }}>.</span>
          </h2>
          <Link to="/products" style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.12em", color: "#101010", textDecoration: "none" }}>VIEW ALL →</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 22 }}>
          {related.map((r) => (
            <Link key={r.slug} to={`/product/${r.slug}`} className="rf-dropcard" style={{ textDecoration: "none", color: "#101010", border: "2px solid #101010", background: "#FFFDF8", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", background: "#ECE5D6", borderBottom: "2px solid #101010" }}>
                <div style={{ width: "100%", aspectRatio: "4 / 5", display: "flex", alignItems: "center", justifyContent: "center", color: "#A99F8C", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textAlign: "center", padding: 16 }}>
                  {r.placeholder || r.name}
                </div>
                {r.tag && (
                  <span style={{ position: "absolute", top: 10, left: 10, background: "#F97B0C", color: "#101010", fontWeight: 900, fontSize: 9, letterSpacing: "0.14em", padding: "5px 8px", border: "2px solid #101010" }}>{r.tag}</span>
                )}
              </div>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, textTransform: "uppercase", lineHeight: 1 }}>{r.name}</span>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 16, color: "#F97B0C", whiteSpace: "nowrap" }}>{r.price_formatted}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    )}

    {/* Confirm add-to-cart */}
    <div onClick={() => setConfirmOpen(false)} aria-hidden={!confirmOpen} style={overlay(confirmOpen, 130, 0.55)}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirm your pick" style={{ width: "min(420px, 100%)", background: "#F6F1E7", border: "2px solid #101010", boxShadow: "12px 12px 0 #101010", transform: confirmOpen ? "scale(1)" : "scale(0.9)", transition: "transform 0.28s cubic-bezier(.2,.9,.3,1.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "2px solid #101010" }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.04em" }}>CONFIRM YOUR PICK</span>
          <button onClick={() => setConfirmOpen(false)} aria-label="Close" style={{ background: "none", border: "2px solid #101010", width: 34, height: 34, fontSize: 15, fontWeight: 900, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 72, height: 72, flexShrink: 0, background: product.image ? "#FFFFFF" : "#ECE5D6", border: "2px solid #101010" }}>
              {product.image && <img src={product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 19, textTransform: "uppercase", lineHeight: 1 }}>{product.name}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6357" }}>{audienceLabel} · {typeLabel}</span>
              <span style={{ fontWeight: 900, fontSize: 16, color: "#F97B0C" }}>{product.price_formatted}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, border: "2px solid #101010", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.16em", color: "#6B6357" }}>SIZE</span>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, lineHeight: 1 }}>{size || "—"}</span>
            </div>
            <div style={{ flex: 1, border: "2px solid #101010", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.16em", color: "#6B6357" }}>QTY</span>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, lineHeight: 1 }}>{qty}</span>
            </div>
            <div style={{ flex: 1.3, border: "2px solid #101010", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, background: "#101010", color: "#F6F1E7" }}>
              <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.16em", color: "#F97B0C" }}>TOTAL</span>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 22, lineHeight: 1 }}>{peso(product.price * qty)}</span>
            </div>
          </div>
          {cartError && <div style={errorBox}>{cartError}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
            <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "none", color: "#101010", border: "2px solid #101010", padding: 14, cursor: "pointer" }}>GO BACK</button>
            <button onClick={confirmAdd} disabled={adding} style={{ flex: 1.4, fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: 14, cursor: "pointer", boxShadow: "4px 4px 0 #101010", opacity: adding ? 0.7 : 1 }}>
              {adding ? "ADDING…" : "CONFIRM · ADD TO CART"}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Thank-you */}
    <div aria-hidden={!thankOpen} style={overlay(thankOpen, 140, 0.6)}>
      <div role="dialog" aria-modal="true" aria-label="Added to cart" style={{ width: "min(400px, 100%)", background: "#F6F1E7", border: "2px solid #101010", boxShadow: "12px 12px 0 #F97B0C", transform: thankOpen ? "scale(1)" : "scale(0.9)", transition: "transform 0.3s cubic-bezier(.2,.9,.3,1.2)", textAlign: "center", padding: "34px 28px 28px" }}>
        <div style={{ width: 66, height: 66, margin: "0 auto 18px", borderRadius: 16, background: "#F97B0C", border: "2px solid #101010", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 34, color: "#101010", lineHeight: 1 }}>✓</span>
        </div>
        <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: 34, margin: "0 0 8px", textTransform: "uppercase", lineHeight: 0.92 }}>
          In the bag<span style={{ color: "#F97B0C" }}>.</span>
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>
          Your {size ? `${size} ` : ""}{product.name} (×{qty}) is in your cart. Ride the wave before it sells out.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => navigate("/cart")} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: 15, cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C" }}>GO TO CART →</button>
          <button onClick={() => setThankOpen(false)} style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em", background: "none", color: "#101010", border: "2px solid #101010", padding: 15, cursor: "pointer" }}>CONTINUE SHOPPING</button>
        </div>
      </div>
    </div>

    {/* Keyed on nonce so re-opening the same shot starts fresh at 1x, centred. */}
    {zoom && (
      <ImageZoom
        key={zoom.nonce}
        src={zoom.src}
        alt={product.name}
        onClose={() => setZoom(null)}
      />
    )}

    {/* Signed-out gate for Add to cart / Buy it now */}
    <SignInPrompt
      open={gateOpen}
      onClose={() => setGateOpen(false)}
      action={gateIntent === "buy" ? "buy this now" : "add to your cart"}
      reason={gateIntent === "buy" ? "Orders are placed and tracked from your account." : "Your cart is saved to your account."}
    />
    </>
  );
}

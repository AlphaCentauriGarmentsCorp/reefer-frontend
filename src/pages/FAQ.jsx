import { useState } from "react";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";
import { Link } from "react-router-dom";

// An answer is usually a string, but it can be a node — the accordion renders
// whatever it gets, so the one answer that has somewhere to send you does.
const faqLink = { color: "#F97B0C", fontWeight: 700, textDecoration: "underline" };

const GROUPS = [
  {
    category: "Shipping",
    anchor: "shipping",
    items: [
      { q: "How long does shipping take?", a: "Metro Manila lands in 1–3 business days; provincial orders take 3–7 business days via J&T Express or LBC. You get a tracking number the moment your order ships." },
      { q: "How much is shipping?", a: "Flat ₱80 within Metro Manila and ₱120 provincial. Orders over ₱2,500 ship free — the cart nudges you when you're close." },
      { q: "Do you ship internationally?", a: "Not yet. We're PH-only for now. Follow @reefer.mnl and we'll announce the day that changes." },
    ],
  },
  {
    category: "Returns",
    anchor: "returns",
    items: [
      { q: "What is your return policy?", a: "Unworn, unwashed pieces with tags still on can be returned within 7 days of delivery. Sale and sold-out drops are final once they're gone." },
      {
        q: "How do I start a return?",
        a: (
          <>
            Straight from your account —{" "}
            <Link to="/account?tab=returns" style={faqLink}>My Account → Returns</Link>. Open one on any delivered order, pick the pieces coming back and tell us why. You get a reference on the spot, and we follow up with the drop-off details. Rather talk to a person? DM @reefer.mnl with your order number.
          </>
        ),
      },
      { q: "When do I get refunded?", a: "Once we receive and inspect the item, refunds are processed within 5–7 business days back to your original payment method (or GCash)." },
    ],
  },
  {
    category: "Sizing",
    anchor: "sizing",
    items: [
      { q: "How do the tees fit?", a: "Regular, box, and oversized cuts each drape differently. The Sizing Guide has flat measurements in inches plus a compare tool so you can see two sizes side by side before you commit." },
      { q: "I'm between two sizes — what do I do?", a: "Size up for a boxier drape, especially on the box and oversized cuts. When in doubt, measure a tee you already love and match it to the chart." },
      { q: "Where is the size chart?", a: "Every product page links to it, or head straight to the Sizing Guide from the shop header. Measurements are garment-flat, in inches, with a ±½–1\" tolerance." },
    ],
  },
  {
    category: "Exchanges",
    anchor: "exchanges",
    items: [
      { q: "Can I exchange for a different size?", a: "Yes, within 7 days of delivery and subject to stock. Since we don't restock, the size you want may already be gone — message us as soon as you can." },
      { q: "How do exchanges work?", a: "Same flow as returns: reach out with your order number, ship the item back unworn with tags, and we send the new size once it arrives with us." },
      { q: "Is there an exchange shipping fee?", a: "Your first exchange ships back to you free within Metro Manila. You cover the postage to send the original item back to us." },
    ],
  },
  {
    category: "Payment Methods",
    anchor: "payment",
    items: [
      { q: "What can I pay with?", a: "GCash, Maya, credit/debit cards (processed via PayMongo), and Cash on Delivery (COD). Pick your method at checkout." },
      { q: "Is COD available nationwide?", a: "COD is available for most PH addresses through our couriers. A small COD handling fee may apply depending on your location." },
      { q: "Is checkout secure?", a: "Card payments run entirely through PayMongo's secure gateway — Reefer never sees or stores your card details." },
    ],
  },
];

export default function FAQ() {
  // Items open independently and the first shipping answer is expanded on arrival,
  // so the page never reads as a wall of collapsed headings.
  const [open, setOpen] = useState({ "shipping-0": true });
  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />

      {/* Hero */}
      <header style={{ maxWidth: 1200, margin: "0 auto", padding: "124px 32px 30px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "end" }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>HELP DESK</span>
            <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(56px, 12vw, 190px)", margin: "10px 0 0", textTransform: "uppercase", lineHeight: 0.82 }}>
              Questions<span style={{ color: "#F97B0C" }}>?</span>
            </h1>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 15, lineHeight: 1.7, color: "#6B6357", fontWeight: 500 }}>
            Everything on shipping, returns, sizing, exchanges, and payment — straight, no runaround. Still stuck? Hit the crew at the bottom of the page.
          </p>
        </div>
      </header>

      {/* Category chips */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 32px 0" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {GROUPS.map((g) => (
            <a key={g.anchor} href={`#${g.anchor}`} className="rf-chip" style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: "8px 15px", background: "#FFFDF8" }}>
              {g.category}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ sections */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px 80px", display: "flex", flexDirection: "column", gap: 46 }}>
        {GROUPS.map((g, gi) => (
          <div key={g.anchor} id={g.anchor} style={{ scrollMarginTop: 90 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 18, borderBottom: "2px solid #101010", paddingBottom: 12 }}>
              <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, background: "#F97B0C", color: "#101010", padding: "5px 11px", letterSpacing: "0.04em" }}>
                {String(gi + 1).padStart(2, "0")}
              </span>
              <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(28px, 4vw, 46px)", margin: 0, textTransform: "uppercase", lineHeight: 1 }}>{g.category}</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {g.items.map((it, ii) => {
                const key = `${g.anchor}-${ii}`;
                const isOpen = !!open[key];
                return (
                  <div key={ii} style={{ border: "2px solid #101010", background: "#FFFDF8" }}>
                    <button onClick={() => toggle(key)} aria-expanded={isOpen} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "none", border: "none", cursor: "pointer", padding: "18px 20px", textAlign: "left" }}>
                      <span style={{ fontFamily: "Anton, sans-serif", fontSize: "clamp(16px, 2vw, 21px)", textTransform: "uppercase", letterSpacing: "0.01em", lineHeight: 1.1 }}>{it.q}</span>
                      <span style={{ flexShrink: 0, width: 30, height: 30, border: "2px solid #101010", background: isOpen ? "#F97B0C" : "transparent", color: "#101010", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton, sans-serif", fontSize: 20, lineHeight: 1 }}>
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && <div style={{ padding: "0 20px 20px", fontSize: 15, lineHeight: 1.7, color: "#6B6357", fontWeight: 500 }}>{it.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Still stuck CTA */}
      <section style={{ background: "#101010", color: "#F6F1E7", padding: "72px 32px", textAlign: "center" }}>
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>STILL STUCK?</span>
        <h2 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(30px, 5vw, 60px)", margin: "12px 0 22px", textTransform: "uppercase", lineHeight: 0.92 }}>
          Talk to the crew<span style={{ color: "#F97B0C" }}>.</span>
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
          <Link to="/about#contact" className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "#F97B0C", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: "14px 26px", boxShadow: "5px 5px 0 #F6F1E7", display: "inline-block" }}>
            CONTACT US →
          </Link>
          <Link to="/sizing-guide" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.06em", background: "none", color: "#F6F1E7", textDecoration: "none", border: "2px solid #F6F1E7", padding: "14px 26px", display: "inline-block" }}>
            SIZING GUIDE
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

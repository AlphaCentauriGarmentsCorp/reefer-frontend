import { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";
import { useAuth } from "../hooks/useAuth";
import { useFavorites } from "../hooks/useFavorites";
import { useCart } from "../hooks/useCart";
import { accountApi } from "../api/accountApi";
import { addressApi } from "../api/addressApi";
import { orderApi } from "../api/orderApi";
import { returnApi } from "../api/returnApi";
import { stockAlertApi } from "../api/stockAlertApi";

const STAGES = ["Ordered", "Packed", "Shipped", "Out for Delivery", "Delivered"];
const peso = (n) => "₱" + Number(n || 0).toLocaleString();

// Sidebar destinations, grouped exactly as the mockup groups them. The URL keys
// stay short (?tab=…) — only the labels follow the mockup. Returns sits with the
// orders group and gets its own key so /account?tab=returns is linkable (the FAQ
// points at it).
const NAV_GROUPS = [
  [{ key: "overview", label: "My Account" }, { key: "orders", label: "My Orders" }, { key: "returns", label: "Returns" }],
  [{ key: "favorites", label: "Favorites" }, { key: "addresses", label: "Address Book" }],
  [{ key: "account", label: "Account Information" }],
];

// Mirrors config('reefer.returns.reasons'), which nothing public exposes yet. The
// server validates the key against that same config, so a stale entry here shows up
// as a 422 naming the reason rather than a silently wrong return. Adopted from the
// API the moment an endpoint ships one.
const FALLBACK_RETURN_REASONS = {
  wrong_size: "Wrong size",
  damaged: "Arrived damaged",
  not_as_described: "Not as described",
  wrong_item: "Wrong item sent",
  changed_mind: "Changed my mind",
};

// Anything the shop adds to the status list later lands on the muted default rather
// than rendering as an unstyled badge.
const RETURN_STATUS_COLORS = {
  requested: { bg: "#F97B0C", fg: "#101010" },
  approved: { bg: "#14213D", fg: "#F6F1E7" },
  received: { bg: "#14213D", fg: "#F6F1E7" },
  refunded: { bg: "#2E7D32", fg: "#F6F1E7" },
  rejected: { bg: "#C0392B", fg: "#F6F1E7" },
  cancelled: { bg: "#6B6357", fg: "#F6F1E7" },
};

// A 422 puts the sentence worth reading in errors.field[0]; err.message is the
// generic "The given data was invalid." that tells a shopper nothing.
const apiMessage = (err, fallback) => {
  const first = err?.errors && Object.values(err.errors).flat()[0];
  if (first) return first;
  // A 5xx body is an exception, and with debug on that is a stack trace. Nothing in
  // there is for the shopper.
  if ((err?.status ?? 0) >= 500) return fallback;
  return err?.message || fallback;
};

// Dates arrive as ISO strings, but a server that pre-formats one shouldn't turn
// into "Invalid Date" on screen — an unparseable value is shown as it came.
const shortDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
};

// Inline styles can't hold a media query and index.css is owned elsewhere, so the
// handful of breakpoints that need real numbers (tracker steps, table density)
// read the viewport directly.
function useNarrow(maxWidth) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return narrow;
}

const linkBtn = { background: "none", border: "none", color: "#F97B0C", textDecoration: "underline", cursor: "pointer", padding: 0, fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 12 };
const sectionHead = { fontFamily: "Anton, sans-serif", fontSize: 20, textTransform: "uppercase", letterSpacing: "0.02em" };
const pageTitle = { fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(34px, 5vw, 48px)", margin: 0, textTransform: "uppercase" };
const outlineBtn = { fontFamily: "Anton, sans-serif", fontSize: 12, letterSpacing: "0.08em", background: "none", color: "#101010", border: "2px solid #101010", padding: "8px 16px", cursor: "pointer" };
const errorBanner = { fontFamily: "Archivo, sans-serif", fontSize: 13, fontWeight: 700, color: "#C0392B", border: "2px solid #C0392B", background: "#FBEAE7", padding: "12px 14px" };
const metaLabel = { fontWeight: 900, fontSize: 9, letterSpacing: "0.16em", color: "#6B6357" };

// ---- Small building blocks ---------------------------------------------------

function StatusBadge({ status }) {
  const tone = RETURN_STATUS_COLORS[status] || { bg: "#6B6357", fg: "#F6F1E7" };
  return (
    <span style={{ fontFamily: "Anton, sans-serif", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", background: tone.bg, color: tone.fg, border: "2px solid #101010", padding: "4px 9px", lineHeight: 1.1, whiteSpace: "nowrap" }}>
      {String(status || "unknown").replace(/_/g, " ")}
    </span>
  );
}

/**
 * `onRequestReturn` opens the return form where you stand (used inside the expanded
 * panel); `onStartReturn` hands the order over to the Returns tab instead, which is
 * where the rest of the return lives once it exists.
 */
function OrderTable({ orders, returnsByOrder, onRequestReturn, onStartReturn }) {
  const [expanded, setExpanded] = useState(null);
  const narrow = useNarrow(560);
  const pad = narrow ? "10px 8px" : "14px 16px";
  const size = narrow ? 12 : 13;

  const th = (align) => ({ textAlign: align, padding: pad, fontSize: 12, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "2px solid #101010" });

  return (
    <div className="rf-scroll-x" style={{ border: "2px solid #101010", background: "#FFFDF8" }}>
      {orders.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Archivo, sans-serif" }}>
          <thead>
            <tr style={{ background: "#ECE5D6" }}>
              <th style={th("left")}>Order #</th>
              <th style={th("left")}>Date</th>
              <th style={th("left")}>Ship To</th>
              <th style={th("right")}>Order Total</th>
              <th style={th("left")}>Status</th>
              <th style={th("left")}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const open = expanded === o.order_number;
              const paid = o.payment_status === "paid";
              // The API is the authority on returnability — it knows the delivery
              // date and the window. can_return is used when it ships one; without
              // it we only offer the action on a delivered order and let the server
              // refuse anything past the window, in its own words.
              const delivered = (o.stage ?? 0) >= STAGES.length - 1 || String(o.status || "").toLowerCase() === "delivered";
              const canReturn = typeof o.can_return === "boolean" ? o.can_return : delivered;
              const returnHint = canReturn
                  ? ""
                  : delivered
                    // Name the date when we have it — "closed on Jul 30" is actionable
                    // in a way that "the window has closed" is not.
                    ? (o.returns_close_on
                        ? `The ${o.return_window_days}-day return window closed on ${o.returns_close_on}.`
                        : "The return window on this order has closed.")
                    : "Returns open once this order is delivered.";
              const ownReturns = returnsByOrder?.[o.order_number] || [];
              const shipLine = o.ship_to
                ? [o.ship_to.street, o.ship_to.barangay, o.ship_to.city, o.ship_to.province, o.ship_to.postal].filter(Boolean).join(", ")
                : "";
              return (
                <Fragment key={o.order_number}>
                  <tr style={{ borderBottom: "1px solid #E7DFCE" }}>
                    <td style={{ padding: pad, fontSize: size, fontWeight: 700 }}>{o.order_number}</td>
                    <td style={{ padding: pad, fontSize: size, color: "#6B6357", fontWeight: 600 }}>{o.date}</td>
                    <td style={{ padding: pad, fontSize: size, color: "#6B6357", fontWeight: 600 }}>{o.ship_to?.name || ""}</td>
                    <td style={{ padding: pad, fontSize: size, fontWeight: 700, textAlign: "right" }}>{o.total_formatted}</td>
                    <td style={{ padding: pad, fontSize: size, fontWeight: 700, color: paid ? "#2E7D32" : "#6B6357" }}>{paid ? "Confirmed" : o.payment_status}</td>
                    <td style={{ padding: pad }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <button onClick={() => setExpanded(open ? null : o.order_number)} style={linkBtn}>{open ? "Hide" : "View Order"}</button>
                        {/* Surfaced on the row itself, not only inside the expanded
                            panel — a return you have to go hunting for behind "View
                            Order" may as well not be offered. Hidden once a return is
                            already open on this order, so it can't be filed twice. */}
                        {canReturn && onStartReturn && ownReturns.every((r) => !isOpenReturn(r)) && (
                          <button
                            onClick={() => onStartReturn(o)}
                            style={{ ...linkBtn, color: "#F97B0C", fontWeight: 800 }}
                          >
                            Request a return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {open && (
                    <tr style={{ borderBottom: "1px solid #E7DFCE", background: "#F6F1E7" }}>
                      <td colSpan={6} style={{ padding: "18px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <span style={metaLabel}>ITEMS</span>
                            {(o.items || []).map((i, ix) => (
                              <div key={`${i.slug}-${i.size}-${ix}`} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px dashed #E7DFCE", paddingBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>
                                  {i.qty} × {i.name} <span style={{ color: "#6B6357", fontWeight: 600 }}>· Size {i.size}</span>
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#F97B0C", whiteSpace: "nowrap" }}>{peso(i.line_total)}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <span style={metaLabel}>SHIPPING TO</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: "#6B6357", lineHeight: 1.5 }}>{shipLine}</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <span style={metaLabel}>PAYMENT</span>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>{[o.payment_method, o.payment_status].filter(Boolean).join(" · ").toUpperCase()}</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <span style={metaLabel}>FULFILMENT</span>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>{o.stage_label}</span>
                            </div>
                          </div>

                          {onRequestReturn && (
                            <div className="rf-line" style={{ display: "flex", alignItems: "center", gap: 14, borderTop: "1px solid #E7DFCE", paddingTop: 14 }}>
                              {canReturn ? (
                                <button onClick={() => onRequestReturn(o)} style={{ ...outlineBtn, borderColor: "#F97B0C", color: "#101010", background: "#FFFDF8" }}>
                                  REQUEST A RETURN
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>{returnHint}</span>
                              )}
                              {ownReturns.map((r) => (
                                <Link key={r.reference} to="/account?tab=returns" style={{ ...linkBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 }}>
                                  <StatusBadge status={r.status} />
                                  <span style={{ textDecoration: "underline" }}>{r.reference}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ margin: 0, padding: "24px 16px", fontSize: 14, color: "#6B6357", fontWeight: 500 }}>You haven't placed any orders yet.</p>
      )}
    </div>
  );
}

/**
 * The mockup's Address Card is bare text, not a bordered panel — the section
 * heading and the grid around it supply the structure.
 */
function AddressCard({ label, address, editLabel = "Edit Address", onEdit, secondLabel, onSecond }) {
  const has = !!(address && (address.name || address.street));
  const cityLine = address
    ? [address.barangay, address.city].filter(Boolean).join("/") +
      (address.province ? ", " + address.province : "") +
      (address.postal ? " " + address.postal : "")
    : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {label && <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, textTransform: "uppercase" }}>{label}</span>}
      {has ? (
        <>
          <div style={{ fontSize: 14, lineHeight: 1.6, fontWeight: 600 }}>
            <div>{address.name}</div>
            <div style={{ color: "#6B6357" }}>{address.street}</div>
            <div style={{ color: "#6B6357" }}>{cityLine}</div>
            <div style={{ color: "#6B6357" }}>Philippines</div>
            <div style={{ color: "#6B6357" }}>T: {address.phone}</div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 12, fontWeight: 700 }}>
            <button onClick={onEdit} style={linkBtn}>{editLabel}</button>
            {secondLabel && (
              <>
                <span style={{ color: "#C9C0B0" }}>|</span>
                <button onClick={onSecond} style={linkBtn}>{secondLabel}</button>
              </>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 14, color: "#6B6357", fontWeight: 500 }}>No address on file yet.</span>
          <button onClick={onEdit} style={{ alignSelf: "flex-start", fontFamily: "Anton, sans-serif", fontSize: 12, letterSpacing: "0.06em", background: "none", color: "#101010", border: "2px solid #101010", padding: "9px 16px", cursor: "pointer" }}>
            ADD ADDRESS
          </button>
        </div>
      )}
    </div>
  );
}

function Tracker({ order, onAdvance }) {
  const narrow = useNarrow(560);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const stage = Math.max(0, Math.min(STAGES.length - 1, order.stage ?? 0));
  const fillPct = (stage / (STAGES.length - 1)) * 100;
  // The five steps are absolutely-positioned 84px boxes; on a phone they collide,
  // so the rail margin and the step footprint both shrink.
  const stepWidth = narrow ? 56 : 84;
  const rail = narrow ? 6 : 46;

  return (
    <div style={{ border: "2px solid #101010", background: "#FFFDF8", padding: 22, boxShadow: "5px 5px 0 #F97B0C" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #E7DFCE", paddingBottom: 14, marginBottom: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.02em" }}>{order.order_number}</span>
          {/* courier / tracking_number are columns nothing writes yet — say so
              rather than inventing a courier the shopper could chase. */}
          <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>
            {order.courier || "Courier not assigned yet"} · {order.tracking_number || "No tracking number yet"}
          </span>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.14em", color: "#6B6357" }}>EST. DELIVERY</span>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, color: "#F97B0C", lineHeight: 1 }}>{order.eta || "TBC"}</span>
        </div>
      </div>
      <div style={{ position: "relative", height: 66, margin: `4px ${rail}px 0` }}>
        <div style={{ position: "absolute", top: 11, left: 0, right: 0, height: 3, background: "#E7DFCE" }} />
        <div style={{ position: "absolute", top: 11, left: 0, height: 3, background: "#F97B0C", width: `${fillPct}%` }} />
        {STAGES.map((label, i) => {
          // Forward only. A stage already reached is settled — going back would
          // re-open a returns window that had already been spent.
          const ahead = i > stage;
          const advance = async () => {
            if (!ahead || busy !== null) return;
            setBusy(i);
            setError("");
            try {
              await onAdvance(order.order_number, i);
            } catch (err) {
              setError(err?.message || "Could not update that order.");
            } finally {
              setBusy(null);
            }
          };

          return (
            <div key={label} style={{ position: "absolute", top: 0, left: `${(i / (STAGES.length - 1)) * 100}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 9, width: stepWidth }}>
              <button
                onClick={advance}
                disabled={!ahead || busy !== null}
                aria-label={ahead ? `Mark this order ${label}` : `${label} — already reached`}
                title={ahead ? `Mark as ${label}` : "Already past this stage"}
                style={{
                  width: 24, height: 24, borderRadius: 999, border: "2px solid #101010", padding: 0,
                  background: i < stage ? "#101010" : i === stage ? "#F97B0C" : "#FFFDF8",
                  color: i < stage ? "#F6F1E7" : "#101010",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 900, lineHeight: 1,
                  // Only the steps still ahead invite a click; the rest read as history.
                  cursor: ahead ? (busy !== null ? "progress" : "pointer") : "default",
                  boxShadow: ahead ? "0 0 0 3px rgba(249,123,12,0.18)" : "none",
                  opacity: busy !== null && busy !== i ? 0.5 : 1,
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
              >
                {busy === i ? "…" : i < stage ? "✓" : i === stage ? "●" : ""}
              </button>
              <span style={{ fontSize: narrow ? 8.5 : 9.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.2, color: i <= stage ? "#101010" : "#6B6357" }}>{label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <p style={{ margin: "14px 0 0", fontSize: 12, fontWeight: 700, color: "#C0392B" }}>{error}</p>
      )}

      {stage < STAGES.length - 1 && (
        // Sized up from 11px grey: this line is the only thing telling anyone the
        // tracker is interactive at all, and at footnote size it read as small print
        // to skip rather than an instruction to follow.
        <p style={{ margin: "16px 0 0", fontSize: narrow ? 13 : 14.5, fontWeight: 700, color: "#101010", lineHeight: 1.55, background: "#F6F1E7", border: "2px solid #101010", padding: "12px 14px" }}>
          <span style={{ color: "#F97B0C" }}>Demo:</span> tap a step ahead to move this order along. It only goes forward.
        </p>
      )}
    </div>
  );
}

// ---- Page --------------------------------------------------------------------

export default function Account() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [hoverKey, setHoverKey] = useState(null);

  const setTab = useCallback((key, extra) => {
    const next = key === "overview" && !extra ? {} : { tab: key, ...extra };
    setSearchParams(next);
    window.scrollTo({ top: 0 });
  }, [setSearchParams]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // `quiet` is for refetches after a write: flipping `loading` there would swap the
  // whole dashboard for the LOADING screen, unmounting the modal mid-close. A failed
  // refetch also keeps the data already on screen rather than blanking the page —
  // the write itself succeeded, so showing an empty address book would be a lie.
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setData(await accountApi.dashboard());
    } catch {
      if (!quiet) setData(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const refreshQuietly = useCallback(() => load(true), [load]);

  // Demo tracker. Refetches quietly rather than patching the row locally, so the
  // stage, courier, tracking number and — the one that matters — whether a return is
  // still open all come back from the server that decides them.
  const advanceOrder = useCallback(
    async (orderNumber, stage) => {
      await orderApi.advance(orderNumber, stage);
      await refreshQuietly();
    },
    [refreshQuietly],
  );

  // Returns ride alongside the dashboard rather than waiting for the Returns tab:
  // an order row wants to say "you already have one open on this order" the first
  // time it is expanded, whichever tab that happens on.
  const [returns, setReturns] = useState([]);
  const [returnReasons, setReturnReasons] = useState(FALLBACK_RETURN_REASONS);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [returnsError, setReturnsError] = useState("");
  const [returnModal, setReturnModal] = useState({ open: false, order: null });

  const loadReturns = useCallback(async () => {
    try {
      const body = await returnApi.list();
      setReturns(body?.data || []);
      const reasons = body?.reasons || body?.meta?.reasons;
      if (reasons && Object.keys(reasons).length) setReturnReasons(reasons);
      setReturnsError("");
    } catch (err) {
      setReturns([]);
      setReturnsError(apiMessage(err, "Could not load your returns."));
    } finally {
      setReturnsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      load();
      loadReturns();
    } else {
      setLoading(false);
    }
  }, [user, load, loadReturns]);

  // Keyed by order so an expanded row can find its own without scanning the list.
  const returnsByOrder = useMemo(() => {
    const map = {};
    for (const r of returns) {
      if (!r?.order_number) continue;
      (map[r.order_number] ||= []).push(r);
    }
    return map;
  }, [returns]);

  const openReturn = useCallback((order) => setReturnModal({ open: true, order }), []);
  // The order stays in state through the close so the modal has something to render
  // while it fades out.
  const closeReturn = useCallback(() => {
    setReturnModal((m) => ({ ...m, open: false }));
    // Opened by deep link, `open` is derived from the URL — so dropping the param is
    // what actually closes it. Without this the form would spring straight back.
    if (searchParams.get("order")) setTab("returns");
  }, [searchParams, setTab]);

  /**
   * "Request a return" from the orders list: move to the Returns tab and open the form
   * there, rather than filing it from a row the shopper is about to navigate away from.
   *
   * The order number goes in the URL, so the trip is a real navigation — back works,
   * and the link can be shared or reloaded. ReturnsTab picks the order up from there.
   */
  const startReturn = useCallback((order) => {
    setTab("returns", { order: order.order_number });
  }, [setTab]);

  // Land on the Returns tab afterwards: the reference is the thing to quote at us,
  // and it is the only place it is written down.
  const afterReturnCreated = useCallback(async () => {
    await loadReturns();
    setTab("returns");
  }, [loadReturns, setTab]);

  /*
   * Hoisted above the early returns because a hook below depends on it, and hooks
   * cannot run conditionally. Memoised for the same reason: the `||` chain builds a
   * fresh array every render, which would invalidate that hook on every pass.
   */
  const orders = useMemo(() => data?.orders?.data || data?.orders || [], [data]);

  /*
   * Deep link from My Orders: /account?tab=returns&order=RFR-… lands on the Returns
   * tab with the request form already open for that order.
   *
   * Derived from the URL rather than copied into state by an effect. One source of
   * truth, the back button closes the form, and the link survives a reload. An
   * unknown order number resolves to null and the tab just renders normally.
   */
  const linkedReturnOrder = useMemo(() => {
    const wanted = searchParams.get("order");
    return wanted ? orders.find((o) => o.order_number === wanted) || null : null;
  }, [searchParams, orders]);

  const shell = (children) => (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />
      {children}
      <Footer />
    </div>
  );

  // Signed-out guard
  if (!user) {
    return shell(
      <main style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 60px", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, maxWidth: 420 }}>
          <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>ACCOUNT</span>
          <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(34px, 6vw, 52px)", margin: 0, textTransform: "uppercase", lineHeight: 0.95 }}>Sign in to see your stuff.</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6B6357", fontWeight: 500, lineHeight: 1.6 }}>Orders, addresses, and account info live here once you're signed in.</p>
          <Link to="/sign-in?return=/account" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.03em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "15px 28px", boxShadow: "5px 5px 0 #F97B0C" }}>SIGN IN →</Link>
        </div>
      </main>
    );
  }

  if (loading) return shell(<p style={{ textAlign: "center", padding: "160px 0", color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING YOUR ACCOUNT…</p>);

  const addresses = data?.addresses?.data || data?.addresses || [];
  const acct = data?.user?.data || data?.user || user;
  const incoming = orders.filter((o) => (o.stage ?? 0) < STAGES.length - 1);

  // No `|| addresses[0]` fallback: an address that isn't flagged as a default is
  // not the default, and the card's own empty state is the honest answer.
  const defaultShipping = addresses.find((a) => a.is_default_shipping) || null;
  const defaultBilling = addresses.find((a) => a.is_default_billing) || null;

  const signOut = () => {
    logout();
    navigate("/");
  };

  const navBtn = (n) => {
    const active = tab === n.key;
    return (
      <button
        key={n.key}
        onClick={() => setTab(n.key)}
        onMouseEnter={() => setHoverKey(n.key)}
        onMouseLeave={() => setHoverKey(null)}
        style={{ display: "block", width: "100%", textAlign: "left", fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.02em", padding: "14px 18px", background: active ? "#101010" : hoverKey === n.key ? "#ECE5D6" : "transparent", color: active ? "#F6F1E7" : "#101010", border: "none", borderLeft: `4px solid ${active ? "#F97B0C" : "transparent"}`, cursor: "pointer" }}
      >
        {n.label}
      </button>
    );
  };

  return shell(
    <>
    <div className="rf-sidebar" style={{ maxWidth: 1320, margin: "0 auto", padding: "104px 32px 100px", display: "grid", gridTemplateColumns: "260px 1fr", gap: 40, alignItems: "start" }}>
      {/* Sidebar */}
      <aside className="rf-sticky" style={{ position: "sticky", top: 90, border: "2px solid #101010", background: "#FFFDF8", display: "flex", flexDirection: "column" }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ borderBottom: gi === NAV_GROUPS.length - 1 ? "none" : "1px solid #E7DFCE" }}>
            {group.map(navBtn)}
          </div>
        ))}
        <button
          onClick={signOut}
          onMouseEnter={() => setHoverKey("__out")}
          onMouseLeave={() => setHoverKey(null)}
          style={{ display: "block", width: "100%", textAlign: "left", fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.04em", padding: "14px 18px", background: hoverKey === "__out" ? "#ECE5D6" : "none", color: "#F97B0C", border: "none", borderTop: "1px solid #E7DFCE", cursor: "pointer" }}
        >
          SIGN OUT
        </button>
      </aside>

      {/* Main */}
      <div style={{ minWidth: 0 }}>
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 56, animation: "fadeUp 0.4s both" }}>
            <h1 style={pageTitle}>My Account<span style={{ color: "#F97B0C" }}>.</span></h1>

            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 18 }}>
                <span style={sectionHead}>Recent Orders</span>
                <button onClick={() => setTab("orders")} style={outlineBtn}>VIEW ALL</button>
              </div>
              <OrderTable orders={orders.slice(0, 3)} returnsByOrder={returnsByOrder} onRequestReturn={openReturn} onStartReturn={startReturn} />
            </section>

            <section>
              <span style={{ ...sectionHead, display: "block", borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 22 }}>Account Information</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 15, textTransform: "uppercase" }}>Contact Information</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{acct.name}</span>
                <span style={{ fontSize: 14, color: "#6B6357", fontWeight: 600 }}>{acct.email}</span>
                <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 12, fontWeight: 700 }}>
                  <button onClick={() => setTab("account")} style={linkBtn}>Edit</button>
                  <span style={{ color: "#C9C0B0" }}>|</span>
                  <button onClick={() => setTab("account", { pw: "1" })} style={linkBtn}>Change Password</button>
                </div>
              </div>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 22 }}>
                <span style={sectionHead}>Address Book</span>
                <button onClick={() => setTab("addresses")} style={outlineBtn}>MANAGE ADDRESSES</button>
              </div>
              <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                <AddressCard label="Default Billing Address" address={defaultBilling} onEdit={() => setTab("addresses")} />
                <AddressCard label="Default Shipping Address" address={defaultShipping} onEdit={() => setTab("addresses")} />
              </div>
            </section>
          </div>
        )}

        {tab === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 40, animation: "fadeUp 0.4s both" }}>
            <h1 style={pageTitle}>My Orders<span style={{ color: "#F97B0C" }}>.</span></h1>

            <section>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 20 }}>
                <span style={sectionHead}>In Transit</span>
                <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#F97B0C" }}>
                  {incoming.length}{incoming.length === 1 ? " ORDER ON THE WAY" : " ORDERS ON THE WAY"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {incoming.length ? incoming.map((o) => <Tracker key={o.order_number} order={o} onAdvance={advanceOrder} />) : (
                  <p style={{ margin: 0, padding: "20px 16px", border: "2px dashed #101010", background: "#FFFDF8", fontSize: 14, color: "#6B6357", fontWeight: 500 }}>Nothing in transit right now. Your shipped orders show up here with live tracking.</p>
                )}
              </div>
            </section>

            <section>
              <span style={{ ...sectionHead, display: "block", borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 20 }}>Order History</span>
              <OrderTable orders={orders} returnsByOrder={returnsByOrder} onRequestReturn={openReturn} onStartReturn={startReturn} />
            </section>
          </div>
        )}

        {tab === "returns" && (
          <ReturnsTab
            returns={returns}
            reasons={returnReasons}
            loading={returnsLoading}
            error={returnsError}
            onChanged={loadReturns}
            onBrowseOrders={() => setTab("orders")}
            // The tab can now START a return, not just list them — it needs the
            // orders to pick from, the existing returns to avoid offering a second
            // one on an order already coming back, and the same modal My Orders uses.
            orders={orders}
            returnsByOrder={returnsByOrder}
            onRequestReturn={openReturn}
          />
        )}

        {tab === "favorites" && <FavoritesTab />}

        {tab === "addresses" && (
          <AddressBook
            addresses={addresses}
            onChanged={refreshQuietly}
            // ?from=cart is set by the cart's "no address saved" prompt. It is the
            // only reason the address book shows a way back — arriving from the nav
            // should not offer to send you to a cart you were not using.
            fromCart={searchParams.get("from") === "cart"}
          />
        )}

        {tab === "account" && (
          <ProfileForm
            acct={acct}
            setUser={setUser}
            onSaved={refreshQuietly}
            openPassword={searchParams.get("pw") === "1"}
            onExit={() => setTab("overview")}
          />
        )}
      </div>
    </div>

    {/* Mounted at the shell, not inside a tab: switching to Returns on success
        must not unmount the modal halfway through its close transition. */}
    <ReturnModal
      open={returnModal.open || !!linkedReturnOrder}
      order={returnModal.order || linkedReturnOrder}
      reasons={returnReasons}
      onClose={closeReturn}
      onSubmitted={afterReturnCreated}
    />
    </>
  );
}

// ---- Returns -----------------------------------------------------------------

/**
 * Pick lines, pick a reason, send. Quantities are per line and capped at what was
 * ordered; the refund shown is an estimate off the order's own unit prices, because
 * the number that counts is the one the server prices when it accepts the request.
 */
function ReturnModal({ open, order, reasons, onClose, onSubmitted }) {
  const items = useMemo(() => order?.items || [], [order]);
  const orderNumber = order?.order_number;

  const [qty, setQty] = useState({});
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQty({});
    setReason("");
    setNote("");
    setError("");
  }, [open, orderNumber]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lines are addressed the way the order hands them out — slug + size — because
  // order_item ids are not part of the public order shape.
  const picked = items
    .map((i, ix) => ({ slug: i.slug, size: i.size, qty: Number(qty[ix] || 0), unit_price: Number(i.unit_price || 0) }))
    .filter((line) => line.qty > 0);
  const estimate = picked.reduce((sum, line) => sum + line.qty * line.unit_price, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!picked.length) return setError("Pick at least one piece to send back.");
    if (!reason) return setError("Tell us why it's coming back.");

    setError("");
    setSaving(true);
    try {
      await returnApi.create(orderNumber, {
        items: picked.map((line) => ({ slug: line.slug, size: line.size, qty: line.qty })),
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      await onSubmitted();
      onClose();
    } catch (err) {
      // The window, the status and the per-line quantities are all the server's call
      // — whatever it refused with is more accurate than a guess made here.
      setError(apiMessage(err, "Could not open that return."));
    } finally {
      setSaving(false);
    }
  };

  const title = "Request a Return";

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, background: "rgba(16,16,16,0.55)", zIndex: 190, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", visibility: open ? "visible" : "hidden", transition: "opacity 0.25s, visibility 0.25s" }}
      />
      {/* visibility, not just pointer-events: a closed modal must leave the tab
          order too, or focus walks through the quantity selects of an order the
          shopper isn't returning. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        style={{ position: "fixed", top: "50%", left: "50%", width: "min(560px, 92vw)", maxHeight: "86vh", overflowY: "auto", background: "#F6F1E7", border: "2px solid #101010", boxShadow: "10px 10px 0 #101010", zIndex: 200, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", visibility: open ? "visible" : "hidden", transform: `translate(-50%, -50%) scale(${open ? 1 : 0.94})`, transition: "opacity 0.25s, transform 0.25s cubic-bezier(.2,.7,.2,1), visibility 0.25s" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "2px solid #101010" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 19, textTransform: "uppercase" }}>{title}</span>
            <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 700 }}>{orderNumber}</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "2px solid #101010", width: 34, height: 34, fontSize: 15, fontWeight: 900, cursor: "pointer" }}>✕</button>
        </div>

        <form onSubmit={submit} style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={lbl}>What's coming back?</span>
            {items.map((i, ix) => {
              const max = Number(i.qty || 0);
              return (
                <div key={`${i.slug}-${i.size}-${ix}`} style={{ display: "grid", gridTemplateColumns: "1fr 84px", gap: 12, alignItems: "center", borderBottom: "1px dashed #E7DFCE", paddingBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{i.name}</span>
                    <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>Size {i.size} · {peso(i.unit_price)} each · {max} ordered</span>
                  </div>
                  <select
                    value={qty[ix] ?? 0}
                    onChange={(e) => setQty((q) => ({ ...q, [ix]: Number(e.target.value) }))}
                    aria-label={`Quantity to return — ${i.name}, size ${i.size}`}
                    style={selectField}
                  >
                    {Array.from({ length: max + 1 }, (_, n) => n).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              );
            })}
          </div>

          <label style={fieldWrap}>
            <span style={lbl}>Reason {req}</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={field}>
              <option value="">—</option>
              {Object.entries(reasons || {}).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>

          <label style={fieldWrap}>
            <span style={lbl}>Anything else? (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Tell us what happened — it speeds up the check."
              style={{ ...field, resize: "vertical", lineHeight: 1.5 }}
            />
          </label>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderTop: "1px solid #E7DFCE", paddingTop: 12 }}>
            <span style={metaLabel}>ESTIMATED REFUND</span>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, color: "#F97B0C" }}>{peso(estimate)}</span>
          </div>
          <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 500, lineHeight: 1.6, marginTop: -8 }}>
            We confirm the final amount once the pieces are back with us and checked. Shipping is not refunded.
          </span>

          {error && <div style={errorBanner}>{error}</div>}

          <div style={{ display: "flex", gap: 12, marginTop: 2 }}>
            <button type="submit" disabled={saving} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "13px 22px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C", opacity: saving ? 0.6 : 1 }}>
              {saving ? "SENDING…" : "SEND REQUEST"}
            </button>
            <button type="button" onClick={onClose} style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "none", color: "#101010", border: "2px solid #101010", padding: "13px 22px", cursor: "pointer" }}>
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/*
 * Which statuses are still live.
 *
 * The server's own vocabulary: 'requested' → 'approved' → 'received' → 'refunded',
 * with 'cancelled' and 'rejected' as the dead ends (ReturnRequest::DEAD_STATUSES).
 * Anything still moving belongs under "In progress"; everything terminal — refunded
 * included, since a completed refund is history, not a task — drops to the log below.
 *
 * Unknown statuses count as OPEN on purpose: if the backend gains a stage this file
 * has not heard of, burying it in history would hide something that still needs the
 * shopper's attention. Surfacing an extra card is the safer way to be wrong.
 */
const RETURN_CLOSED = new Set(["refunded", "rejected", "cancelled"]);
const isOpenReturn = (r) => !RETURN_CLOSED.has(String(r?.status || "").toLowerCase());

function ReturnsTab({ returns, reasons, loading, error, onChanged, onBrowseOrders, orders = [], returnsByOrder = {}, onRequestReturn }) {
  const [busy, setBusy] = useState("");
  const [cancelError, setCancelError] = useState("");

  const cancel = async (r) => {
    setCancelError("");
    setBusy(r.reference);
    try {
      await returnApi.cancel(r.reference);
      await onChanged();
    } catch (err) {
      setCancelError(apiMessage(err, "Could not cancel that return."));
    } finally {
      setBusy("");
    }
  };

  const pending = returns.filter((r) => r.status === "requested").length;
  const openReturns = returns.filter(isOpenReturn);
  const pastReturns = returns.filter((r) => !isOpenReturn(r));

  /*
   * Orders you could still send back, so a return can be started HERE rather than
   * only from My Orders — which was the whole reason this tab felt like a dead end:
   * it listed returns but offered no way to make one.
   *
   * can_return is the server's answer and is trusted when present; without it we fall
   * back to "delivered" and let POST refuse anything past the window in its own words.
   * An order that already has a live return is dropped — offering "request a return"
   * on something already coming back is how you get duplicates.
   */
  const returnable = orders.filter((o) => {
    const delivered = (o.stage ?? 0) >= STAGES.length - 1 || String(o.status || "").toLowerCase() === "delivered";
    const eligible = typeof o.can_return === "boolean" ? o.can_return : delivered;
    const alreadyOpen = (returnsByOrder[o.order_number] || []).some(isOpenReturn);
    return eligible && !alreadyOpen;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, animation: "fadeUp 0.4s both" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h1 style={pageTitle}>Returns<span style={{ color: "#F97B0C" }}>.</span></h1>
        {returns.length > 0 && (
          <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#F97B0C" }}>
            {pending ? `${pending} AWAITING US` : `${returns.length} ON RECORD`}
          </span>
        )}
      </div>

      {(error || cancelError) && <div style={errorBanner}>{cancelError || error}</div>}

      {/* ── 1. Start one ──────────────────────────────────────────────────────
          Top of the page because it is the only thing here you can ACT on; the
          two lists below are status you read. Hidden entirely when nothing is
          eligible rather than shown empty — a section that can only say "no"
          is noise on a page you visit to check on something. */}
      {!loading && returnable.length > 0 && onRequestReturn && (
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, textTransform: "uppercase" }}>Start a return</span>
            <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>Unworn, tags on, inside the window.</span>
          </div>
          <div style={{ border: "2px solid #101010", background: "#FFFDF8", display: "flex", flexDirection: "column" }}>
            {returnable.map((o, i) => (
              <div
                key={o.order_number}
                className="rf-line"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 18px", borderTop: i ? "1px solid #E7DFCE" : "none" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 16, letterSpacing: "0.02em" }}>{o.order_number}</span>
                  <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>
                    Delivered · {o.date} · {(o.items || []).reduce((n, it) => n + (it.qty || 0), 0)} item(s) · {o.total_formatted}
                    {o.returns_close_on ? ` · window closes ${o.returns_close_on}` : ""}
                  </span>
                </div>
                <button
                  onClick={() => onRequestReturn(o)}
                  style={{ ...outlineBtn, borderColor: "#F97B0C", color: "#101010", background: "#FFFDF8", whiteSpace: "nowrap" }}
                >
                  REQUEST A RETURN
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p style={{ color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING…</p>
      ) : returns.length === 0 ? (
        <div style={{ border: "2px dashed #101010", background: "#FFFDF8", padding: "44px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>↩</span>
          <p style={{ fontFamily: "Anton, sans-serif", fontSize: 22, margin: 0, textTransform: "uppercase" }}>Nothing coming back.</p>
          <p style={{ margin: 0, fontSize: 14, color: "#6B6357", fontWeight: 500, maxWidth: 380, lineHeight: 1.6 }}>
            {returnable.length > 0
              ? "Pick an order above to start one — it lands here with a reference to quote."
              : "Unworn, tags on, inside the window? Open a return from any delivered order and it lands here with a reference to quote."}
          </p>
          {returnable.length === 0 && (
            <button onClick={onBrowseOrders} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "13px 24px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C" }}>
              GO TO MY ORDERS
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {[
          { key: "open", title: "In progress", rows: openReturns, blurb: "We'll email you as each one moves." },
          { key: "past", title: "History", rows: pastReturns, blurb: "Refunded, rejected or cancelled." },
        ].filter((s) => s.rows.length > 0).map((section) => (
        <section key={section.key} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, textTransform: "uppercase" }}>
              {section.title} <span style={{ color: "#F97B0C" }}>({section.rows.length})</span>
            </span>
            <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>{section.blurb}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {section.rows.map((r) => (
            <div key={r.reference} style={{ border: "2px solid #101010", background: "#FFFDF8", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="rf-line" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #E7DFCE", paddingBottom: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.02em" }}>{r.reference}</span>
                  <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>
                    Order {r.order_number} · Requested {shortDate(r.requested_at)}
                    {r.resolved_at ? ` · Closed ${shortDate(r.resolved_at)}` : ""}
                  </span>
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={metaLabel}>SENDING BACK</span>
                {(r.items || []).map((i, ix) => (
                  <div key={`${i.slug}-${i.size}-${ix}`} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, borderBottom: "1px dashed #E7DFCE", paddingBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {i.qty} × {i.name} <span style={{ color: "#6B6357", fontWeight: 600 }}>· Size {i.size}</span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F97B0C", whiteSpace: "nowrap" }}>{peso(i.line_total)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={metaLabel}>REASON</span>
                  {/* reason_label is the server's wording; the local map only covers
                      it when an older payload sends the bare key. */}
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{r.reason_label || reasons?.[r.reason] || r.reason}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={metaLabel}>REFUND SUBTOTAL</span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{r.refund_subtotal_formatted || peso(r.refund_subtotal)}</span>
                </div>
              </div>

              {r.note && (
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={metaLabel}>YOUR NOTE</span>
                  <span style={{ fontSize: 13, color: "#6B6357", fontWeight: 500, lineHeight: 1.6 }}>{r.note}</span>
                </div>
              )}

              {r.status === "requested" && (
                <div style={{ borderTop: "1px solid #E7DFCE", paddingTop: 12 }}>
                  <button
                    onClick={() => cancel(r)}
                    disabled={busy === r.reference}
                    style={{ ...outlineBtn, borderColor: "#C0392B", color: "#C0392B", opacity: busy === r.reference ? 0.6 : 1 }}
                  >
                    {busy === r.reference ? "CANCELLING…" : "CANCEL RETURN"}
                  </button>
                </div>
              )}
            </div>
          ))}
          </div>
        </section>
        ))}
        </div>
      )}
    </div>
  );
}

// ---- Favorites (wishlist) tab ------------------------------------------------

/**
 * Which sizes of a wishlisted product can actually be bought right now.
 *
 * `variants` rides along on the favourites payload with a per-size `stock`, so this
 * needs no extra request. Falling back to `sizes` (every size offered, stock unknown)
 * matters for rows saved before variants were published — better to let the shopper
 * try and get a clear "only 2 left" from the server than to grey out a live product.
 */
function buyableSizes(p) {
  if (Array.isArray(p?.variants) && p.variants.length) {
    return p.variants.filter((v) => (v.stock ?? 0) > 0).map((v) => v.size);
  }
  return Array.isArray(p?.sizes) ? p.sizes : [];
}

function FavoritesTab() {
  const { products, count, remove, loading } = useFavorites();
  const { add } = useCart();
  const [hoverSlug, setHoverSlug] = useState(null);
  // Per-card add state, keyed by slug so one card's spinner never freezes the grid.
  const [picking, setPicking] = useState(null);   // slug whose size row is open
  const [addingSlug, setAddingSlug] = useState(null);
  const [addedSlug, setAddedSlug] = useState(null);
  const [addError, setAddError] = useState({});   // slug -> message

  /**
   * A cart line needs a size and the wishlist only stores a product, so the size has
   * to be asked for here. One buyable size skips the question — asking someone to
   * confirm the only possible answer is friction, not care.
   */
  const addToCart = async (p, size) => {
    setAddingSlug(p.slug);
    setAddError((e) => ({ ...e, [p.slug]: "" }));
    try {
      await add(p.slug, size, 1);
      setPicking(null);
      setAddedSlug(p.slug);
      setTimeout(() => setAddedSlug((s) => (s === p.slug ? null : s)), 2200);
    } catch (err) {
      // e.g. "Only 2 left in that size" — the server is the authority on stock, and
      // the wishlist row may have been cached since before someone else bought it.
      setAddError((e) => ({ ...e, [p.slug]: apiMessage(err, "Could not add that to your cart.") }));
    } finally {
      setAddingSlug(null);
    }
  };

  const startAdd = (p) => {
    const sizes = buyableSizes(p);
    if (sizes.length === 1) return addToCart(p, sizes[0]);
    setAddError((e) => ({ ...e, [p.slug]: "" }));
    setPicking((s) => (s === p.slug ? null : p.slug));
  };

  // Restock watches load with the tab rather than the dashboard — nothing outside
  // this page asks for them.
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsDown, setAlertsDown] = useState(false);
  const [alertsError, setAlertsError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const rows = await stockAlertApi.list();
        if (live) { setAlerts(rows); setAlertsDown(false); }
      } catch {
        if (live) { setAlerts([]); setAlertsDown(true); }
      } finally {
        if (live) setAlertsLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  // DELETE answers with a message, not the new list, so the row goes locally — a
  // refetch would only re-fetch what we already know.
  const dropAlert = async (a) => {
    setAlertsError("");
    try {
      await stockAlertApi.remove(a.id);
      setAlerts((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      setAlertsError(apiMessage(err, "Could not drop that alert."));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, animation: "fadeUp 0.4s both" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <h1 style={pageTitle}>Favorites<span style={{ color: "#F97B0C" }}>.</span></h1>
        <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#F97B0C" }}>{count} SAVED</span>
      </div>

      {loading ? (
        <p style={{ color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING…</p>
      ) : products.length === 0 ? (
        <div style={{ border: "2px dashed #101010", background: "#FFFDF8", padding: "44px 24px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>♡</span>
          <p style={{ fontFamily: "Anton, sans-serif", fontSize: 22, margin: 0, textTransform: "uppercase" }}>Nothing saved yet.</p>
          <p style={{ margin: 0, fontSize: 14, color: "#6B6357", fontWeight: 500, maxWidth: 360, lineHeight: 1.6 }}>
            Tap the heart on any product to keep it here — it follows you to every device you sign in on.
          </p>
          <Link to="/products" style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", textDecoration: "none", border: "2px solid #101010", padding: "13px 24px", boxShadow: "4px 4px 0 #F97B0C" }}>
            BROWSE THE DROP
          </Link>
        </div>
      ) : (
        <div className="rf-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {products.map((p) => (
            <div key={p.slug} style={{ border: "2px solid #101010", background: "#FFFDF8", display: "flex", flexDirection: "column", position: "relative" }}>
              <button
                onClick={() => remove(p.slug)}
                onMouseEnter={() => setHoverSlug(p.slug)}
                onMouseLeave={() => setHoverSlug(null)}
                aria-label={`Remove ${p.name} from wishlist`}
                style={{ position: "absolute", top: 10, right: 10, zIndex: 2, width: 30, height: 30, border: "2px solid #101010", background: hoverSlug === p.slug ? "#C0392B" : "#F6F1E7", color: hoverSlug === p.slug ? "#F6F1E7" : "#101010", fontSize: 14, fontWeight: 900, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
              {/* Square and `contain`, matching the rest of the catalogue — the shots
                  are square, and this card was showing placeholder text even for
                  products that have a real photo on the payload. */}
              <Link to={`/product/${p.slug}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1 / 1", background: p.image ? "#FFFFFF" : "#ECE5D6", borderBottom: "2px solid #101010", padding: p.image ? 0 : 24, color: "#A99F8C", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textAlign: "center", textDecoration: "none" }}>
                {p.image
                  ? <img src={p.image} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  : p.placeholder}
              </Link>
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                <Link to={`/product/${p.slug}`} style={{ fontFamily: "Anton, sans-serif", fontSize: 18, textTransform: "uppercase", lineHeight: 1, color: "#101010", textDecoration: "none" }}>{p.name}</Link>
                <span style={{ fontFamily: "Anton, sans-serif", fontSize: 17, color: "#F97B0C" }}>{p.price_formatted}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#6B6357" }}>
                  {p.rating_count ? `${Number(p.rating_average).toFixed(1)} ★ (${p.rating_count})` : "No ratings yet"}
                </span>
                {/* Straight back into the cart. A wishlist whose only verb is "go look
                    at it again" makes the shopper redo the journey that put it here. */}
                {(() => {
                  const sizes = buyableSizes(p);
                  const soldOut = sizes.length === 0;
                  const busy = addingSlug === p.slug;
                  const open = picking === p.slug;
                  return (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 8 }}>
                      {open && !soldOut && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {sizes.map((s) => (
                            <button
                              key={s}
                              onClick={() => addToCart(p, s)}
                              disabled={busy}
                              style={{ flex: "1 0 auto", minWidth: 44, fontFamily: "Anton, sans-serif", fontSize: 14, border: "2px solid #101010", background: "#F6F1E7", color: "#101010", padding: "8px 6px", cursor: busy ? "progress" : "pointer" }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => !soldOut && startAdd(p)}
                        disabled={soldOut || busy}
                        style={{
                          textAlign: "center", fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.06em",
                          background: soldOut ? "#ECE5D6" : addedSlug === p.slug ? "#1F8A5B" : "#101010",
                          color: soldOut ? "#6B6357" : "#F6F1E7", border: "2px solid #101010", padding: 10,
                          boxShadow: soldOut ? "none" : "3px 3px 0 #F97B0C",
                          cursor: soldOut ? "not-allowed" : busy ? "progress" : "pointer",
                        }}
                      >
                        {soldOut ? "SOLD OUT" : busy ? "ADDING…" : addedSlug === p.slug ? "ADDED TO CART ✓" : open ? "PICK A SIZE ↑" : "ADD TO CART"}
                      </button>
                      {addError[p.slug] && (
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#C0392B", lineHeight: 1.45 }}>{addError[p.slug]}</span>
                      )}
                      <Link to={`/product/${p.slug}`} style={{ textAlign: "center", fontWeight: 800, fontSize: 11, letterSpacing: "0.12em", color: "#6B6357", textDecoration: "underline", textUnderlineOffset: 3 }}>
                        VIEW PRODUCT
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 18 }}>
          <span style={sectionHead}>Waiting on a restock</span>
          {alerts.length > 0 && (
            <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.14em", color: "#F97B0C" }}>{alerts.length} WATCHING</span>
          )}
        </div>

        {alertsError && <div style={{ ...errorBanner, marginBottom: 14 }}>{alertsError}</div>}

        {alertsLoading ? (
          <p style={{ margin: 0, color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING…</p>
        ) : alertsDown ? (
          <p style={{ margin: 0, padding: "20px 16px", border: "2px dashed #101010", background: "#FFFDF8", fontSize: 14, color: "#6B6357", fontWeight: 500 }}>
            Couldn't reach your restock list just now. Reload the page to try again.
          </p>
        ) : alerts.length === 0 ? (
          <p style={{ margin: 0, padding: "20px 16px", border: "2px dashed #101010", background: "#FFFDF8", fontSize: 14, color: "#6B6357", fontWeight: 500, lineHeight: 1.6 }}>
            Nothing on the list. Sold out in your size? Hit NOTIFY ME on the product page and we'll email you the moment it's back — first come, first served.
          </p>
        ) : (
          <div style={{ border: "2px solid #101010", background: "#FFFDF8" }}>
            {alerts.map((a, ix) => (
              <div key={a.id} className="rf-line" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 16px", borderTop: ix ? "1px solid #E7DFCE" : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <Link to={`/product/${a.slug}`} style={{ fontFamily: "Anton, sans-serif", fontSize: 16, textTransform: "uppercase", lineHeight: 1.1, color: "#101010", textDecoration: "none" }}>
                    {a.product_name}
                  </Link>
                  <span style={{ fontSize: 12, color: "#6B6357", fontWeight: 600 }}>
                    Size {a.size}{a.price_formatted ? ` · ${a.price_formatted}` : ""} · Asked {shortDate(a.created_at)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  {/* notified_at set means the mail already went out — the row is a
                      receipt at that point, not a live watch. */}
                  {a.in_stock ? (
                    <Link to={`/product/${a.slug}`} style={{ fontFamily: "Anton, sans-serif", fontSize: 12, letterSpacing: "0.06em", background: "#F97B0C", color: "#101010", textDecoration: "none", border: "2px solid #101010", padding: "7px 12px" }}>
                      BACK IN STOCK →
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 900, fontSize: 10, letterSpacing: "0.14em", color: "#6B6357", whiteSpace: "nowrap" }}>
                      {a.notified_at ? `NOTIFIED ${shortDate(a.notified_at)}` : "WATCHING"}
                    </span>
                  )}
                  <button
                    onClick={() => dropAlert(a)}
                    onMouseEnter={() => setHoverSlug(`alert-${a.id}`)}
                    onMouseLeave={() => setHoverSlug(null)}
                    aria-label={`Stop watching ${a.product_name}, size ${a.size}`}
                    style={{ width: 30, height: 30, border: "2px solid #101010", background: hoverSlug === `alert-${a.id}` ? "#C0392B" : "#F6F1E7", color: hoverSlug === `alert-${a.id}` ? "#F6F1E7" : "#101010", fontSize: 14, fontWeight: 900, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- Address book (full CRUD) ------------------------------------------------

const BLANK_DRAFT = { name: "", street: "", barangay: "", city: "", province: "", postal: "", phone: "" };

function AddressBook({ addresses, onChanged, fromCart = false }) {
  /*
   * Came here from the cart's "no address saved" prompt, so the trip needs a return
   * leg. `savedHere` flips once a save succeeds during THIS visit — the banner then
   * changes from "you were checking out" to an actual "back to cart" offer.
   *
   * Deliberately not automatic: bouncing them back the instant a save lands would
   * take the page away mid-thought, and some people want to add a second address or
   * check the default flags before returning. The offer waits to be taken.
   */
  const [savedHere, setSavedHere] = useState(false);
  const [modal, setModal] = useState({ open: false, target: null, source: null });
  const [draft, setDraft] = useState(BLANK_DRAFT);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const defaultShipping = addresses.find((a) => a.is_default_shipping) || null;
  const defaultBilling = addresses.find((a) => a.is_default_billing) || null;
  // Independent tests, mirroring the mockup: one row can hold both defaults, and
  // must then show in both slots rather than falling into "additional entries".
  const extras = addresses.filter((a) => !a.is_default_shipping && !a.is_default_billing);

  const close = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  useEffect(() => {
    if (!modal.open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.open, close]);

  const openModal = (target) => {
    const source =
      target === "billing" ? defaultBilling :
      target === "shipping" ? defaultShipping :
      target.index >= 0 ? extras[target.index] : null;
    setDraft(source
      ? { name: source.name || "", street: source.street || "", barangay: source.barangay || "", city: source.city || "", province: source.province || "", postal: source.postal || "", phone: source.phone || "" }
      : BLANK_DRAFT);
    setError("");
    setModal({ open: true, target, source: source || null });
  };

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const title =
    modal.target === "billing" ? "Change Billing Address" :
    modal.target === "shipping" ? "Change Shipping Address" :
    modal.target && modal.target.index === -1 ? "Add New Address" : "Edit Address";

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        street: draft.street.trim(),
        barangay: draft.barangay.trim() || null,
        city: draft.city.trim(),
        province: draft.province.trim(),
        postal: draft.postal.trim() || null,
        // OR against what the row already held: a single address can be both
        // defaults, and editing it through the billing card must not silently
        // strip its shipping flag.
        is_default_billing: modal.target === "billing" || !!modal.source?.is_default_billing,
        is_default_shipping: modal.target === "shipping" || !!modal.source?.is_default_shipping,
      };
      if (modal.source?.id) await addressApi.update(modal.source.id, payload);
      else await addressApi.create(payload);
      // Re-read rather than patching state: the server moves the default flag off
      // whichever address held it before.
      await onChanged();
      setSavedHere(true);
      close();
    } catch (err) {
      setError(err?.message || "Could not save that address.");
    } finally {
      setSaving(false);
    }
  };

  const destroy = async (a) => {
    setError("");
    try {
      await addressApi.remove(a.id);
      await onChanged();
    } catch (err) {
      setError(err?.message || "Could not delete that address.");
    }
  };

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 48, animation: "fadeUp 0.4s both" }}>
        <h1 style={pageTitle}>Address Book<span style={{ color: "#F97B0C" }}>.</span></h1>

        {fromCart && (
          <div
            style={{
              border: "2px solid #101010",
              background: savedHere ? "#F97B0C" : "#FFFDF8",
              boxShadow: "6px 6px 0 #101010",
              padding: "18px 20px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              marginTop: -20,
            }}
          >
            <div>
              <span style={{ display: "block", fontWeight: 900, fontSize: 11, letterSpacing: "0.2em", color: savedHere ? "#101010" : "#F97B0C" }}>
                {savedHere ? "ADDRESS SAVED" : "YOU WERE CHECKING OUT"}
              </span>
              <span style={{ display: "block", marginTop: 4, fontSize: 13, fontWeight: 700, color: "#101010" }}>
                {savedHere
                  ? "That's it — your cart is still waiting."
                  : "Save an address here and we'll take you straight back to your cart."}
              </span>
            </div>
            <Link
              to="/cart"
              className="rf-cta"
              style={{
                fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.08em",
                textDecoration: "none", background: "#101010", color: "#F6F1E7",
                border: "2px solid #101010", padding: "13px 22px", whiteSpace: "nowrap",
              }}
            >
              {savedHere ? "BACK TO CART →" : "RETURN TO CART"}
            </Link>
          </div>
        )}

        {error && !modal.open && <div style={errorBanner}>{error}</div>}

        <section>
          <span style={{ ...sectionHead, display: "block", borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 22 }}>Default Addresses</span>
          <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <AddressCard label="Default Billing Address" address={defaultBilling} editLabel="Change Billing Address" onEdit={() => openModal("billing")} />
            <AddressCard label="Default Shipping Address" address={defaultShipping} editLabel="Change Shipping Address" onEdit={() => openModal("shipping")} />
          </div>
        </section>

        <section>
          <span style={{ ...sectionHead, display: "block", borderBottom: "2px solid #101010", paddingBottom: 12, marginBottom: 22 }}>Additional Address Entries</span>
          {extras.length ? (
            <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 26 }}>
              {extras.map((a, i) => (
                <AddressCard
                  key={a.id}
                  label={a.label || ""}
                  address={a}
                  editLabel="Edit"
                  onEdit={() => openModal({ index: i })}
                  secondLabel="Remove"
                  onSecond={() => destroy(a)}
                />
              ))}
            </div>
          ) : (
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#6B6357", fontWeight: 500 }}>You have no other address entries in your address book.</p>
          )}
          <button className="rf-cta" onClick={() => openModal({ index: -1 })} style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.06em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "13px 24px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C" }}>
            ADD NEW ADDRESS
          </button>
        </section>
      </div>

      {/* Kept mounted so the fade/scale transition has something to animate
          between, and deliberately outside the fadeUp wrapper — an animated
          transform on an ancestor would make position:fixed resolve against it
          instead of the viewport. */}
      <div
        onClick={close}
        aria-hidden="true"
        style={{ position: "fixed", inset: 0, background: "rgba(16,16,16,0.55)", zIndex: 190, opacity: modal.open ? 1 : 0, pointerEvents: modal.open ? "auto" : "none", visibility: modal.open ? "visible" : "hidden", transition: "opacity 0.25s, visibility 0.25s" }}
      />
      {/* visibility, not just pointer-events: a closed modal must leave the tab
          order too, or focus walks through seven invisible inputs. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!modal.open}
        style={{ position: "fixed", top: "50%", left: "50%", width: "min(520px, 92vw)", maxHeight: "86vh", overflowY: "auto", background: "#F6F1E7", border: "2px solid #101010", boxShadow: "10px 10px 0 #101010", zIndex: 200, opacity: modal.open ? 1 : 0, pointerEvents: modal.open ? "auto" : "none", visibility: modal.open ? "visible" : "hidden", transform: `translate(-50%, -50%) scale(${modal.open ? 1 : 0.94})`, transition: "opacity 0.25s, transform 0.25s cubic-bezier(.2,.7,.2,1), visibility 0.25s" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "2px solid #101010" }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 19, textTransform: "uppercase" }}>{title}</span>
          <button onClick={close} aria-label="Close" style={{ background: "none", border: "2px solid #101010", width: 34, height: 34, fontSize: 15, fontWeight: 900, cursor: "pointer" }}>✕</button>
        </div>
        <form onSubmit={save} style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={fieldWrap}>
            <span style={lbl}>Full Name</span>
            <input type="text" required value={draft.name} onChange={set("name")} style={field} />
          </label>
          <label style={fieldWrap}>
            <span style={lbl}>Street Address</span>
            <input type="text" required value={draft.street} onChange={set("street")} placeholder="Blk / Lot / Street" style={field} />
          </label>
          <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={fieldWrap}>
              <span style={lbl}>Barangay</span>
              <input type="text" value={draft.barangay} onChange={set("barangay")} style={field} />
            </label>
            <label style={fieldWrap}>
              <span style={lbl}>City / Municipality</span>
              <input type="text" required value={draft.city} onChange={set("city")} style={field} />
            </label>
          </div>
          <div className="rf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={fieldWrap}>
              <span style={lbl}>Province</span>
              <input type="text" required value={draft.province} onChange={set("province")} style={field} />
            </label>
            <label style={fieldWrap}>
              <span style={lbl}>Postal Code</span>
              <input type="text" value={draft.postal} onChange={set("postal")} style={field} />
            </label>
          </div>
          <label style={fieldWrap}>
            <span style={lbl}>Phone</span>
            <input type="tel" required value={draft.phone} onChange={set("phone")} placeholder="63 9XXXXXXXXX" style={field} />
          </label>

          {error && modal.open && <div style={errorBanner}>{error}</div>}

          <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
            <button type="submit" disabled={saving} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "13px 22px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C", opacity: saving ? 0.6 : 1 }}>
              {saving ? "SAVING…" : "SAVE ADDRESS"}
            </button>
            <button type="button" onClick={close} style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "none", color: "#101010", border: "2px solid #101010", padding: "13px 22px", cursor: "pointer" }}>
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ---- Profile edit form -------------------------------------------------------

const field = { fontFamily: "Archivo, sans-serif", fontSize: 14, fontWeight: 600, padding: "12px 14px", border: "2px solid #101010", background: "#FFFDF8", color: "#101010", width: "100%" };
const selectField = { ...field, padding: "12px 8px" };
const lbl = { fontWeight: 900, fontSize: 12, letterSpacing: "0.06em" };
const fieldWrap = { display: "flex", flexDirection: "column", gap: 6 };
const req = <span style={{ color: "#F97B0C" }}>*</span>;

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

function parseBirthDate(value) {
  const blank = { month: "", day: "", year: "" };
  if (!value) return blank;
  const [y, m, d] = String(value).split("-");
  if (!y || !m || !d) return blank;
  // The day select holds unpadded values ('1'..'31'); the month select is padded.
  return { month: m, day: String(Number(d)), year: y };
}

function toBirthDate(f) {
  if (!f.dobYear || !f.dobMonth || !f.dobDay) return null;
  return `${f.dobYear}-${f.dobMonth}-${String(f.dobDay).padStart(2, "0")}`;
}

function ProfileForm({ acct, setUser, onSaved, openPassword, onExit }) {
  const years = useMemo(() => Array.from({ length: 70 }, (_, i) => String(new Date().getFullYear() - i)), []);

  const [form, setForm] = useState(() => {
    const dob = parseBirthDate(acct.birth_date);
    const parts = (acct.name || "").trim().split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" "),
      dobMonth: dob.month,
      dobDay: dob.day,
      dobYear: dob.year,
      // Blank, not a default value — the diff check below compares against
      // (acct.gender || ""), so seeding a real option here would PATCH a gender
      // the user never picked on every save.
      gender: acct.gender || "",
      phone: acct.phone || "",
      email: acct.email || "",
      currentPassword: "",
      newPassword: "",
    };
  });
  const [changeEmail, setChangeEmail] = useState(false);
  const [changePassword, setChangePassword] = useState(!!openPassword);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // PATCH is partial — send only what actually changed.
    const payload = {};
    const name = `${form.firstName} ${form.lastName}`.trim();
    if (name !== (acct.name || "")) payload.name = name;
    const phone = form.phone.trim();
    if (phone !== (acct.phone || "")) payload.phone = phone || null;
    const birth = toBirthDate(form);
    if (birth !== (acct.birth_date || null)) payload.birth_date = birth;
    if (form.gender !== (acct.gender || "")) payload.gender = form.gender || null;
    if (changeEmail && form.email.trim() && form.email.trim() !== acct.email) payload.email = form.email.trim();
    if (changePassword && form.newPassword) payload.password = form.newPassword;
    // The server refuses either credential change without it.
    if (payload.email || payload.password) payload.current_password = form.currentPassword;

    if (Object.keys(payload).length === 0) {
      onExit();
      return;
    }

    setSaving(true);
    try {
      const res = await accountApi.update(payload);
      if (res.token) localStorage.setItem("token", res.token); // credential change rotates the token
      if (res.user) setUser(res.user);
      await onSaved?.();
      onExit();
    } catch (err) {
      setError(err?.message || "Could not save your account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, animation: "fadeUp 0.4s both", maxWidth: 520 }}>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(30px, 5vw, 42px)", margin: 0, textTransform: "uppercase" }}>Edit Account Information<span style={{ color: "#F97B0C" }}>.</span></h1>
      <span style={{ fontFamily: "Anton, sans-serif", fontSize: 18, textTransform: "uppercase", display: "block", borderBottom: "2px solid #101010", paddingBottom: 10 }}>Account Information</span>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 4 }}>
        <label style={fieldWrap}>
          <span style={lbl}>First Name {req}</span>
          <input type="text" required value={form.firstName} onChange={set("firstName")} style={field} />
        </label>
        <label style={fieldWrap}>
          <span style={lbl}>Last Name {req}</span>
          <input type="text" required value={form.lastName} onChange={set("lastName")} style={field} />
        </label>

        <div>
          {/* No asterisk here: birth_date is nullable server-side, and the blank
              option is what stops an untouched form writing a made-up birthday. */}
          <span style={{ ...lbl, display: "block", marginBottom: 6 }}>Date of Birth</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: 10 }}>
            <select value={form.dobMonth} onChange={set("dobMonth")} style={selectField} aria-label="Birth month">
              <option value="">—</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={form.dobDay} onChange={set("dobDay")} style={selectField} aria-label="Birth day">
              <option value="">—</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={form.dobYear} onChange={set("dobYear")} style={selectField} aria-label="Birth year">
              <option value="">—</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <label style={fieldWrap}>
          <span style={lbl}>Gender {req}</span>
          <select value={form.gender} onChange={set("gender")} style={field}>
            <option value="">—</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Rather not say">Rather not say</option>
          </select>
        </label>

        <label style={fieldWrap}>
          <span style={lbl}>Phone Number {req}</span>
          <input type="tel" required value={form.phone} onChange={set("phone")} placeholder="63 9XXXXXXXXX" style={field} />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={changeEmail} onChange={(e) => setChangeEmail(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#F97B0C" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F97B0C" }}>Change Email</span>
        </label>
        {changeEmail && (
          <label style={{ ...fieldWrap, marginLeft: 28 }}>
            <span style={lbl}>New Email</span>
            <input type="email" value={form.email} onChange={set("email")} style={field} />
          </label>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={changePassword} onChange={(e) => setChangePassword(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#F97B0C" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F97B0C" }}>Change Password</span>
        </label>
        {(changeEmail || changePassword) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginLeft: 28 }}>
            <label style={fieldWrap}>
              <span style={lbl}>Current Password</span>
              <input type="password" value={form.currentPassword} onChange={set("currentPassword")} placeholder="••••••••" style={field} />
            </label>
            {changePassword && (
              <label style={fieldWrap}>
                <span style={lbl}>New Password</span>
                <input type="password" value={form.newPassword} onChange={set("newPassword")} placeholder="••••••••" style={field} />
              </label>
            )}
          </div>
        )}

        {error && <div style={errorBanner}>{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" disabled={saving} className="rf-cta" style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.03em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "14px 26px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C", opacity: saving ? 0.6 : 1 }}>
            {saving ? "SAVING…" : "SAVE"}
          </button>
          <button type="button" onClick={onExit} style={{ fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.03em", background: "none", color: "#101010", border: "2px solid #101010", padding: "14px 26px", cursor: "pointer" }}>
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
}

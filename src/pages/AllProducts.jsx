import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Nav from "../components/layout/Nav";
import Footer from "../components/layout/Footer";
import ProductTile from "../components/product/ProductTile";
import { useProducts } from "../hooks/useProducts";
import { toDropCard } from "../utils/product";

const AUDIENCES = [
  { label: "ALL", value: "" },
  { label: "MEN", value: "men" },
  { label: "WOMEN", value: "women" },
  { label: "ACCESSORIES", value: "accessories" },
];

const SIZE_ORDER = ["S", "M", "L", "XL", "2XL", "OS"];

const TYPE_GROUPS = [
  { heading: "TOPWEAR", items: [{ key: "hoodie", label: "Hoodies" }, { key: "tee", label: "Tees" }] },
  { heading: "BOTTOMWEAR", items: [{ key: "shorts", label: "Shorts" }, { key: "underwear", label: "Underwear" }] },
  { heading: "OTHER", items: [{ key: "bag", label: "Bags" }, { key: "socks", label: "Socks" }] },
];

const EYEBROW_BY_TAG = { NEW: "NEW ARRIVALS", "BEST SELLER": "BEST SELLERS" };

// The API caps per_page at 60 and the mockup has no pager, so the whole rack
// arrives in one page and `meta.last_page` stays 1.
const PER_PAGE = 60;
// Module-level so its JSON key is stable: the drawer's per-type counts are of the
// WHOLE catalog (mockup), so this query must not re-run when the filters change.
const CATALOG_PARAMS = { per_page: PER_PAGE };

const splitParam = (value) => value.split(",").filter(Boolean);

export default function AllProducts() {
  // Filters live in the URL (?type= / ?audience= / ?tag= / ?size= / ?search=) so
  // the Shop collection tiles are just links, the state is shareable — and the
  // grid re-queries the API.
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get("type") || "";
  const audience = searchParams.get("audience") || "";
  const tag = searchParams.get("tag") || "";
  const size = searchParams.get("size") || "";
  const search = searchParams.get("search") || "";
  const types = splitParam(type);
  const sizes = splitParam(size);

  const [searchFocused, setSearchFocused] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filter = {
    per_page: PER_PAGE,
    ...(type && { type }),
    ...(audience && { audience }),
    ...(tag && { tag }),
    ...(size && { size }),
    ...(search && { search }),
  };

  // The hook debounces `search`, so the URL can take every keystroke.
  const { products, loading, error, searching } = useProducts(filter);
  const { products: catalog } = useProducts(CATALOG_PARAMS);

  // Each filter writes back only its own key — arriving from Shop's Hoodies tile
  // (?type=hoodie) and tapping MEN must not throw the type away.
  const writeParam = (key, value, replace = false) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace });
  };
  const selectAudience = (value) => writeParam("audience", audience === value ? "" : value);
  const toggleIn = (key, list, value) =>
    writeParam(key, (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]).join(","));
  // Replace, not push: otherwise Back walks the shopper letter-by-letter out of
  // what they just typed.
  const writeSearch = (value) => writeParam("search", value, true);
  const clearFilters = () => setSearchParams({});

  // Escape closes the drawer — it covers the page, so it needs a keyboard way out.
  useEffect(() => {
    if (!filterOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setFilterOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterOpen]);

  // Search now runs on the server (?search=), across the whole catalogue rather
  // than the page that happens to be loaded.
  const shown = products
    // The API folds 'unisex' into every audience filter — right for MEN/WOMEN,
    // but it hands back apparel for ACCESSORIES, which is an audience of its own.
    .filter((p) => audience !== "accessories" || p.audience === "accessories")
    .map((p, i) => toDropCard(p, i));

  const typeCounts = {};
  catalog.forEach((p) => {
    typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
  });

  const activeFilterCount = sizes.length + types.length + (tag ? 1 : 0);
  const hasFilters = activeFilterCount > 0 || Boolean(audience);
  // Waiting out the debounce or waiting on the API — either way what's on screen
  // is the previous query's answer.
  const busy = searching || (loading && shown.length > 0);
  const filterBtnOn = filterOpen || activeFilterCount > 0;

  const chipStyle = (active) => ({
    fontFamily: "Anton, sans-serif",
    fontSize: 14,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    background: active ? "#101010" : "#F6F1E7",
    color: active ? "#F6F1E7" : "#101010",
    border: "2px solid #101010",
    padding: "8px 18px",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  });

  return (
    <div style={{ background: "#F6F1E7", color: "#101010", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />

      {/* Header */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "112px 32px 30px" }}>
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.22em", color: "#F97B0C" }}>
          {EYEBROW_BY_TAG[tag] || "ALL PRODUCTS"}
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", justifyContent: "space-between", gap: 24, marginTop: 10 }}>
          <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, fontSize: "clamp(52px, 8vw, 120px)", margin: 0, textTransform: "uppercase", lineHeight: 0.86 }}>
            All products<span style={{ color: "#F97B0C" }}>.</span>
          </h1>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
            <p style={{ margin: "0 0 4px", maxWidth: 300, fontSize: 14, lineHeight: 1.6, color: "#6B6357", fontWeight: 500 }}>
              Every piece is printed in small batches in Quezon City. Once a colorway sells out, it's gone.
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

      {/* Search */}
      <section role="search" style={{ maxWidth: 1440, margin: "0 auto", padding: "0 32px 18px" }}>
        {/* The input drops its native outline, so the whole bar carries the focus
            ring instead (WCAG 2.4.7) — :focus-within, done with React's bubbling
            focus events since the page owns no stylesheet. */}
        <div
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFDF8", border: "2px solid #101010", boxShadow: "6px 6px 0 #F97B0C", padding: "14px 18px", outline: searchFocused ? "3px solid #F97B0C" : "none", outlineOffset: 2 }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#101010" strokeWidth="2.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="10.5" cy="10.5" r="7" />
            <line x1="15.6" y1="15.6" x2="21" y2="21" />
          </svg>
          <input
            value={search}
            onChange={(e) => writeSearch(e.target.value)}
            // The query is already in the URL; Enter would only re-submit it.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            type="text"
            // The API rejects anything longer, so stop it at the keyboard.
            maxLength={80}
            aria-label="Search the drop"
            placeholder="SEARCH THE DROP — TEES, HOODIES, BAGS…"
            style={{ flex: 1, fontFamily: "Anton, sans-serif", fontSize: 18, letterSpacing: "0.04em", textTransform: "uppercase", border: "none", background: "none", outline: "none", color: "#101010", minWidth: 0 }}
          />
          {search && (
            <button
              onClick={() => writeSearch("")}
              style={{ flexShrink: 0, fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.08em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "6px 12px", cursor: "pointer", lineHeight: 1 }}
            >
              CLEAR ✕
            </button>
          )}
        </div>
      </section>

      {/* Filter bar */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "0 32px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "2px solid #101010", borderBottom: "2px solid #101010", padding: "14px 0", flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterOpen(true)}
            aria-expanded={filterOpen}
            style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", background: filterBtnOn ? "#101010" : "transparent", color: filterBtnOn ? "#F6F1E7" : "#101010", border: "2px solid #101010", padding: "8px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, boxShadow: "3px 3px 0 #F97B0C", transition: "background 0.15s, color 0.15s" }}
          >
            <span style={{ display: "inline-flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
              <span style={{ width: 15, height: 2, background: "currentColor", display: "block" }} />
              <span style={{ width: 11, height: 2, background: "currentColor", display: "block" }} />
              <span style={{ width: 7, height: 2, background: "currentColor", display: "block" }} />
            </span>
            FILTER
            {activeFilterCount > 0 && (
              <span style={{ background: "#F97B0C", color: "#101010", minWidth: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "Archivo, sans-serif", fontWeight: 900, padding: "0 5px", border: "1.5px solid #101010" }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          <span style={{ width: 2, height: 26, background: "#D9D0BE", margin: "0 2px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {AUDIENCES.map((a) => (
              <button key={a.label} onClick={() => selectAudience(a.value)} style={chipStyle(audience === a.value)}>
                {a.label}
              </button>
            ))}
          </div>
          <span aria-live="polite" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 11, letterSpacing: "0.16em", color: "#6B6357", whiteSpace: "nowrap" }}>
            {busy ? "SEARCHING…" : `${shown.length} ${shown.length === 1 ? "STYLE" : "STYLES"}`}
          </span>
        </div>
      </section>

      {/* Grid */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "4px 32px 100px" }}>
        {/* Only the first load blanks the page. Refining a search re-queries the
            API, and yanking the rack away between keystrokes reads as breakage —
            the tiles stay, dimmed, until the new ones land. */}
        {loading && shown.length === 0 ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "#6B6357", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING THE DROP…</p>
        ) : error ? (
          <p style={{ textAlign: "center", padding: "60px 0", color: "#C0392B", fontWeight: 700 }}>Couldn't reach the store. Is the API running?</p>
        ) : shown.length === 0 ? (
          <div style={{ border: "2px dashed #101010", padding: "72px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <span style={{ fontFamily: "Anton, sans-serif", fontSize: 30, textTransform: "uppercase" }}>
              {search ? <>No hits for “{search}”.</> : "Nothing matches that."}
            </span>
            <p style={{ margin: 0, color: "#6B6357", fontSize: 14, maxWidth: 460 }}>
              {search
                ? `We searched the whole rack${hasFilters ? " inside your filters" : ""} and came up dry. Try a shorter word — “tee”, “wave”, “bag”.`
                : "Loosen the filters — the wave's still out there."}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {search && (
                <button
                  onClick={() => writeSearch("")}
                  style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.1em", background: "#101010", color: "#F6F1E7", border: "2px solid #101010", padding: "12px 22px", cursor: "pointer", boxShadow: "4px 4px 0 #F97B0C" }}
                >
                  CLEAR SEARCH ✕
                </button>
              )}
              {(hasFilters || !search) && (
                <button
                  onClick={clearFilters}
                  style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.1em", background: search ? "transparent" : "#101010", color: search ? "#101010" : "#F6F1E7", border: "2px solid #101010", padding: "12px 22px", cursor: "pointer", boxShadow: search ? "none" : "4px 4px 0 #F97B0C" }}
                >
                  CLEAR {search ? "EVERYTHING" : "FILTERS"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            aria-busy={busy}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 28, opacity: busy ? 0.45 : 1, transition: "opacity 0.18s" }}
          >
            {shown.map((item) => (
              <ProductTile key={item.slug} item={item} corner={item.typeLabel} />
            ))}
          </div>
        )}
      </section>

      <Footer />

      {/* Filter overlay + drawer (left) */}
      <div
        onClick={() => setFilterOpen(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(16,16,16,0.55)", zIndex: 110, opacity: filterOpen ? 1 : 0, pointerEvents: filterOpen ? "auto" : "none", transition: "opacity 0.3s" }}
      />
      {/* Never unmounted so it can slide; `inert` keeps the closed drawer out of the
          tab order instead of parking six focusable controls off-screen.
          Boolean, not the React 18 `inert=""` idiom: React 19 treats an empty
          string on a boolean attribute as FALSE, which left the drawer tabbable. */}
      <aside
        aria-label="Filter"
        inert={!filterOpen}
        style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "min(380px, 100vw)", background: "#F6F1E7", zIndex: 120, borderRight: "2px solid #101010", display: "flex", flexDirection: "column", transform: filterOpen ? "translateX(0)" : "translateX(-105%)", transition: "transform 0.35s cubic-bezier(.2,.7,.2,1)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "2px solid #101010" }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.04em" }}>FILTER</span>
          <button
            onClick={() => setFilterOpen(false)}
            aria-label="Close filters"
            style={{ background: "none", border: "2px solid #101010", width: 36, height: 36, fontSize: 16, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.2em", color: "#6B6357" }}>SIZE</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SIZE_ORDER.map((s) => {
                const on = sizes.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleIn("size", sizes, s)}
                    aria-pressed={on}
                    style={{ fontFamily: "Anton, sans-serif", fontSize: 13, letterSpacing: "0.04em", minWidth: 42, background: on ? "#F97B0C" : "transparent", color: "#101010", border: "2px solid #101010", padding: "8px 10px", cursor: "pointer", transition: "background 0.12s, color 0.12s" }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {TYPE_GROUPS.map((g) => (
            <div key={g.heading} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontWeight: 900, fontSize: 11, letterSpacing: "0.2em", color: "#6B6357" }}>{g.heading}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((it) => {
                  const on = types.includes(it.key);
                  return (
                    <button
                      key={it.key}
                      onClick={() => toggleIn("type", types, it.key)}
                      aria-pressed={on}
                      style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", textAlign: "left", display: "flex", alignItems: "center", gap: 12, background: on ? "#101010" : "#FFFDF8", color: on ? "#F6F1E7" : "#101010", border: "2px solid #101010", padding: "11px 14px", cursor: "pointer", transition: "background 0.12s, color 0.12s" }}
                    >
                      <span style={{ width: 18, height: 18, border: "2px solid currentColor", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                        {on ? "✓" : ""}
                      </span>
                      <span style={{ flex: 1 }}>{it.label}</span>
                      <span style={{ fontFamily: "Archivo, sans-serif", fontWeight: 900, fontSize: 12, opacity: 0.6 }}>{typeCounts[it.key] || 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "18px 24px", borderTop: "2px solid #101010", display: "flex", gap: 12 }}>
          <button
            onClick={clearFilters}
            style={{ fontFamily: "Anton, sans-serif", fontSize: 14, letterSpacing: "0.08em", background: "none", color: "#101010", border: "2px solid #101010", padding: "14px 16px", cursor: "pointer" }}
          >
            CLEAR
          </button>
          <button
            onClick={() => setFilterOpen(false)}
            style={{ flex: 1, fontFamily: "Anton, sans-serif", fontSize: 15, letterSpacing: "0.03em", background: "#F97B0C", color: "#101010", border: "2px solid #101010", padding: 14, cursor: "pointer", boxShadow: "4px 4px 0 #101010" }}
          >
            VIEW {shown.length} ITEMS
          </button>
        </div>
      </aside>
    </div>
  );
}

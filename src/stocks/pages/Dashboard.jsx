// Port of public/dashboard.html.
//
// Three subtabs of one page, selected by the URL hash the sidebar links to
// (#finance / #orders / #intel) — exactly as the original's setDashboardView()
// did. All three stay mounted and are toggled with `display`, because that is
// what the original did and because the Inventory Intelligence markup is
// percentage-width HTML that renders correctly while hidden.
//
// What changed and why:
//   * The four render*() functions that wrote innerHTML are now memoised
//     derivations feeding JSX. `financeTables`, which the chart renderers
//     stashed for the drill-down popups, is a useMemo the charts and the
//     popups both read — same "card, chart and table are three views of one
//     calculation" property, minus the stashing.
//   * sizeChart() measured the <svg> on every render so the chart's viewBox
//     matched its real pixel width. A ResizeObserver does that here, which also
//     replaces the debounced window resize listener AND the
//     requestAnimationFrame(renderAnalytics) that fired when a hidden
//     chart-bearing subtab became visible (a hidden element measures 0, so the
//     original's 520px fallback still applies).
//   * The crosshair/tooltip layer was DOM mutation over a rebuilt innerHTML
//     string; it is state + JSX here. The one remaining direct DOM write is the
//     tooltip's left/top, which can only be computed after the card has been
//     laid out and measured — see useChartHover().
//   * requireAuth() → ProtectedRoute. initSyncStatus() → useSyncStatus +
//     <SyncLine>. authFetch/authDownload → src/api/client.js. escapeHtml() →
//     JSX escapes interpolated text by itself.
//
// Charts are hand-built SVG in the original — no CDN chart library is involved,
// so none was introduced.

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import SyncLine from '../components/SyncLine';
import client, { downloadFile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { dashboardViewFromHash } from '../layouts/AppLayout';
import { compareSizes } from '../utils/sizeOrder';
import { useSyncStatus } from '../utils/syncStatus';

import './Dashboard.css';

// ---------------------------------------------------------------------------
// Constants — copied across unchanged, comments included.
// ---------------------------------------------------------------------------

// Reserved-but-not-yet-a-confirmed-sale statuses — same PENDING_STATUSES
// definition used on the Catalog page, kept in sync manually.
const PENDING_STATUSES = ['new', 'in_process', 'to_pickup', 'shipped'];

// ---- Live pipeline stepper --------------------------------------------
// The six status counters as one glanceable strip: New → In Process →
// To Pickup → Shipped → Completed, plus Cancelled and All set apart by a
// divider. Bars are sized relative to the busiest stage, and the largest
// ACTIONABLE queue (new / in process / to pickup — work staff can act on
// now) carries a "largest queue" flag.
const STEP_META = {
  new: { label: 'New', color: 'blue' },
  in_process: { label: 'In Process', color: 'amber' },
  to_pickup: { label: 'To Pickup', color: 'amber' },
  shipped: { label: 'Shipped', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
};
const FLOW_STAGES = ['new', 'in_process', 'to_pickup', 'shipped', 'completed'];
const QUEUE_BLURB = {
  new: 'printing is the current holdup',
  in_process: 'packing is where orders are piling up right now',
  to_pickup: 'orders are waiting on courier pickup',
};

const STAGE_LABELS = {
  new: 'New',
  in_process: 'In Process',
  to_pickup: 'To Pickup',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  return_requested: 'Return Requested',
  returned: 'Returned',
};

// Solid chart colors per stage — the same four families as the badges
// (blue = moving, amber = watch, green = done, red = attention), so
// chart legends read with the same color language as the rest of the UI.
const STAGE_COLORS = {
  new: '#2563eb',
  in_process: '#d97706',
  to_pickup: '#d97706',
  shipped: '#2563eb',
  completed: '#16a34a',
  cancelled: '#dc2626',
  return_requested: '#d97706',
  returned: '#64748b',
};

// Colors validated with the data-viz palette checker (adjacent + wrap-
// around pairs, since the donut below draws these as a closed ring):
// all four clear the OKLCH lightness band and chroma floor, the worst
// adjacent pair (moderate↔fast) sits in the CVD floor band (6-8, legal
// only with secondary encoding — which is why every tier is ALWAYS
// paired with its emoji + word label, never color alone), and every
// other adjacent pair, including the dead→fast wrap seam, clears the
// ≥15 normal-vision floor.
// Fixed day-since-last-sale thresholds — the warehouse team's own
// classification, not a relative "vs the average mover" comparison: a SKU is
// Fast/Moderate/Slow/Dead purely by how long it's sat since it last sold, so
// the label means the same thing today as it will next month, independent of
// how everything else is selling.
const TIER_META = {
  fast: {
    label: 'Fast Moving', emoji: '🟢', color: '#16a34a',
    range: '0–7 days', meaning: 'Products that sell very frequently.',
  },
  moderate: {
    label: 'Moderate Moving', emoji: '🟡', color: '#f59e0b',
    range: '8–14 days', meaning: 'Products with regular demand.',
  },
  slow: {
    label: 'Slow Moving', emoji: '🟠', color: '#ea580c',
    range: '15–60 days', meaning: 'Products that sell occasionally and should be monitored.',
  },
  dead: {
    label: 'Dead Stock', emoji: '🔴', color: '#991b1b',
    range: '61+ days',
    meaning: 'No sales for over 2 months — consider discounts, promotions, or discontinuation.',
  },
};
const TIER_ORDER = ['fast', 'moderate', 'slow', 'dead'];

// One-hue blue ramp for the size donut. Sizes are an ORDERED scale
// (SMALL → 3XL), so they take an ordinal ramp — light for the smallest
// size, dark for the largest — never the movement palette, which is
// reserved for health. Colour is bound to the size's position in the
// canonical sequence, NOT to how much it sold.
const SIZE_RAMP = ['#6aabfb', '#4a8ef7', '#2f74ee', '#1d5bc4', '#194a9b', '#14356e'];
const OTHER_COLOR = '#94a3b8';

// A donut stops being readable past ~6 wedges, and the ramp has exactly
// 6 validated steps, so a catalog with more sizes than that keeps its 5
// biggest and folds the rest into a gray "Other". The fold is always
// spelled out in the note under the chart — never a silent truncation.
const MAX_SIZE_SEGMENTS = 6;

// "2026-07-02" -> "Jul 2". Axis ticks and tooltips read as dates rather
// than as raw ISO fragments ("07-02"), which take a beat to parse.
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------------------------------------------------------------------------
// Date + formatting helpers
// ---------------------------------------------------------------------------

// Formats a Date as YYYY-MM-DD in LOCAL time. toISOString() converts to
// UTC first, so for a UTC+8 shop every timestamp before 08:00 local
// reported yesterday's date — "Today" would have selected the wrong day
// for the whole morning, and the exclude-today cap would have been off
// by one. Order dates in the sheet are local calendar dates, so the
// comparison has to be local too.
function localISO(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function todayISO() {
  return localISO(new Date());
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISO(d);
}

// Calendar-period starts — "this month"/"this year" answer a reporting
// question that a rolling 30/90-day window can't.
function monthStartISO() {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

function yearStartISO() {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), 0, 1));
}

// The last COMPLETE day — yesterday. Today is still in progress.
function lastCompleteDayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localISO(d);
}

function shortDate(iso) {
  const parts = String(iso).split('-');
  if (parts.length < 3) return iso;
  return MONTH_ABBR[Number(parts[1]) - 1] + ' ' + Number(parts[2]);
}

const peso = (v) => '₱' + Math.round(v).toLocaleString();

const fmtPeso = (v) => '₱' + (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : Math.round(v));

// ---------------------------------------------------------------------------
// Order/inventory helpers
// ---------------------------------------------------------------------------

function countByStatus(orders, status) {
  return orders.filter((o) => o.status === status).length;
}

// An order may bundle multiple line items (one package). Parse the items
// JSON, falling back to the legacy single-item columns for older orders.
//
// `items` is a native MySQL JSON column, so the route hands back an
// already-parsed array. Calling JSON.parse on it throws ("[object Object]"
// isn't JSON), which meant this ALWAYS fell through to the flat summary below:
// multi-item orders were attributed entirely to `o.product` ("NAME +2 more")
// and per-line fields like size were lost. Handle the parsed array first and
// keep the string branch for anything that still arrives serialised.
function dashOrderItems(o) {
  if (Array.isArray(o.items)) {
    if (o.items.length > 0) return o.items;
  } else if (o.items) {
    try {
      const parsed = JSON.parse(o.items);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      /* fall through */
    }
  }
  return [{
    product: o.product,
    sku: o.sku,
    qty: Number(o.qty) || 0,
    price: (Number(o.qty) ? Number(o.total) / Number(o.qty) : Number(o.total)) || 0,
    line_total: Number(o.total) || 0,
  }];
}

// Dates are stored as YYYY-MM-DD strings, so lexical compare == chronological.
function ordersInRange(orders, start, end) {
  return orders.filter((o) => {
    const d = String(o.order_date || '');
    return d >= start && d <= end;
  });
}

// The day an order's revenue is REALISED — the day it was completed, not
// the day it was placed. Orders completed before the stage-date columns
// existed have no completed_date; fall back to order_date so their
// revenue is still counted somewhere rather than silently vanishing.
function completionDate(o) {
  return String(o.completed_date || o.order_date || '');
}

// Revenue is recognised on completion, so every revenue figure works off
// this set — orders COMPLETED inside the window — not off ordersInRange
// (which is placement-based). The two differ in both directions: an order
// placed before the range can complete inside it, and one placed inside it
// may not complete until after.
function completedInRange(orders, start, end) {
  return orders.filter((o) => {
    if (o.status !== 'completed') return false;
    const d = completionDate(o);
    return d >= start && d <= end;
  });
}

// The day an order LEAVES the pipeline, or null while it's still in it.
// Completing realises the money; cancelling writes it off. Either way the
// value stops being "in flight" from that date on.
//
// There is no cancelled_date column, so a cancelled order falls back to the
// last stage it actually reached. An order cancelled straight out of New has
// no stage dates at all and exits on its order date, which UNDERSTATES how
// long it really sat in the pipeline. That's the honest read of the data we
// store rather than a guessed exit date.
function pipelineExitDate(o) {
  if (o.status === 'completed') return String(o.completed_date || o.order_date || '');
  if (o.status === 'cancelled') {
    return String(o.shipped_date || o.to_pickup_date || o.in_process_date || o.order_date || '');
  }
  // A returned order's value left the pipeline when the return was approved.
  if (o.status === 'returned') {
    return String(o.returned_date || o.completed_date || o.shipped_date || o.order_date || '');
  }
  return null; // new / in process / to pickup / shipped / return_requested — still in flight
}

// Analytics never include today: its per-day counts are still accumulating,
// so plotting or exporting them would misrepresent the day (a half-finished
// "today" reads as a slow day). We cap the window end at the last complete
// day. Every consumer — charts, stat cards, summary, and the export — goes
// through here, so they all exclude today the same way, every day.
function getEffectiveRange(rangeStart, rangeEnd) {
  const start = rangeStart || '0000-00-00';
  const end = rangeEnd || '9999-99-99';
  const cap = lastCompleteDayISO();

  // Excluding today keeps a half-finished day from reading as a slump. But it
  // must never be allowed to empty the range: on a shop whose only orders are
  // from today — a new install, or the first day of trading — capping to
  // yesterday put the whole dataset outside the window, and every card read ₱0
  // over "No data in this range" while the trend line underneath reported real
  // money. Cap only when a complete day actually remains to look at.
  const wouldBeEmpty = cap < start;
  const effectiveEnd = (end > cap && ! wouldBeEmpty) ? cap : end;

  return { start, end: effectiveEnd, cappedToday: end > cap && ! wouldBeEmpty };
}

function eachDay(start, end) {
  const days = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  if (isNaN(cur) || isNaN(last) || cur > last) return days;
  // Cap at 92 buckets so the axis stays readable.
  while (cur <= last && days.length < 92) {
    // localISO, not toISOString: `cur` is a LOCAL midnight, so converting it
    // to UTC rolled every bucket back a day east of Greenwich.
    days.push(localISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Whole-number y-axis. Splitting a small max into 4 equal bands and
// rounding each produced repeated labels — a max of 3 rendered as
// "3, 2, 2, 1, 0" — so pick an integer step and scale the plot to the
// rounded-up top of the axis instead of to the raw max.
function integerAxis(max) {
  const BANDS = 4;
  const step = Math.max(1, Math.ceil(max / BANDS));
  const ticks = [];
  for (let i = BANDS; i >= 0; i--) ticks.push(step * i);
  return { ticks, max: step * BANDS };
}

// Evenly spaced x-coordinates, one per day, spanning [left, W-right] —
// used to plot a line chart's points rather than laying out bar boxes.
function linePositions(W, left, right, n) {
  const usableW = W - left - right;
  if (n <= 1) return [left + usableW / 2];
  const step = usableW / (n - 1);
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(left + step * i);
  return xs;
}

// 0–7 days = Fast · 8–14 = Moderate · 15–60 = Slow · 61+ (or never sold)
// = Dead Stock. No gaps or overlaps between bands.
function movementTier(daysSinceLastSale) {
  if (daysSinceLastSale === null) return 'dead'; // never sold at all
  if (daysSinceLastSale <= 7) return 'fast';
  if (daysSinceLastSale <= 14) return 'moderate';
  if (daysSinceLastSale <= 60) return 'slow';
  return 'dead';
}

// Whole days between a YYYY-MM-DD date and right now, clamped so a
// future-dated demo row reads 0 rather than negative. null = no date at all,
// i.e. this SKU has never recorded a sale.
function daysSince(dateStr) {
  if (!dateStr) return null;
  const ms = Date.parse(dateStr + 'T00:00:00');
  if (isNaN(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

// Rolls order lines (cancelled excluded — that stock went back on the
// shelf) into per-SKU lifetime sales and each SKU's most recent sale
// date, then classifies every SKU by days-since-last-sale as of right
// now. SKUs with stock but no sales ever still appear, tagged Dead
// Stock — they're exactly the candidates this view exists to expose.
// `start`/`end` scope the UNITS figures only. The movement tier stays
// anchored to today's date because that's what the tiers mean.
function buildIntel(inventory, orders, start, end) {
  const bySku = {};
  function bucket(sku) {
    if (!bySku[sku]) bySku[sku] = { sku, name: '', size: '', available: null, units: 0, lastSale: '' };
    return bySku[sku];
  }

  inventory.forEach((p) => {
    const b = bucket(p.sku);
    b.name = p.name;
    b.size = p.size || '';
    b.available = Number(p.available) || 0;
  });

  orders.forEach((o) => {
    if (o.status === 'cancelled') return;
    const d = String(o.order_date || '');
    dashOrderItems(o).forEach((it) => {
      if (!it.sku) return;
      const b = bucket(it.sku);
      if (!b.name && it.product) b.name = it.product;
      if (!b.size && it.size) b.size = it.size;
      // lastSale is deliberately NOT range-filtered — it drives the tier.
      if (d > b.lastSale) b.lastSale = d;
      if (d >= start && d <= end) b.units += Number(it.qty) || 0;
    });
  });

  const list = Object.keys(bySku).map((k) => bySku[k]);
  list.forEach((s) => {
    s.daysSinceLastSale = daysSince(s.lastSale);
    s.tier = movementTier(s.daysSinceLastSale);
  });

  return { list, asOf: todayISO(), start, end };
}

// ---------------------------------------------------------------------------
// Chart primitives
// ---------------------------------------------------------------------------

// Port of sizeChart(): fit the chart's coordinate box to the panel's real
// pixel width so the line fills the space instead of sitting centered inside a
// fixed 520px box. A hidden subtab measures 0 and keeps the 520 fallback,
// exactly as `getBoundingClientRect().width || 520` did.
function useChartWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    function measure() {
      setWidth(Math.round(el.getBoundingClientRect().width));
    }
    measure();

    if (typeof ResizeObserver === 'undefined') {
      // Same fallback the original relied on: a debounced window resize.
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width || 520];
}

// ---- Chart hover layer ------------------------------------------------
// A vertical hairline snaps to the nearest day, so the reader aims at a date
// rather than at a 2px line, and one tooltip lists EVERY series at that day.
// `spec` carries the geometry the chart just laid out plus its series.
function useChartHover(spec, svgRef, wrapRef, tipRef, resetKey) {
  const [hover, setHover] = useState(null);

  // Every path that rebuilt a chart in the original called hideChartTip(),
  // because replacing the SVG's innerHTML destroyed the crosshair nodes but
  // left the tooltip — an HTML sibling — stranded with stale numbers on top of
  // a chart that no longer had the data behind them. Same dismissal here,
  // whenever the plotted days or the measured width change.
  useEffect(() => {
    setHover(null);
  }, [resetKey]);

  // Position against .chart-wrap in CSS pixels. This is the one place the port
  // still writes to the DOM: the flip/clamp maths needs the tooltip's own
  // measured width and height, which only exist after it has been laid out
  // with this day's content in it.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!tip || !hover) return;
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    // Flip to the pointer's left near the right edge, and clamp vertically so
    // the card never spills outside the panel.
    const flip = hover.px + tipW + 20 > hover.wrapW;
    tip.style.left = Math.max(0, flip ? hover.px - tipW - 14 : hover.px + 14) + 'px';
    tip.style.top = Math.min(Math.max(0, hover.py - tipH / 2),
      Math.max(0, hover.wrapH - tipH)) + 'px';
  }, [hover, tipRef]);

  function onMove(event) {
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap || spec.xs.length === 0) return;

    // Map the pointer into the SVG's own viewBox units, so the maths holds no
    // matter how the chart is scaled to its panel.
    const box = svg.getBoundingClientRect();
    const scale = spec.W / box.width;
    const x = (event.clientX - box.left) * scale;

    // Snap to the nearest plotted day rather than requiring the reader to land
    // on the exact pixel.
    let idx = 0;
    let best = Infinity;
    for (let i = 0; i < spec.xs.length; i++) {
      const d = Math.abs(spec.xs[i] - x);
      if (d < best) { best = d; idx = i; }
    }

    const wrapBox = wrap.getBoundingClientRect();
    setHover({
      idx,
      px: event.clientX - wrapBox.left,
      py: event.clientY - wrapBox.top,
      wrapW: wrapBox.width,
      wrapH: wrapBox.height,
    });
  }

  function onLeave() {
    setHover(null);
  }

  // The reset effect runs after paint, so guard the render in between against
  // an index that the new, shorter day list no longer has.
  const safeHover = hover && hover.idx < spec.xs.length ? hover : null;
  return { hover: safeHover, onMove, onLeave };
}

// Shaded-area + line for a single series — a line reads as a trend across days
// (including the zero-order gaps) far more clearly than isolated bars do.
// `dashed` renders it with no area fill, for projected figures.
function LineSeriesPath({ xs, ys, top, H, color, dashed }) {
  const linePath = 'M ' + xs.map((x, i) => x + ',' + ys[i]).join(' L ');
  const areaPath = 'M ' + xs[0] + ',' + (top + H) + ' ' +
    xs.map((x, i) => 'L ' + x + ',' + ys[i]).join(' ') +
    ' L ' + xs[xs.length - 1] + ',' + (top + H) + ' Z';

  return (
    <>
      {!dashed && <path d={areaPath} fill={color} fillOpacity="0.10" stroke="none" />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={dashed ? '6 5' : undefined}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </>
  );
}

// One line chart: grid + axis labels, the series, date ticks, the caller's
// direct label, and the crosshair/tooltip layer on top (drawn last, exactly
// where crosshairSvg() was appended).
function ChartPanel({
  id, tipId, height, top, H, left, right,
  days, axisLabels, axisFontSize, series, renderMarker,
  emptyText = 'No data in this range',
}) {
  const [svgRef, W] = useChartWidth();
  const wrapRef = useRef(null);
  const tipRef = useRef(null);

  const xs = useMemo(
    () => (days.length ? linePositions(W, left, right, days.length) : []),
    [W, left, right, days.length],
  );

  const spec = { xs, labels: days, top, H, left, right, W, series };
  const resetKey = days.length + '|' + (days[0] || '') + '|' + (days[days.length - 1] || '') + '|' + W;
  const { hover, onMove, onLeave } = useChartHover(spec, svgRef, wrapRef, tipRef, resetKey);

  const cx = hover ? xs[hover.idx] : -99;

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        id={id}
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={'0 0 ' + W + ' ' + height}
        style={{ marginTop: '10px' }}
      >
        {days.length === 0 ? (
          <text x={W / 2} y={height / 2} fontSize="13" textAnchor="middle" fill="#94a3b8">
            {emptyText}
          </text>
        ) : (
          <>
            {axisLabels.map((label, g) => {
              const y = top + (H / (axisLabels.length - 1)) * g;
              return (
                <g key={g}>
                  <line x1={left} y1={y} x2={W - right} y2={y} stroke="#eef1f5" strokeWidth="1" />
                  <text x={left - 8} y={y + 4} fontSize={axisFontSize} textAnchor="end" fill="#64748b">
                    {label}
                  </text>
                </g>
              );
            })}

            {series.map((s) => (
              <LineSeriesPath
                key={s.name}
                xs={xs}
                ys={s.ys}
                top={top}
                H={H}
                color={s.color}
                dashed={s.dashed}
              />
            ))}

            {/* Date ticks only — per-point value labels are gone, because a
                number on every dot is chaos that goes unread. The crosshair
                tooltip carries any single day's value, and the direct label
                below carries the one that matters at a glance. */}
            {days.map((day, i) => {
              const showLabel = days.length <= 14 || i % Math.ceil(days.length / 12) === 0;
              if (!showLabel) return null;
              return (
                <text
                  key={day}
                  x={xs[i]}
                  y={top + H + 18}
                  fontSize="11"
                  textAnchor="middle"
                  fill="#94a3b8"
                >
                  {shortDate(day)}
                </text>
              );
            })}

            {renderMarker ? renderMarker(xs) : null}

            <g className="cx-layer" style={{ display: hover ? '' : 'none' }}>
              <line className="cx-line" x1={cx} y1={top} x2={cx} y2={top + H} />
              {series.map((s) => (
                <circle
                  key={s.name}
                  className="cx-dot"
                  r="4.5"
                  cx={cx}
                  cy={hover ? s.ys[hover.idx] : -99}
                  fill={s.color}
                />
              ))}
            </g>

            <rect
              className="cx-capture"
              x={left}
              y={top}
              width={W - left - right}
              height={H}
              onMouseMove={onMove}
              onMouseLeave={onLeave}
            />
          </>
        )}
      </svg>

      <div ref={tipRef} id={tipId} className={'chart-tip' + (hover ? ' on' : '')}>
        {hover && (
          <>
            <div className="tip-date">{shortDate(days[hover.idx])}</div>
            {series.map((s) => (
              <div className="tip-row" key={s.name}>
                <span className="tip-key" style={{ background: s.color }} />
                <span className="tip-name">{s.name}</span>
                <span className="tip-val">{s.fmt(s.values[hover.idx])}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// Builds a donut ring as one <circle> per segment, drawn with the
// stroke-dasharray trick (each segment is an arc-length slice of the
// circle's own circumference, offset to sit end-to-end). The group is
// rotated -90° so the first segment starts at 12 o'clock and they
// proceed clockwise, matching how a legend reads top-to-bottom. A small
// gap between segments is the separator — never a border.
//
// Shared by both donuts on this tab (movement tiers and size mix) so they stay
// geometrically identical and only their data and palette differ.
function DonutSegments({ segments, activeKey, onSelect }) {
  const R = 67;
  const STROKE = 34;
  const GAP = 3;
  const C = 2 * Math.PI * R;

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let cumulative = 0;
  const circles = [];
  segments.forEach((s) => {
    if (s.value === 0) return;
    const segLen = (s.value / total) * C;
    // A lone 100% segment must not have a gap cut into it — that would render
    // as a ring with a slice missing rather than a full circle.
    const drawn = segments.length === 1 ? segLen : Math.max(0, segLen - GAP);
    const offset = -cumulative;
    circles.push(
      <circle
        key={s.key}
        className={'donut-seg' + (activeKey === s.key ? ' seg-active' : '')}
        data-key={s.key}
        cx="100"
        cy="100"
        r={R}
        fill="none"
        stroke={s.color}
        strokeWidth={STROKE}
        strokeLinecap="butt"
        strokeDasharray={drawn.toFixed(1) + ' ' + (C - drawn).toFixed(1)}
        strokeDashoffset={offset.toFixed(1)}
        onClick={onSelect ? () => onSelect(s.key) : undefined}
      >
        <title>{s.title}</title>
      </circle>,
    );
    cumulative += segLen;
  });

  return <g transform="rotate(-90 100 100)">{circles}</g>;
}

// Sets a KPI card's trend line: green ↑ for a positive change, red ↓ for a
// negative one, and a neutral dot when the number is informational rather than
// good/bad — the same palette meanings used everywhere else.
function KpiTrend({ id, trend }) {
  if (!trend) return <div className="kpi-trend flat" id={id} />;
  const dir = trend.dir === 'up' ? 'up' : trend.dir === 'down' ? 'down' : 'flat';
  const prefix = trend.dir === 'up' ? '↑ ' : trend.dir === 'down' ? '↓ ' : '● ';
  return <div className={'kpi-trend ' + dir} id={id}>{prefix + trend.text}</div>;
}

// Severity-coded alerts: red rows = out of stock (act now), amber rows = low
// stock (watch closely), blue rows = informational order backlog. The colored
// bar + badge let staff triage the panel in one pass instead of reading every
// line to find what's actually urgent.
function SevRow({ alert }) {
  return (
    <div className={'alert-sev sev-' + alert.sev}>
      <span className="ic">{alert.ic}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="alert-badge">{alert.badge}</span>
        <div className="alert-name">{alert.name}</div>
        {alert.detail ? <div className="alert-detail">{alert.detail}</div> : null}
      </div>
    </div>
  );
}

// ---- Finance drill-down tables ---------------------------------------
// Fed by the same memo the two Finance charts plot, so card, chart and table
// are always three views of one calculation rather than three calculations.

// Completed Revenue → what came in, per day.
function revenueModal(t) {
  if (!t || !t.days.length) {
    return {
      title: 'Completed Revenue',
      desc: 'No data in the selected range.',
      body: <div className="tbl-empty">Nothing completed in this range.</div>,
    };
  }

  // Only days money actually landed — a run of ₱0 rows is noise when the
  // question is "what came in". The skipped count is stated below.
  const earning = [];
  t.days.forEach((day, i) => { if (t.values[i] > 0) earning.push(i); });
  const total = t.values.reduce((a, b) => a + b, 0);
  const orders = t.counts.reduce((a, b) => a + b, 0);
  const quiet = t.days.length - earning.length;

  return {
    title: 'Completed Revenue — day by day',
    desc: peso(total) + ' across ' + earning.length + ' earning day' + (earning.length === 1 ? '' : 's') +
      (quiet ? ' · ' + quiet + ' day' + (quiet === 1 ? '' : 's') + ' with no completions are omitted' : ''),
    body: (
      <table>
        <thead>
          <tr><th>Date</th><th className="col-r">Orders</th><th className="col-r">Revenue</th></tr>
        </thead>
        <tbody>
          {earning.map((i) => (
            <tr key={t.days[i]}>
              <td>{shortDate(t.days[i])}</td>
              <td className="col-r">{t.counts[i]}</td>
              <td className="col-r mv-in">{peso(t.values[i])}</td>
            </tr>
          ))}
          <tr className="tbl-total">
            <td>Total</td>
            <td className="col-r">{orders}</td>
            <td className="col-r">{peso(total)}</td>
          </tr>
        </tbody>
      </table>
    ),
  };
}

// Pipeline Revenue → what entered and left the pipeline, per day.
function pipelineModal(t) {
  if (!t || !t.days.length) {
    return {
      title: 'Pipeline Revenue',
      desc: 'No data in the selected range.',
      body: <div className="tbl-empty">Nothing in flight in this range.</div>,
    };
  }

  const totalIn = t.inflow.reduce((a, b) => a + b, 0);
  const totalOut = t.outflow.reduce((a, b) => a + b, 0);

  return {
    title: 'Pipeline Revenue — daily ins & outs',
    desc: 'Value enters on the order date and leaves when the order completes or is cancelled. ' +
      "Each balance is the previous one plus that day's in, minus its out.",
    body: (
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th className="col-r">In (+)</th>
            <th className="col-r">Out (−)</th>
            <th className="col-r">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan="3" style={{ color: 'var(--muted-dark)' }}>Carried in from before this range</td>
            <td className="col-r">{peso(t.opening)}</td>
          </tr>
          {/* Every day is listed, including flat ones — the balance column only
              makes sense as an unbroken running figure. */}
          {t.days.map((day, i) => {
            const inV = t.inflow[i];
            const outV = t.outflow[i];
            return (
              <tr key={day}>
                <td>{shortDate(day)}</td>
                <td className={'col-r ' + (inV ? 'mv-in' : 'mv-zero')}>{inV ? '+' + peso(inV) : '—'}</td>
                <td className={'col-r ' + (outV ? 'mv-out' : 'mv-zero')}>{outV ? '−' + peso(outV) : '—'}</td>
                <td className="col-r">{peso(t.balance[i])}</td>
              </tr>
            );
          })}
          <tr className="tbl-total">
            <td>Totals</td>
            <td className="col-r mv-in">{'+' + peso(totalIn)}</td>
            <td className="col-r mv-out">{'−' + peso(totalOut)}</td>
            <td className="col-r">{peso(t.balance[t.balance.length - 1])}</td>
          </tr>
        </tbody>
      </table>
    ),
  };
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const location = useLocation();
  const { user } = useAuth();

  const [allInventory, setAllInventory] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  // Everything below reads as "the static markup dashboard.html shipped with"
  // until the first successful load, which is when the original's render*()
  // functions ran for the first time.
  const [loaded, setLoaded] = useState(false);

  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [activePreset, setActivePreset] = useState('all');

  const [searchTerm, setSearchTerm] = useState('');
  const [intelTier, setIntelTier] = useState('fast');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [tableModal, setTableModal] = useState(null); // null | 'revenue' | 'pipeline'

  // Supports deep-linking / refresh via the URL hash (#finance, #orders,
  // #intel) so the selected view survives a reload. AppLayout owns the sub-nav
  // links and exports the same normalisation the original applied.
  const view = dashboardViewFromHash(location.hash);

  // Small status dot + "last synced" line instead of the old wide green banner.
  // On failure it shows a red "Reconnecting…" dot and retries the load.
  const retryRef = useRef(null);
  const sync = useSyncStatus({ retry: () => { if (retryRef.current) retryRef.current(); } });
  const { ok: syncOk, error: syncError } = sync;

  const loadDashboard = useCallback(async () => {
    try {
      const [invResponse, ordersResponse] = await Promise.all([
        client.get('/inventory'),
        client.get('/orders'),
      ]);

      const inventory = invResponse.data;
      const orders = ordersResponse.data;
      setAllInventory(inventory);
      setAllOrders(orders);

      // applyPreset("all") filled the date inputs and then rendered everything
      // the range scopes. Here the range is state, so the equivalent is to seed
      // it from the orders that just arrived; every derived figure follows.
      // Start at the earliest order placement.
      const placed = orders.map((o) => String(o.order_date || '')).filter(Boolean).sort();
      // End at the latest activity — a completion can land AFTER the last order
      // was placed, so consider completed_date too (otherwise those completions
      // fall off the right edge and are never counted). getEffectiveRange still
      // caps this to yesterday so today stays out.
      const activity = orders
        .map((o) => String(o.completed_date || o.order_date || ''))
        .filter(Boolean)
        .sort();
      setRangeStart(placed.length ? placed[0] : todayISO());
      setRangeEnd(activity.length ? activity[activity.length - 1] : todayISO());
      setLoaded(true);

      syncOk(orders.length + ' orders · ' + inventory.length + ' SKUs');
    } catch (err) {
      syncError(err.message);
    }
  }, [syncOk, syncError]);

  useEffect(() => {
    retryRef.current = loadDashboard;
  }, [loadDashboard]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ---- Range ------------------------------------------------------------
  const { start, end, cappedToday } = useMemo(
    () => getEffectiveRange(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const applyPreset = useCallback((preset) => {
    setActivePreset(preset);
    if (preset === 'all') {
      const placed = allOrders.map((o) => String(o.order_date || '')).filter(Boolean).sort();
      const activity = allOrders
        .map((o) => String(o.completed_date || o.order_date || ''))
        .filter(Boolean)
        .sort();
      setRangeStart(placed.length ? placed[0] : todayISO());
      setRangeEnd(activity.length ? activity[activity.length - 1] : todayISO());
    } else if (preset === 'today') {
      setRangeStart(todayISO());
      setRangeEnd(todayISO());
    } else if (preset === '7d') {
      setRangeStart(daysAgoISO(6));
      setRangeEnd(todayISO());
    } else if (preset === '30d') {
      setRangeStart(daysAgoISO(29));
      setRangeEnd(todayISO());
    } else if (preset === '90d') {
      setRangeStart(daysAgoISO(89));
      setRangeEnd(todayISO());
    } else if (preset === 'mtd') {
      setRangeStart(monthStartISO());
      setRangeEnd(todayISO());
    } else if (preset === 'ytd') {
      setRangeStart(yearStartISO());
      setRangeEnd(todayISO());
    }
  }, [allOrders]);

  // Manually picking a date clears the active preset.
  function onRangeStartChange(event) {
    setActivePreset(null);
    setRangeStart(event.target.value);
  }

  function onRangeEndChange(event) {
    setActivePreset(null);
    setRangeEnd(event.target.value);
  }

  // ---- Derived figures --------------------------------------------------
  // Two different bases, deliberately: "Orders"/"Units" measure what was PLACED
  // in the window, while "Completed"/"Revenue" measure what was actually
  // REALISED in it.
  const rows = useMemo(() => ordersInRange(allOrders, start, end), [allOrders, start, end]);
  const completed = useMemo(() => completedInRange(allOrders, start, end), [allOrders, start, end]);
  const revenue = useMemo(
    () => completed.reduce((s, o) => s + (Number(o.total) || 0), 0),
    [completed],
  );
  // Cancelled orders released their stock back to Inventory — those units were
  // never sold, so they don't belong in an "ordered units" figure.
  const units = useMemo(
    () => rows.filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + (Number(o.qty) || 0), 0),
    [rows],
  );

  const days = useMemo(() => eachDay(start, end), [start, end]);

  // ---- KPI cards --------------------------------------------------------
  // renderKpis() also wrote an all-time completed-revenue figure into the
  // Completed Revenue card, but renderAnalytics() overwrote it with the range
  // figure in the same synchronous pass every single time (loadDashboard calls
  // renderKpis() and then applyPreset()), so the all-time value was never
  // painted. The range figure — the one the trend chart below the card plots —
  // is what this renders.
  const revenueTrend = useMemo(() => {
    if (!loaded) return null;
    // Revenue realised in the trailing 7 days vs the 7 days before that, so the
    // owner sees direction, not just a static figure.
    const cur = completedInRange(allOrders, daysAgoISO(6), todayISO())
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const prev = completedInRange(allOrders, daysAgoISO(13), daysAgoISO(7))
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    if (prev > 0) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      return { dir: pct >= 0 ? 'up' : 'down', text: (pct >= 0 ? '+' : '') + pct + '% vs prior 7 days' };
    }
    if (cur > 0) {
      return { dir: 'up', text: '₱' + cur.toLocaleString() + ' in the last 7 days' };
    }
    return { dir: 'flat', text: 'no completions in the last 14 days' };
  }, [allOrders, loaded]);

  const inFlight = useMemo(
    () => allOrders.filter((o) => PENDING_STATUSES.indexOf(o.status) !== -1),
    [allOrders],
  );
  const pipelineRevenue = useMemo(
    () => inFlight.reduce((sum, o) => sum + o.total, 0),
    [inFlight],
  );
  // Pipeline isn't "down" — it's just not yet realised, so its trend slot is a
  // neutral count, not an up/down judgement.
  const pipelineTrend = loaded
    ? { dir: 'flat', text: inFlight.length + ' order' + (inFlight.length === 1 ? '' : 's') + ' in flight' }
    : null;

  const today = useMemo(() => {
    const placedToday = allOrders.filter((o) => String(o.order_date || '') === todayISO()).length;
    const placedYesterday = allOrders.filter((o) => String(o.order_date || '') === daysAgoISO(1)).length;
    const toPrint = countByStatus(allOrders, 'new');
    const diff = placedToday - placedYesterday;
    let trend;
    if (diff > 0) trend = { dir: 'up', text: '+' + diff + ' vs yesterday' };
    else if (diff < 0) trend = { dir: 'down', text: '−' + Math.abs(diff) + ' vs yesterday' };
    else trend = { dir: 'flat', text: 'same as yesterday' };
    return {
      placedToday,
      note: toPrint > 0
        ? toPrint + ' order' + (toPrint === 1 ? '' : 's') + ' waiting to be printed'
        : 'Nothing waiting to be printed',
      trend,
    };
  }, [allOrders]);

  // ---- Pipeline stepper -------------------------------------------------
  const stepper = useMemo(() => {
    const counts = {};
    FLOW_STAGES.concat(['cancelled']).forEach((k) => { counts[k] = countByStatus(allOrders, k); });
    const max = Math.max.apply(null, FLOW_STAGES.map((k) => counts[k]).concat([1]));

    // Flag the biggest backlog staff can actually act on right now — but only
    // when it's an actual pile-up (2+ orders); flagging a queue of one is
    // noise, not triage.
    const actionable = ['new', 'in_process', 'to_pickup'];
    let biggest = null;
    let activeTotal = 0;
    actionable.forEach((k) => {
      activeTotal += counts[k];
      if (counts[k] >= 2 && (biggest === null || counts[k] > counts[biggest])) biggest = k;
    });

    const note = biggest
      ? 'Reading the stepper: ' + STEP_META[biggest].label + ' (' + counts[biggest] +
        ') is the widest actionable bar — ' + QUEUE_BLURB[biggest] + '.'
      : (activeTotal > 0
        ? 'Only ' + activeTotal + ' order' + (activeTotal === 1 ? '' : 's') +
          ' across the active queues — no pile-up anywhere.'
        : 'No orders waiting in an actionable stage — the pipeline is clear.');

    return { counts, max, biggest, note };
  }, [allOrders]);

  function stepBar(key) {
    const meta = STEP_META[key];
    const count = stepper.counts[key];
    const pct = count === 0 ? 0 : Math.max(6, Math.round((count / stepper.max) * 100));
    return (
      <Link
        className={'step step-' + meta.color + (count === 0 ? ' step-empty' : '')}
        to={'/stocks/orders?tab=' + key}
      >
        {key === stepper.biggest ? <span className="step-tag">Largest queue</span> : null}
        <span className="step-label">{meta.label}</span>
        <div className="step-count">{count}</div>
        <div className="step-load"><i style={{ width: pct + '%' }} /></div>
      </Link>
    );
  }

  // ---- Stock alerts -----------------------------------------------------
  const alerts = useMemo(() => {
    const list = [];

    // Out of stock first — most urgent, always red.
    allInventory.filter((p) => p.available === 0).forEach((p) => {
      list.push({
        id: 'out:' + p.sku, sev: 'out', badge: 'Out of stock', ic: '⚠️', name: p.name,
        detail: (p.size ? 'Size ' + p.size + ' — ' : '') + '0 on hand',
      });
    });

    // Then low stock, scarcest first, so the next stock-out is on top.
    allInventory.filter((p) => p.available > 0 && p.available <= 5)
      .sort((a, b) => a.available - b.available)
      .forEach((p) => {
        list.push({
          id: 'low:' + p.sku, sev: 'low', badge: 'Low stock', ic: '❗', name: p.name,
          detail: (p.size ? 'Size ' + p.size + ' — ' : '') + 'only ' + p.available + ' left',
        });
      });

    // Order backlog rows are informational (blue) — work, not danger.
    const newCount = countByStatus(allOrders, 'new');
    if (newCount > 0) {
      list.push({
        id: 'info:new', sev: 'info', badge: 'To print', ic: '🖨️',
        name: newCount + ' new order' + (newCount === 1 ? '' : 's'),
        detail: 'waiting for waybill printing',
      });
    }

    const pickupCount = countByStatus(allOrders, 'to_pickup');
    if (pickupCount > 0) {
      list.push({
        id: 'info:pickup', sev: 'info', badge: 'Pickup', ic: '🚚',
        name: pickupCount + ' order' + (pickupCount === 1 ? '' : 's'),
        detail: 'waiting for courier pickup',
      });
    }

    return list;
  }, [allInventory, allOrders]);

  // Badge state = the worst severity present, so the button itself answers
  // "is anything wrong?" and the owner only opens it when it says yes.
  const worstSeverity = alerts.some((a) => a.sev === 'out') ? 'out'
    : alerts.some((a) => a.sev === 'low') ? 'low'
      : alerts.length ? 'info' : 'none';

  const alertsTitle = worstSeverity === 'out' ? 'Out-of-stock SKUs need attention now'
    : worstSeverity === 'low' ? 'Low stock — watch closely'
      : worstSeverity === 'info' ? 'Orders waiting to be printed or picked up'
        : 'Nothing needs attention right now';

  // ---- Finance charts + their drill-down tables -------------------------
  // Stash what the charts plot so the drill-down tables report the exact same
  // numbers instead of recomputing them a second way. Null for an empty range:
  // leaving the previous range's days behind meant the KPI card read ₱0 while
  // its own table still listed rows — the card and its table contradicting
  // each other.
  const revenueTable = useMemo(() => {
    if (days.length === 0) return null;
    const values = [];
    const counts = [];
    days.forEach((day) => {
      const onDay = completed.filter((o) => completionDate(o) === day);
      counts.push(onDay.length);
      values.push(onDay.reduce((s, o) => s + (Number(o.total) || 0), 0));
    });
    return { days, values, counts };
  }, [days, completed]);

  const pipelineTable = useMemo(() => {
    if (days.length === 0) return null;

    const balance = days.map((day) => allOrders.reduce((sum, o) => {
      const entered = String(o.order_date || '');
      if (!entered || entered > day) return sum; // not placed yet
      const exited = pipelineExitDate(o);
      if (exited && exited <= day) return sum; // already left the pipeline
      return sum + (Number(o.total) || 0);
    }, 0));

    // The movements behind the balance: value ENTERS on the order date and
    // LEAVES on the completion/cancellation date. balance[i] must equal
    // balance[i-1] + in[i] - out[i], which is what the drill-down shows.
    const inflow = days.map((day) => allOrders
      .filter((o) => String(o.order_date || '') === day)
      .reduce((s, o) => s + (Number(o.total) || 0), 0));
    const outflow = days.map((day) => allOrders
      .filter((o) => pipelineExitDate(o) === day)
      .reduce((s, o) => s + (Number(o.total) || 0), 0));

    // Whatever was already outstanding before the window opened.
    const opening = balance[0] - inflow[0] + outflow[0];

    return { days, inflow, outflow, balance, opening };
  }, [days, allOrders]);

  // Daily order count — line chart, single left axis.
  const ordersChart = useMemo(() => {
    if (days.length === 0) return null;
    const counts = days.map((day) => rows.filter((o) => o.order_date === day).length);
    const axis = integerAxis(Math.max.apply(null, counts.concat([1])));
    const top = 20;
    const H = 180;
    const ys = counts.map((c) => top + H - (c / axis.max) * H);
    return { counts, axis, ys, top, H };
  }, [days, rows]);

  // Revenue per day — a FLOW, plotted per-day on its own axis so height answers
  // "was this a good day" directly.
  const revenueChart = useMemo(() => {
    if (!revenueTable) return null;
    const revenues = revenueTable.values;
    const maxRev = Math.max.apply(null, revenues.concat([1]));
    const top = 20;
    const H = 176;
    const ys = revenues.map((r) => top + H - (r / maxRev) * H);
    // Direct-label the best day — the one value worth reading without hovering.
    let bestI = 0;
    revenues.forEach((r, i) => { if (r > revenues[bestI]) bestI = i; });
    return { revenues, maxRev, ys, top, H, bestI };
  }, [revenueTable]);

  // Pipeline balance — a STOCK, so it gets a line and its own axis. Value
  // enters on the order date and leaves the day the order completes or is
  // cancelled, so the line steps up on new orders and down as they clear.
  const pipelineChart = useMemo(() => {
    if (!pipelineTable) return null;
    const pipeline = pipelineTable.balance;
    const maxPipe = Math.max.apply(null, pipeline.concat([1]));
    const top = 20;
    const H = 176;
    const ys = pipeline.map((v) => top + H - (v / maxPipe) * H);
    return { pipeline, maxPipe, ys, top, H, peak: Math.max.apply(null, pipeline) };
  }, [pipelineTable]);

  // ---- Status breakdown -------------------------------------------------
  const statusCounts = useMemo(() => {
    const counts = {};
    rows.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [rows]);

  // ---- Search -----------------------------------------------------------
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return null;

    const orderMatches = allOrders.filter(
      (o) => (o.order_id + o.customer_name + o.tracking_number).toLowerCase().includes(term),
    ).slice(0, 5);

    const invMatches = allInventory.filter(
      (p) => (p.sku + p.name + p.location).toLowerCase().includes(term),
    ).slice(0, 5);

    return { orderMatches, invMatches };
  }, [searchTerm, allOrders, allInventory]);

  // ---- Inventory Intelligence -------------------------------------------
  // Shares the same range control, so it re-derives whenever the window moves —
  // otherwise its units figures would silently keep reporting the previous
  // selection. renderAnalytics() guarded this with `if (allInventory.length)`.
  const intelData = useMemo(() => {
    if (!loaded || allInventory.length === 0) return null;
    return buildIntel(allInventory, allOrders, start, end);
  }, [loaded, allInventory, allOrders, start, end]);

  const intelTotal = intelData ? intelData.list.length : 0;

  const tierStats = useMemo(() => {
    if (!intelData) return null;
    return TIER_ORDER.map((tier) => {
      const meta = TIER_META[tier];
      const inTier = intelData.list.filter((s) => s.tier === tier);
      const unitsSold = inTier.reduce((sum, s) => sum + s.units, 0);
      const held = inTier.reduce((sum, s) => sum + (s.available || 0), 0);
      const pct = intelTotal ? Math.round((inTier.length / intelTotal) * 100) : 0;
      return {
        tier,
        meta,
        count: inTier.length,
        pct,
        sub: tier === 'dead'
          ? pct + '% of SKUs · ' + held + ' units on the shelf'
          : pct + '% of SKUs · ' + unitsSold + ' units sold in range',
        // Hover explains the rule in the row's own words — the same text the
        // warehouse team wrote for this tier (day range + meaning).
        title: meta.range + ' since last sale — ' + meta.meaning,
      };
    });
  }, [intelData, intelTotal]);

  const intelRows = useMemo(() => {
    if (!intelData) return null;
    return intelData.list.filter((s) => s.tier === intelTier)
      .sort((a, b) => {
        // Dead stock ranks by units stuck on the shelf (the shelf-space pain);
        // everything else ranks by how recently it sold, freshest first — the
        // same signal that puts it in this tier.
        if (intelTier === 'dead') return (b.available || 0) - (a.available || 0);
        return a.daysSinceLastSale - b.daysSinceLastSale;
      });
  }, [intelData, intelTier]);

  // Most Bought Sizes: share of all units sold, by size.
  const sizeMix = useMemo(() => {
    if (!intelData) return null;

    const bySize = {};
    intelData.list.forEach((s) => {
      const key = s.size || 'Unspecified';
      if (!bySize[key]) bySize[key] = { size: key, units: 0, lastSale: '' };
      bySize[key].units += s.units;
      if (s.lastSale > bySize[key].lastSale) bySize[key].lastSale = s.lastSale;
    });

    // Only sizes that have actually sold belong in a "most bought" split — a
    // 0-unit size has no share of the total and would render as an invisible
    // wedge with a legend row claiming 0%.
    let sizes = Object.keys(bySize).map((k) => bySize[k]).filter((s) => s.units > 0);
    const totalUnits = sizes.reduce((sum, s) => sum + s.units, 0);
    if (sizes.length === 0) return { sizes: [], totalUnits: 0, folded: 0, top: null };

    // Canonical apparel order (see src/utils/sizeOrder.js) — the ramp only
    // reads as a ramp if the wedges follow the size sequence.
    sizes.sort((a, b) => compareSizes(a.size, b.size));

    let folded = 0;
    if (sizes.length > MAX_SIZE_SEGMENTS) {
      const keep = sizes.slice().sort((a, b) => b.units - a.units).slice(0, MAX_SIZE_SEGMENTS - 1);
      const keepSet = new Set(keep.map((s) => s.size));
      const tail = sizes.filter((s) => !keepSet.has(s.size));
      folded = tail.length;
      sizes = sizes.filter((s) => keepSet.has(s.size));
      sizes.push({
        size: 'Other',
        units: tail.reduce((sum, s) => sum + s.units, 0),
        lastSale: '',
        isOther: true,
      });
    }

    sizes.forEach((s, i) => {
      s.color = s.isOther ? OTHER_COLOR : SIZE_RAMP[Math.min(i, SIZE_RAMP.length - 1)];
      s.pct = Math.round((s.units / totalUnits) * 100);
    });

    const top = sizes.slice().sort((a, b) => b.units - a.units)[0];
    return { sizes, totalUnits, folded, top };
  }, [intelData]);

  const intelTotalUnits = intelData
    ? intelData.list.reduce((sum, s) => sum + s.units, 0)
    : 0;

  // ---- Popups -----------------------------------------------------------
  const tableModalContent = tableModal === 'revenue'
    ? revenueModal(revenueTable)
    : tableModal === 'pipeline' ? pipelineModal(pipelineTable) : null;

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'Escape') return;
      setAlertsOpen(false);
      setTableModal(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // ---- Export -----------------------------------------------------------
  function exportReport() {
    if (start > end) {
      window.alert(cappedToday
        ? 'Today is still in progress and is excluded from reports. Pick a range that includes an earlier day.'
        : 'Start date is after end date.');
      return;
    }
    const who = user ? user.full_name + ' (' + user.role + ')' : 'Unknown';
    // /orders/report sits behind erp.auth — a plain navigation sends no
    // Authorization header, so download through the api client instead.
    downloadFile(
      '/orders/report?start=' + encodeURIComponent(start) +
      '&end=' + encodeURIComponent(end) +
      '&user=' + encodeURIComponent(who),
      'ash-report-' + start + '_to_' + end + '.xlsx',
    );
  }

  // ---- Chart subtitles --------------------------------------------------
  const ordersChartSub = ordersChart
    ? 'Daily order count · ' + days.length + ' day' + (days.length === 1 ? '' : 's')
    : 'Daily order count';

  const revenueChartSub = (() => {
    if (!revenueChart) return 'Money realised each day — how good was each day';
    const totalRev = revenueChart.revenues.reduce((a, b) => a + b, 0);
    const bestDay = revenueChart.revenues[revenueChart.bestI] > 0
      ? ' · best day ' + shortDate(days[revenueChart.bestI]) + ' at ' + fmtPeso(revenueChart.revenues[revenueChart.bestI])
      : '';
    return '₱' + totalRev.toLocaleString() + ' over ' + days.length +
      ' day' + (days.length === 1 ? '' : 's') + bestDay;
  })();

  // A balance's headline is its CLOSING value — summing it across days would
  // count the same outstanding money once per day it was owed.
  const pipelineChartSub = pipelineChart
    ? '₱' + pipelineChart.pipeline[pipelineChart.pipeline.length - 1].toLocaleString() +
      ' outstanding at the end of the range · peaked at ₱' + pipelineChart.peak.toLocaleString()
    : 'Money still in flight — up on new orders, down as they complete';

  const presets = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'mtd', label: 'This month' },
    { key: 'ytd', label: 'This year' },
    { key: 'all', label: 'All time' },
  ];

  return (
    <>
      {/* Stock alerts are shelf-level operational detail — a badge button keeps
          the count visible (so nothing urgent is missed) without spending
          dashboard space on the list itself. */}
      {/* One header for every dashboard subtab: title + live-sync line on the
          left, search filling the middle, actions on the right. */}
      <div className="page-title-row">
        <div className="page-title-block">
          <h1>Warehouse Dashboard</h1>
          <p className="sub">Revenue, order flow, and fulfillment priorities.</p>
          <SyncLine sync={sync} />
        </div>

        <div className="search-box header-search">
          <span>🔍</span>
          <input
            id="search-input"
            placeholder="Search order ID, SKU, customer, tracking, location code..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="page-title-actions">
          <button
            id="alerts-btn"
            className={'alerts-btn' + (loaded ? ' sev-' + worstSeverity : '')}
            type="button"
            title={loaded ? alertsTitle : undefined}
            onClick={() => setAlertsOpen(true)}
          >
            {loaded && worstSeverity === 'none' ? '✓ Stock Alerts' : '⚠️ Stock Alerts'}
            <span className="alerts-count" id="alerts-count">{loaded ? alerts.length : ''}</span>
          </button>
          <Link to="/stocks/scan" className="btn btn-outline">📷 Scan Station</Link>
        </div>
      </div>

      <div id="search-results">
        {searchResults && (
          searchResults.orderMatches.length === 0 && searchResults.invMatches.length === 0 ? (
            <div className="panel" style={{ marginBottom: '16px', fontSize: '12.5px', color: '#94a3b8' }}>
              No matches found.
            </div>
          ) : (
            <div className="panel" style={{ marginBottom: '16px' }}>
              {searchResults.orderMatches.map((o) => (
                <div className="alert-row" key={'o:' + o.order_id}>
                  📦 <strong>{o.order_id}</strong> — {o.customer_name}{' '}
                  <span className={'status-pill status-' + o.status} style={{ cursor: 'default' }}>
                    {STAGE_LABELS[o.status] || o.status}
                  </span>
                </div>
              ))}
              {searchResults.invMatches.map((p) => (
                <div className="alert-row" key={'p:' + p.sku}>
                  🏷️ <strong>{p.sku}</strong> — {p.name} @ {p.location}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* One range control shared by every dashboard subtab. It lives OUTSIDE
          the view containers so switching subtabs keeps the same window
          selected and Export stays reachable everywhere — duplicating it per
          subtab would mean three sets of inputs to keep in sync. */}
      <div id="range-wrap">
        <div className="range-bar" style={{ marginTop: '18px' }}>
          <div className="range-field">
            <label htmlFor="range-start">From</label>
            <input type="date" id="range-start" value={rangeStart} onChange={onRangeStartChange} />
          </div>
          <div className="range-field">
            <label htmlFor="range-end">To</label>
            <input type="date" id="range-end" value={rangeEnd} onChange={onRangeEndChange} />
          </div>
          <div className="range-field">
            <label>Quick ranges</label>
            <div className="range-presets" id="range-presets">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  className={'preset-btn' + (activePreset === preset.key ? ' active' : '')}
                  data-preset={preset.key}
                  onClick={() => applyPreset(preset.key)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="range-spacer" />
          <button id="export-report-btn" className="btn btn-accent" onClick={exportReport}>
            ⬇ Export Report
          </button>
        </div>

        <div
          id="range-summary"
          style={{ fontSize: '12px', color: 'var(--muted-dark)', margin: '10px 0 0' }}
        >
          {!loaded ? null : start > end ? (
            // When the requested range was ONLY today, the effective window is
            // empty once today is trimmed off — say that plainly rather than
            // showing the generic "start after end" error.
            <span style={{ color: cappedToday ? '#64748b' : 'var(--red)' }}>
              {cappedToday
                ? 'Today is still in progress and is excluded from analytics. Pick a range that includes an earlier day to see results.'
                : 'Start date is after end date — no results.'}
            </span>
          ) : (
            rows.length + ' order' + (rows.length === 1 ? '' : 's') + ' placed from ' + start +
            ' to ' + end + ' · revenue from the ' + completed.length + ' order' +
            (completed.length === 1 ? '' : 's') + ' completed in this range.' +
            (cappedToday ? ' Today (in progress) is excluded.' : '')
          )}
        </div>
      </div>

      {/* ══════════════════ SUBTAB · FINANCE ══════════════════ */}
      <div id="finance-view" style={{ display: view === 'finance' ? 'block' : 'none' }}>
        <section className="dash-section first">
          <div className="dash-section-head">
            <span className="dash-section-icon money">₱</span>
            <div>
              <div className="dash-section-title">Finance</div>
              <div className="dash-section-sub">
                What&apos;s earned, what&apos;s still in flight, and how revenue is trending
              </div>
            </div>
          </div>

          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <button
              type="button"
              className="kpi-card kpi-edge-green kpi-clickable"
              id="kpi-revenue-card"
              onClick={() => setTableModal('revenue')}
            >
              <div className="kpi-icon ic-green">₱</div>
              <div className="kpi-label">Completed Revenue</div>
              <div className="kpi-value c-green" id="kpi-revenue">
                {'₱' + (loaded ? revenue.toLocaleString() : '0')}
              </div>
              <div className="kpi-note">Money actually in — completed inside the selected dates</div>
              <KpiTrend id="kpi-revenue-trend" trend={revenueTrend} />
              <div className="kpi-drill">View day-by-day breakdown →</div>
            </button>
            <button
              type="button"
              className="kpi-card kpi-edge-blue kpi-clickable"
              id="kpi-pipeline-card"
              onClick={() => setTableModal('pipeline')}
            >
              <div className="kpi-icon ic-blue">📦</div>
              <div className="kpi-label">Pipeline Revenue</div>
              <div className="kpi-value c-navy" id="kpi-pipeline-revenue">
                {'₱' + (loaded ? pipelineRevenue.toLocaleString() : '0')}
              </div>
              <div className="kpi-note">Live — everything in flight right now, any date</div>
              <KpiTrend id="kpi-pipeline-trend" trend={pipelineTrend} />
              <div className="kpi-drill">View daily ins &amp; outs →</div>
            </button>
          </div>

          {/* One trend per card, each directly beneath the figure it explains.
              They are deliberately NOT on one axis: revenue per day is a flow
              (~₱1k on a typical day) and the pipeline is a balance (tens of
              thousands), so sharing a scale flattened the daily bars to
              nothing. Separate panels let each keep its own axis and its own
              shape. */}
          <div className="panel-row" style={{ marginTop: '14px', alignItems: 'stretch' }}>
            <div className="panel" style={{ flex: 1, minWidth: 0 }}>
              <div className="panel-title">Revenue per Day</div>
              <div className="panel-sub" id="an-rev-sub">{revenueChartSub}</div>
              <ChartPanel
                id="an-rev-chart"
                tipId="an-rev-tip"
                height={240}
                top={20}
                H={176}
                left={48}
                right={14}
                days={days}
                axisFontSize="11"
                axisLabels={[0, 1, 2, 3, 4].map((g) => (revenueChart
                  ? fmtPeso(revenueChart.maxRev - (revenueChart.maxRev / 4) * g)
                  : ''))}
                series={revenueChart ? [{
                  name: 'Revenue',
                  color: '#16a34a',
                  values: revenueChart.revenues,
                  ys: revenueChart.ys,
                  fmt: (v) => '₱' + Math.round(v).toLocaleString(),
                }] : []}
                renderMarker={(xs) => {
                  if (!revenueChart || !(revenueChart.revenues[revenueChart.bestI] > 0)) return null;
                  const i = revenueChart.bestI;
                  return (
                    <>
                      <circle cx={xs[i]} cy={revenueChart.ys[i]} r="4" fill="#16a34a" stroke="#fff" strokeWidth="2" />
                      <text
                        x={xs[i]}
                        y={revenueChart.ys[i] - 11}
                        fontSize="11.5"
                        fontWeight="800"
                        textAnchor="middle"
                        fill="#15803d"
                      >
                        {fmtPeso(revenueChart.revenues[i])}
                      </text>
                    </>
                  );
                }}
              />
              <div className="legend" style={{ marginTop: '4px' }}>
                <span>
                  <span className="dot" style={{ background: '#16a34a' }} />
                  Completed revenue, by completion date
                </span>
              </div>
            </div>

            <div className="panel" style={{ flex: 1, minWidth: 0 }}>
              <div className="panel-title">Pipeline Balance</div>
              <div className="panel-sub" id="an-pipe-sub">{pipelineChartSub}</div>
              <ChartPanel
                id="an-pipe-chart"
                tipId="an-pipe-tip"
                height={240}
                top={20}
                H={176}
                left={48}
                right={14}
                days={days}
                axisFontSize="11"
                axisLabels={[0, 1, 2, 3, 4].map((g) => (pipelineChart
                  ? fmtPeso(pipelineChart.maxPipe - (pipelineChart.maxPipe / 4) * g)
                  : ''))}
                series={pipelineChart ? [{
                  name: 'In pipeline',
                  color: '#2563eb',
                  values: pipelineChart.pipeline,
                  ys: pipelineChart.ys,
                  fmt: (v) => '₱' + Math.round(v).toLocaleString(),
                }] : []}
                renderMarker={(xs) => {
                  if (!pipelineChart) return null;
                  const i = days.length - 1;
                  return (
                    <>
                      <circle cx={xs[i]} cy={pipelineChart.ys[i]} r="4" fill="#2563eb" stroke="#fff" strokeWidth="2" />
                      <text
                        x={xs[i] - 8}
                        y={pipelineChart.ys[i] - 10}
                        fontSize="12"
                        fontWeight="800"
                        textAnchor="end"
                        fill="#1e40af"
                      >
                        {fmtPeso(pipelineChart.pipeline[i])}
                      </text>
                    </>
                  );
                }}
              />
              <div className="legend" style={{ marginTop: '4px' }}>
                <span>
                  <span className="dot" style={{ background: '#2563eb' }} />
                  Outstanding at end of day
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ══════════════════ SUBTAB · ORDER ANALYTICS ══════════════════ */}
      <div id="orders-view" style={{ display: view === 'orders' ? 'block' : 'none' }}>
        <section className="dash-section first">
          <div className="dash-section-head">
            <span className="dash-section-icon orders">📦</span>
            <div>
              <div className="dash-section-title">Order Analytics</div>
              <div className="dash-section-sub">
                Where orders are right now, and how they moved through the period
              </div>
            </div>
          </div>

          {/* Live pipeline stepper: the six status counters as one glanceable
              strip. The bar under each stage is sized relative to its count, so
              the widest bar is visibly the current bottleneck. */}
          <div className="stepper" id="pipeline-stepper">
            {loaded && (
              <>
                {FLOW_STAGES.map((key, i) => (
                  <Fragment key={key}>
                    {i > 0 ? <span className="step-arrow">➜</span> : null}
                    {stepBar(key)}
                  </Fragment>
                ))}
                <span className="step-divider" />
                {stepBar('cancelled')}
                {/* No load bar on the All step — it would always be full and
                    carries no comparative information. */}
                <Link className="step" to="/stocks/orders?tab=all" title="Open the full queue">
                  <span className="step-label">All Orders</span>
                  <div className="step-count">{allOrders.length}</div>
                </Link>
              </>
            )}
          </div>
          <div
            className="chart-note"
            id="stepper-note"
            style={{ borderTop: 'none', paddingTop: 0, marginTop: '10px' }}
          >
            {loaded ? stepper.note : null}
          </div>

          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '14px' }}>
            <Link className="kpi-card kpi-link kpi-edge-amber" to="/stocks/orders?tab=new">
              <div className="kpi-icon ic-amber">🖨️</div>
              <div className="kpi-label">New Orders Today</div>
              <div className="kpi-value c-navy" id="kpi-today">{loaded ? today.placedToday : 0}</div>
              <div className="kpi-note" id="kpi-today-note">
                {loaded ? today.note : 'Waiting to be printed'}
              </div>
              <KpiTrend id="kpi-today-trend" trend={loaded ? today.trend : null} />
            </Link>
            <div className="kpi-card">
              <div className="kpi-label">Orders Placed</div>
              <div className="kpi-value c-navy" id="an-orders">{loaded ? rows.length : 0}</div>
              <div className="kpi-note">In the selected range</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Units Ordered</div>
              <div className="kpi-value c-navy" id="an-units">{loaded ? units : 0}</div>
              <div className="kpi-note">Pieces ordered, cancellations excluded</div>
            </div>
          </div>

          <div className="panel-row" style={{ marginTop: '14px', alignItems: 'stretch' }}>
            <div className="panel" style={{ flex: 2, minWidth: 0 }}>
              <div className="panel-title">Orders in Range</div>
              <div className="panel-sub" id="an-chart-sub">{ordersChartSub}</div>
              <ChartPanel
                id="an-chart"
                tipId="an-tip"
                height={240}
                top={20}
                H={180}
                left={34}
                right={14}
                days={days}
                axisFontSize="12"
                axisLabels={ordersChart ? ordersChart.axis.ticks : []}
                series={ordersChart ? [{
                  name: 'Orders',
                  color: '#0b1f3a',
                  values: ordersChart.counts,
                  ys: ordersChart.ys,
                  fmt: (v) => v + (v === 1 ? ' order' : ' orders'),
                }] : []}
                renderMarker={(xs) => {
                  if (!ordersChart) return null;
                  // End-of-line marker + value: the one direct label the chart
                  // keeps, so the latest figure is readable without hovering.
                  const i = days.length - 1;
                  return (
                    <>
                      <circle cx={xs[i]} cy={ordersChart.ys[i]} r="4" fill="#0b1f3a" stroke="#fff" strokeWidth="2" />
                      <text
                        x={xs[i] - 8}
                        y={ordersChart.ys[i] - 10}
                        fontSize="12"
                        fontWeight="800"
                        textAnchor="end"
                        fill="#0b1f3a"
                      >
                        {ordersChart.counts[i]}
                      </text>
                    </>
                  );
                }}
              />
              <div className="legend" style={{ marginTop: '4px' }}>
                <span>
                  <span className="dot" style={{ background: '#0b1f3a' }} />
                  Orders (count)
                </span>
              </div>
            </div>
            <div className="panel" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="panel-title">Status Breakdown</div>
              <div
                id="an-status-list"
                style={{
                  marginTop: '10px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '18px 0',
                }}
              >
                {!loaded ? null : rows.length === 0 ? (
                  <div className="alert-row" style={{ color: 'var(--muted)' }}>No orders in range.</div>
                ) : (
                  Object.keys(STAGE_LABELS).map((key) => {
                    const count = statusCounts[key] || 0;
                    const pct = rows.length ? Math.round((count / rows.length) * 100) : 0;
                    const zero = count === 0;
                    return (
                      <div
                        key={key}
                        style={{ padding: '5px 0', fontSize: '12.5px', opacity: zero ? 0.55 : undefined }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                        }}
                        >
                          <span className={'status-pill status-' + key} style={{ cursor: 'default' }}>
                            {STAGE_LABELS[key]}
                          </span>
                          <span style={{ color: 'var(--muted-dark)' }}>{count + ' · ' + pct + '%'}</span>
                        </div>
                        <div style={{
                          height: '9px',
                          background: '#eef1f5',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                        >
                          <div style={{
                            height: '100%',
                            width: pct + '%',
                            background: STAGE_COLORS[key],
                            borderRadius: '999px',
                          }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ══════════════════ SUBTAB · INVENTORY INTELLIGENCE ══════════════════ */}
      <div id="intel-view" style={{ display: view === 'intel' ? 'block' : 'none' }}>
        <section className="dash-section first">
          <div className="dash-section-head">
            <span className="dash-section-icon inv">🧵</span>
            <div>
              <div className="dash-section-title">Inventory Intelligence</div>
              <div className="dash-section-sub" id="intel-summary">
                {intelData
                  ? intelData.list.length + ' SKUs · ' + intelTotalUnits +
                    ' units sold in the selected range · movement tiers as of ' +
                    intelData.asOf + '. Click a tier to see its products.'
                  : null}
              </div>
            </div>
          </div>

          {/* The two donuts sit side by side so they read as one row of
              breakdowns: movement tiers on the left (also the table's filter),
              size mix on the right. */}
          <div className="panel-row" style={{ marginTop: '14px', alignItems: 'stretch' }}>
            {/* Overall Movement: a part-to-whole donut plus rows that double as
                the legend AND the tier selector — click a row (or a donut
                segment) to load that tier's products in the table below. */}
            <div className="panel" style={{ flex: 1, minWidth: 0 }}>
              <div className="panel-title">Overall Movement</div>
              <div className="panel-sub" id="intel-dist-sub">
                {intelData
                  ? 'How all ' + intelTotal + ' SKUs split across the four tiers — click a tier to see its products below'
                  : 'How the catalog splits across the four tiers — click a tier to see its products below'}
              </div>
              <div className="movement-row">
                <div className="donut-wrap" id="donut-wrap">
                  <svg id="intel-donut" viewBox="0 0 200 200">
                    {tierStats && (
                      <DonutSegments
                        segments={tierStats.map((t) => ({
                          key: t.tier,
                          color: t.meta.color,
                          value: t.count,
                          title: t.meta.emoji + ' ' + t.meta.label + ' — ' + t.count + ' of ' +
                            intelTotal + ' SKUs (' + t.pct + '%)',
                        }))}
                        activeKey={intelTier}
                        onSelect={setIntelTier}
                      />
                    )}
                  </svg>
                  <div className="donut-center">
                    <div className="donut-total" id="donut-total">{intelTotal}</div>
                    <div className="donut-total-label">Total SKUs</div>
                  </div>
                </div>
                <div className="tier-select" id="tier-select">
                  {tierStats && tierStats.map((t) => (
                    <div
                      key={t.tier}
                      className={'tier-row' + (t.tier === intelTier ? ' active' : '')}
                      data-tier={t.tier}
                      title={t.title}
                      onClick={() => setIntelTier(t.tier)}
                    >
                      <span className="dot" style={{ background: t.meta.color }} />
                      <div className="tr-main">
                        <div className="tr-top">
                          <span className="tr-label">{t.meta.emoji + ' ' + t.meta.label}</span>
                          <span className="tr-count" style={{ color: t.meta.color }}>{t.count}</span>
                        </div>
                        <div className="tr-sub">{t.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="chart-note" id="intel-method-note">
                {intelData
                  ? 'Movement = days since last sale, as of ' + intelData.asOf +
                    ' (cancelled orders excluded): Fast 0–7 days · Moderate 8–14 days · ' +
                    'Slow 15–60 days · Dead Stock over 60 days (or never sold). ' +
                    'Tiers always read as of today; the date range scopes the units figures only.'
                  : null}
              </div>
            </div>

            {/* Most Bought Sizes: share of all units sold, by size. Sizes are an
                ORDERED scale (S→3XL), so the wedges take a one-hue blue ramp
                light-to-dark in size order rather than the movement palette —
                this chart is about volume, not health, and reusing the
                green/amber/red tiers here would make a color mean two things. */}
            <div className="panel" style={{ flex: 1, minWidth: 0 }}>
              <div className="panel-title">Most Bought Sizes</div>
              <div className="panel-sub">
                Share of units sold in the selected range, by size — which sizes the shop actually moves
              </div>
              <div className="movement-row">
                <div className="donut-wrap donut-static" id="size-donut-wrap">
                  <svg id="size-donut" viewBox="0 0 200 200">
                    {sizeMix && sizeMix.sizes.length > 0 && (
                      <DonutSegments
                        segments={sizeMix.sizes.map((s) => ({
                          key: s.size,
                          color: s.color,
                          value: s.units,
                          title: s.size + ' — ' + s.units + ' of ' + sizeMix.totalUnits +
                            ' units sold (' + s.pct + '%)',
                        }))}
                      />
                    )}
                  </svg>
                  <div className="donut-center">
                    <div className="donut-total is-text" id="size-top">
                      {sizeMix && sizeMix.top ? sizeMix.top.size : '—'}
                    </div>
                    <div className="donut-total-label">Most bought</div>
                  </div>
                </div>
                <div className="tier-select" id="size-select">
                  {sizeMix && (sizeMix.sizes.length === 0 ? (
                    <div className="alert-row" style={{ color: 'var(--muted)' }}>No units sold yet.</div>
                  ) : (
                    // Rows stay in size order to match the ring; the biggest
                    // carries a tag so "most bought" is still findable without
                    // re-sorting the list.
                    sizeMix.sizes.map((s) => {
                      const daysAgo = daysSince(s.lastSale);
                      const recency = s.isOther ? sizeMix.folded + ' smaller sizes'
                        : daysAgo === null ? 'never sold'
                          : daysAgo === 0 ? 'sold today'
                            : 'last sold ' + daysAgo + 'd ago';
                      return (
                        <div className="tier-row static" key={s.size}>
                          <span className="dot" style={{ background: s.color }} />
                          <div className="tr-main">
                            <div className="tr-top">
                              <span className="tr-label">
                                {s.size}
                                {s === sizeMix.top ? <span className="tr-tag">Most bought</span> : null}
                              </span>
                              <span className="tr-count">
                                {s.units}
                                <span className="tr-unit">pcs</span>
                              </span>
                            </div>
                            <div className="tr-sub">{s.pct + '% of units · ' + recency}</div>
                          </div>
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
              <div className="chart-note" id="size-note">
                {sizeMix && sizeMix.sizes.length > 0
                  ? 'Share of the ' + sizeMix.totalUnits + ' units sold in this range, by size. ' +
                    'Wedges follow the size sequence (lighter = smaller size), so the ring reads in ' +
                    'the order staff pick stock.' +
                    (sizeMix.folded ? ' The ' + sizeMix.folded + ' smallest-selling sizes are folded into Other.' : '')
                  : null}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: '14px' }}>
            <div className="panel-title" id="intel-table-title">
              {intelRows
                ? TIER_META[intelTier].emoji + ' ' + TIER_META[intelTier].label + ' — ' +
                  intelRows.length + ' SKU' + (intelRows.length === 1 ? '' : 's')
                : 'Products'}
            </div>
            <div className="panel-sub" id="intel-table-sub">
              {!intelRows ? null : intelTier === 'dead'
                ? 'No sale in over 60 days (or ever) — the ones holding the most stock are listed first.'
                : 'Sorted by most recently sold first.'}
            </div>
            <div className="table-scroll">
              <table style={{ marginTop: '10px' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>SKU</th>
                    <th className="col-r">Units Sold</th>
                    <th className="col-r">On Hand</th>
                    <th>Last Sale</th>
                  </tr>
                </thead>
                <tbody id="intel-table-body">
                  {!intelRows ? null : intelRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ color: 'var(--muted)' }}>No SKUs in this tier right now.</td>
                    </tr>
                  ) : (
                    intelRows.map((s) => {
                      const lastSaleText = s.daysSinceLastSale === null ? 'Never'
                        : s.daysSinceLastSale === 0 ? 'Today'
                          : s.daysSinceLastSale + 'd ago';
                      return (
                        <tr key={s.sku}>
                          <td>{s.name || '—'}</td>
                          <td>{s.size || '—'}</td>
                          <td>{s.sku}</td>
                          <td className="col-r">{s.units}</td>
                          <td className="col-r">{s.available === null ? '—' : s.available}</td>
                          <td title={s.lastSale || 'No recorded sales'}>{lastSaleText}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Day-by-day breakdown popup — the table twin of the Finance charts,
          opened from either KPI card. Every figure the charts plot is readable
          here as exact numbers, so nothing is locked behind a hover. */}
      <div
        className={'modal-overlay' + (tableModal ? ' open' : '')}
        id="table-modal"
        style={{ display: 'none' }}
        onClick={(event) => { if (event.target === event.currentTarget) setTableModal(null); }}
      >
        <div className="modal-box table-box">
          <div className="alerts-box-head">
            <div>
              <div className="modal-title" id="table-modal-title">
                {tableModalContent ? tableModalContent.title : null}
              </div>
              <div className="modal-desc" id="table-modal-desc">
                {tableModalContent ? tableModalContent.desc : null}
              </div>
            </div>
            <button className="close-btn" id="table-modal-close" type="button" onClick={() => setTableModal(null)}>
              ✕
            </button>
          </div>
          <div className="table-modal-body table-scroll" id="table-modal-body">
            {tableModalContent ? tableModalContent.body : null}
          </div>
        </div>
      </div>

      {/* Stock Alerts popup — opened from the badge button in the page header. */}
      <div
        className={'modal-overlay' + (alertsOpen ? ' open' : '')}
        id="alerts-modal"
        style={{ display: 'none' }}
        onClick={(event) => { if (event.target === event.currentTarget) setAlertsOpen(false); }}
      >
        <div className="modal-box alerts-box">
          <div className="alerts-box-head">
            <div>
              <div className="modal-title">⚠️ Stock Alerts</div>
              <div className="modal-desc">What needs attention on the shelf right now</div>
            </div>
            <button className="close-btn" id="alerts-close-btn" type="button" onClick={() => setAlertsOpen(false)}>
              ✕
            </button>
          </div>
          <div id="alerts-list" className="alerts-box-body">
            {!loaded ? null : alerts.length === 0 ? (
              <div className="alert-row">✓ No active alerts — stock and queues are healthy.</div>
            ) : (
              // The popup holds the full list, so there's no dashboard space to
              // protect — show everything rather than truncating to a "+N more".
              alerts.map((alert) => <SevRow key={alert.id} alert={alert} />)
            )}
          </div>
          <div
            className="chart-note"
            id="alerts-note"
            style={{ display: loaded && alerts.length > 0 ? 'block' : 'none' }}
          >
            Red = act now (out of stock) · Amber = watch closely (low stock) · Blue = informational.
          </div>
        </div>
      </div>
    </>
  );
}

// Port of public/orders.html — the Orders Queue.
//
// Everything the original inline <script> did, in React idiom:
//   * status pills → the live pipeline stepper (#tabs), still click-to-filter
//   * Needs Follow-up + Orders by Courier side panels
//   * row selection + the bulk command bar
//   * the slide-in detail panel, manual status override and return approval
//   * waybill printing (courier-label layout, QR, "move to In Process" confirm)
//
// Same endpoints, same payloads, same wording. The sidebar lives in
// AppLayout.jsx now, so this file renders page content only.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';

import client from '../api/client';
import SyncLine from '../components/SyncLine';
import { useAppShell } from '../layouts/AppLayout';
import { useSyncStatus } from '../utils/syncStatus';
import './Orders.css';

// The qrcodejs <script> the original loaded from cdnjs in <head>. Injected on
// mount instead of edited into index.html, which is shared with every other
// page. `new QRCode(...)` stays inside a try/catch either way, so a blocked or
// slow CDN degrades to the same "QR unavailable — use Order ID" box.
const QR_SCRIPT_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

// Present in the original but never read — every label it holds is now the
// sidebar's, and AppLayout.ORDER_SUBITEMS carries exactly these strings.
// Kept verbatim so the two lists can be diffed if the tabs ever change.
const TAB_LABELS = {
  all: 'All Orders',
  new: 'New Orders',
  in_process: 'In Process',
  to_pickup: 'To Pickup',
  shipped: 'Shipped Orders',
  completed: 'Completed Orders',
  cancelled: 'Cancelled Orders',
  return_requested: 'Return Requests',
  returned: 'Returned Orders',
};

// Which date column reflects an order's CURRENT stage. As an order moves
// New -> In Process -> To Pickup -> Shipped -> Completed, this always
// points at the date it entered wherever it is right now. Cancelled
// orders show whatever stage they last reached before that happened.
const STAGE_DATE_FIELD = {
  new: 'order_date',
  in_process: 'in_process_date',
  to_pickup: 'to_pickup_date',
  shipped: 'shipped_date',
  completed: 'completed_date',
  return_requested: 'return_requested_date',
  returned: 'returned_date',
};

function stageDate(row) {
  const field = STAGE_DATE_FIELD[row.status];
  if (field && row[field]) return row[field];
  // Cancelled/unknown: fall back to the most recent stage date
  // actually present, so the column is never blank.
  const fallbackOrder = ['returned_date', 'return_requested_date', 'completed_date', 'shipped_date', 'to_pickup_date', 'in_process_date', 'order_date'];
  for (const f of fallbackOrder) {
    if (row[f]) return row[f];
  }
  return '—';
}

// ---- Needs Follow-up: orders sitting too long in an active stage -----
// Allowed dwell (in days) before an order is flagged. Per-stage because
// normal turnaround differs: a new order should be printed the same day,
// while a shipped parcel legitimately spends days with the courier
// before delivery is confirmed. Completed/cancelled never age.
const STAGE_AGE_LIMITS = {
  new: { warn: 1, late: 3 },
  in_process: { warn: 2, late: 5 },
  to_pickup: { warn: 2, late: 4 },
  shipped: { warn: 5, late: 10 },
  // A return request is a customer waiting on a decision — flag it fast.
  return_requested: { warn: 1, late: 3 },
};

const STAGE_SHORT = { new: 'New', in_process: 'In Process', to_pickup: 'To Pickup', shipped: 'Shipped', return_requested: 'Return Req' };

function daysInStage(row) {
  const ms = Date.parse(stageDate(row));
  if (isNaN(ms)) return 0;
  // Demo rows can carry future dates; clamp so they read 0, not negative.
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

// Maps a courier name to a CSS-class slug for its pill color.
function courierSlug(courier) {
  if (!courier) return 'unassigned';
  if (courier === 'NinjaVan') return 'ninjavan';
  return 'jnt';
}

// Size for an order: prefer the inventory lookup; fall back to parsing the
// SKU suffix (…UM/UL/UXL/US/U2XL/U3XL) if the SKU isn't in inventory.
function orderSize(row, skuSizeMap) {
  if (skuSizeMap[row.sku]) return skuSizeMap[row.sku];
  const m = String(row.sku || '').match(/U(2XL|3XL|XL|S|M|L)$/);
  return m ? m[1] : '—';
}

// An order can hold multiple line items (shipped in one package). They're
// stored as a JSON string in `items`; fall back to the legacy single-item
// columns for older orders that predate the items column.
function orderItems(o, skuSizeMap) {
  if (o.items) {
    // The API already returns `items` as a parsed array (presentOrder on
    // the server does the JSON.parse). Only re-parse if it's still a
    // string (legacy/raw rows) — calling JSON.parse on an array throws,
    // which used to silently drop every cart order to the single-item
    // fallback below and show "<first product> +N more".
    let parsed = o.items;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = null;
      }
    }
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  return [{
    sku: o.sku,
    product: o.product,
    size: orderSize(o, skuSizeMap),
    qty: Number(o.qty) || 0,
    price: (Number(o.qty) ? Number(o.total) / Number(o.qty) : Number(o.total)) || 0,
    line_total: Number(o.total) || 0,
  }];
}

// Canonical fulfillment sequence. Tabs always render in this order rather
// than in whatever order statuses happen to appear in the spreadsheet.
const STAGE_ORDER = ['new', 'in_process', 'to_pickup', 'shipped', 'completed', 'cancelled', 'return_requested', 'returned'];

// The six status tabs, rendered as the live pipeline stepper: All |
// New → In Process → To Pickup → Shipped → Completed | Cancelled.
// Each step keeps the old tab's click-to-filter behavior; the bar under
// each stage is sized relative to the busiest stage so the widest bar is
// visibly the current bottleneck, and the largest actionable queue
// (new / in process / to pickup) carries a "largest queue" flag.
const STEP_META = {
  all: { label: 'All Orders', color: '' },
  new: { label: 'New', color: 'blue' },
  in_process: { label: 'In Process', color: 'amber' },
  to_pickup: { label: 'To Pickup', color: 'amber' },
  shipped: { label: 'Shipped', color: 'blue' },
  completed: { label: 'Completed', color: 'green' },
  cancelled: { label: 'Cancelled', color: 'red' },
  return_requested: { label: 'Return Request', color: 'amber' },
  returned: { label: 'Returned', color: 'slate' },
};

// ---- Bulk command bar (#1): apply a status change to many orders ------
const BULK_LABELS = {
  in_process: 'In Process', to_pickup: 'To Pickup', shipped: 'Shipped',
  completed: 'Completed', cancelled: 'Cancelled',
};

const PAYMENT_LABEL = { gcash: 'GCash', maya: 'Maya', card: 'Card', cod: 'COD (Cash on Delivery)' };

// The four values the courier <select> actually offers. A native select
// silently drops a value that matches no <option> (leaving value === ""),
// which is what happens when the courier matrix's "Unassigned" row is
// clicked — its label is capitalised, the option's value is not. Reproduced
// rather than fixed, because fixing it would change what the table shows.
const COURIER_FILTER_VALUES = ['all', 'J&T Express', 'NinjaVan', 'unassigned'];

// REEF-20030 style IDs increase strictly with creation time (see
// routes/orders.js), so the numeric part is a precise tiebreaker for
// same-day orders where order_date alone can't tell which came first.
function orderSeqNumber(orderId) {
  const match = String(orderId).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function sortNewestFirst(rows) {
  return rows.slice().sort(function (a, b) {
    const dateA = a.order_date || '';
    const dateB = b.order_date || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return orderSeqNumber(b.order_id) - orderSeqNumber(a.order_id);
  });
}

// `allOrders[index] = updatedRow`, expressed as a new array so React sees the
// change. Position is preserved exactly as the in-place assignment did.
function mergeRows(rows, updated) {
  if (updated.length === 0) return rows;
  const byId = new Map(updated.map((r) => [r.order_id, r]));
  return rows.map((r) => byId.get(r.order_id) || r);
}

// ---- Waybill (courier-label style) ------------------------------------
// Partial redaction for the printed copy — keeps the first letter of each
// name part and masks the rest, so a stray waybill lying around doesn't
// expose a customer's full name. e.g. "Maria Santos" -> "M**** S*****"
function maskName(fullName) {
  return String(fullName || '').split(' ').map(function (word) {
    if (word.length <= 1) return word;
    return word[0] + '*'.repeat(word.length - 1);
  }).join(' ');
}

// Decorative Code-128-look bars derived deterministically from the text.
// Not scannable: the QR code is the machine-readable mark (see scan.html).
function WaybillBarcode({ text, height }) {
  const src = String(text || '0');
  let seed = 0;
  for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) >>> 0;
  const bars = [];
  let x = 0;
  const count = 24 + src.length * 4;
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const w = 1 + (seed % 3);
    bars.push(<rect key={i} x={x} y="0" width={w} height={height} />);
    x += w + 1 + ((seed >> 8) % 2);
  }
  return (
    <svg
      viewBox={'0 0 ' + x + ' ' + height}
      preserveAspectRatio="none"
      style={{ width: '100%', height: height + 'px', display: 'block' }}
    >
      {bars}
    </svg>
  );
}

function WaybillCourierLogo({ courier }) {
  if (courier === 'NinjaVan') return <span className="wb-logo-ninjavan">NINJA VAN</span>;
  if (courier === 'J&T Express') return <span className="wb-logo-jnt">J&T EXPRESS</span>;
  return <span className="wb-logo-generic">{courier || 'COURIER — TBA'}</span>;
}

// courierOverride: the print-time choice for orders that have no courier
// saved yet — the label must show the courier being handed the parcel,
// even though the assignment is only persisted on the In-Process confirm.
function WaybillBlock({ row, courierOverride, skuSizeMap, qrRefs }) {
  const items = orderItems(row, skuSizeMap);
  const totalQty = items.reduce(function (sum, it) { return sum + (Number(it.qty) || 0); }, 0);
  // Estimated shipping weight: ~0.25 kg per garment, in half-kilo steps.
  const weightKg = Math.max(0.5, Math.ceil(totalQty * 0.25 * 2) / 2).toFixed(1);

  // COD unless the website reported a different (already-paid) method.
  const paid = String(row.payment_method || '').toLowerCase();
  const isCod = paid === '' || paid.indexOf('cod') !== -1 || paid.indexOf('cash') !== -1;
  const codAmount = isCod ? Number(row.total) || 0 : 0;

  // Orders without a courier tracking number yet fall back to the order
  // id so the label still carries a routable code.
  const tracking = row.tracking_number || row.order_id;
  const digits = String(tracking).replace(/\D/g, '') || '0';
  const sortCode = digits.length > 3 ? digits.slice(0, 3) + '-' + digits.slice(3) : digits;

  // Destination header: best-effort city + postal code out of the
  // free-text address (website checkouts send one; older orders don't).
  const addr = String(row.address || '').trim();
  const zip = (addr.match(/\b\d{4}\b/g) || []).pop() || '';
  const addrParts = addr.split(',').map(function (s) { return s.replace(/\b\d{4}\b/g, '').trim(); }).filter(Boolean);
  const destCity = addrParts.length > 0 ? addrParts[addrParts.length - 1] : 'Address on file';

  const now = new Date();
  const sendDate = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  return (
    <div className="waybill-block">
      <div className="wb-label">
        <div className="wb-top">
          <div className="wb-courier-cell">
            <WaybillCourierLogo courier={courierOverride || row.courier} />
          </div>
          <div className="wb-dest-cell">
            <div className="wb-dest-line"><span>{destCity}</span><span>{zip}</span></div>
            <div className="wb-send-date">Send Date: {sendDate}</div>
          </div>
        </div>

        <div className="wb-idrow">
          <div className="wb-orderid-cell">
            <div className="wb-small-label">Order ID</div>
            <div className="wb-orderid">{row.order_id}</div>
          </div>
          <div className="wb-sortcode">{sortCode}</div>
        </div>

        <div className="wb-barcode-band">
          <WaybillBarcode text={tracking} height={52} />
          <div className="wb-barcode-num">{tracking}</div>
        </div>

        <div className="wb-party">
          <div className="wb-party-tag">BUYER</div>
          <div className="wb-party-body">
            <div className="wb-party-head">
              <span>{maskName(row.customer_name)}</span>
              <span>{row.phone || ''}</span>
            </div>
            <div className="wb-party-addr">{addr || 'Address on file — see order record'}</div>
          </div>
        </div>

        <div className="wb-party wb-party--seller">
          <div className="wb-party-tag">SELLER</div>
          <div className="wb-party-body">
            <div className="wb-party-head">
              <span>Alpha Centauri Garments Corp.</span>
              <span>(02) 8117 0117</span>
            </div>
            <div className="wb-party-addr">REEFER Streetwear · 117 Mother Ignacia Avenue, Quezon City, Metro Manila 1103</div>
          </div>
        </div>

        <div className="wb-items">
          <div className="wb-items-title">PACKAGE CONTENTS</div>
          {items.map(function (it, i) {
            return (
              <div className="wb-item-line" key={(it.sku || 'item') + '-' + i}>
                <span>{it.product} · {it.size || '—'}</span>
                <span>{it.sku || '—'} × {Number(it.qty) || 0}</span>
              </div>
            );
          })}
        </div>

        <div className="wb-bottom">
          <div className="wb-qr-cell">
            {/* The qrcodejs library writes a <canvas>/<img> into this node.
                React renders it empty and never touches its children again,
                so the generated mark survives every re-render. */}
            <div
              id={'qr-' + row.order_id}
              ref={(node) => {
                if (node) qrRefs.current.set(row.order_id, node);
                else qrRefs.current.delete(row.order_id);
              }}
            />
          </div>
          <div className="wb-bottom-right">
            <div className="wb-bottom-barcode">
              <WaybillBarcode text={row.order_id} height={34} />
            </div>
            <div className="wb-meta-row">
              <div className="wb-meta-cell">
                Product Quantity: <strong>{totalQty}</strong><br />Weight: {weightKg} kg
              </div>
              <div className="wb-cod-cell">
                COD Amount:
                <div className="wb-cod-amt">₱{codAmount.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="wb-footer">
          <div className="wb-foot-note">
            Thank you for shopping with REEFER Streetwear!<br />Scan the QR at the Scan Station to advance this order.
          </div>
          <div className="wb-attempt">
            <div className="wb-attempt-title">Delivery Attempt</div>
            <div className="wb-attempt-cells"><span>1</span><span>2</span></div>
          </div>
          <div className="wb-attempt">
            <div className="wb-attempt-title">Return Attempt</div>
            <div className="wb-attempt-cells"><span>1</span><span>2</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// PUT /api/orders/:id. Only the waybill-print flow sends a courier; every
// other transition leaves it exactly as it is. The client interceptor already
// surfaces the server's own message (e.g. the returns-approval guards) as
// err.message, which is what the original read off `data.error`.
async function updateOrderStatus(orderId, newStatus, courier) {
  const body = { status: newStatus };
  if (courier) body.courier = courier;
  const response = await client.put('/orders/' + orderId, body);
  return response.data;
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setPanelOpen } = useAppShell();

  const [allOrders, setAllOrders] = useState([]);
  const [skuSizeMap, setSkuSizeMap] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [courierFilter, setCourierFilter] = useState('all');

  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set());
  const [bulkCommand, setBulkCommand] = useState('');

  const [currentPanelOrderId, setCurrentPanelOrderId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusDraft, setStatusDraft] = useState('new');
  const [saveStatusMsg, setSaveStatusMsg] = useState({ text: '', color: '' });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmContent, setConfirmContent] = useState({ title: 'Confirm', message: '', okLabel: 'Confirm' });
  const confirmCallbackRef = useRef(null);

  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [courierModalMessage, setCourierModalMessage] = useState('');
  const [waybillCourier, setWaybillCourier] = useState('J&T Express');
  const courierModalCallbackRef = useRef(null);

  const [printJob, setPrintJob] = useState(null);
  const printSeqRef = useRef(0);
  const qrRefs = useRef(new Map());
  const ordersPendingPrintAdvanceRef = useRef([]);
  // Courier chosen at print time, per order, persisted only when the batch
  // is confirmed into In Process (previews assign nothing).
  const pendingWaybillCourierRef = useRef({});

  const selectAllRef = useRef(null);
  const loadOrdersRef = useRef(null);

  // ?tab= is the single source of truth for the active step, exactly as the
  // original's URLSearchParams read + history.replaceState round-trip was.
  const activeTab = searchParams.get('tab') || 'all';

  const retryLoad = useCallback(() => {
    if (loadOrdersRef.current) loadOrdersRef.current();
  }, []);

  // Status dot + "last synced" line instead of the old wide green banner —
  // frees vertical space above the queue. Red dot + "Reconnecting…" (and
  // an automatic retry) when the feed drops.
  const sync = useSyncStatus({ retry: retryLoad });
  const syncOk = sync.ok;
  const syncError = sync.error;

  const loadOrders = useCallback(async () => {
    try {
      const [ordersRes, invRes] = await Promise.all([
        client.get('/orders'),
        client.get('/inventory'),
      ]);
      const orders = ordersRes.data || [];

      // Orders store the SKU but not the size; the size lives on the
      // inventory record, so build a quick SKU -> size lookup for display.
      const inventory = invRes.data || [];
      const map = {};
      inventory.forEach(function (item) { map[item.sku] = item.size; });

      setSkuSizeMap(map);
      setAllOrders(orders);

      syncOk(orders.length + ' orders loaded');
    } catch (err) {
      syncError(err.message);
    }
  }, [syncOk, syncError]);

  useEffect(() => {
    loadOrdersRef.current = loadOrders;
  }, [loadOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (window.QRCode) return;
    if (document.querySelector('script[data-ash-qrcode]')) return;
    const script = document.createElement('script');
    script.src = QR_SCRIPT_SRC;
    script.async = true;
    script.setAttribute('data-ash-qrcode', '1');
    document.head.appendChild(script);
  }, []);

  // Normalise the URL on load as well, so arriving at a bare "/orders"
  // (which defaults to the All tab) still highlights "All Orders" in the
  // sidebar rather than leaving no subtab marked at all. `replace` rather
  // than push so flipping between pills doesn't pile up history entries the
  // Back button has to walk through.
  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams({ tab: 'all' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const selectTab = useCallback((key) => {
    setSearchParams({ tab: key }, { replace: true });
  }, [setSearchParams]);

  // `.main.panel-open` is the shell's element now.
  useEffect(() => {
    setPanelOpen(detailOpen);
  }, [detailOpen, setPanelOpen]);

  // ---- Reusable confirmation modal --------------------------------------
  const showConfirm = useCallback((title, message, okLabel, onConfirm) => {
    setConfirmContent({ title, message, okLabel: okLabel || 'Confirm' });
    confirmCallbackRef.current = onConfirm;
    setConfirmOpen(true);
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmOpen(false);
    confirmCallbackRef.current = null;
  }, []);

  const openDetailPanel = useCallback((orderId) => {
    setCurrentPanelOrderId(orderId);
    setSaveStatusMsg({ text: '', color: '' });
    setDetailOpen(true);
  }, []);

  const closeDetailPanel = useCallback(() => {
    setDetailOpen(false);
  }, []);

  // ---- Derived data -----------------------------------------------------

  const panelRow = useMemo(
    () => allOrders.find((o) => o.order_id === currentPanelOrderId) || null,
    [allOrders, currentPanelOrderId],
  );
  const panelStatus = panelRow ? panelRow.status : '';

  // openDetailPanel() re-seeded the manual-override select from the row every
  // time it ran — on open, and again after every save that changed the row.
  useEffect(() => {
    if (panelStatus) setStatusDraft(panelStatus);
  }, [currentPanelOrderId, panelStatus]);

  const counts = useMemo(() => {
    // Always show every canonical stage so the strip stays put even when a
    // stage currently has zero orders. Any unexpected status that isn't in
    // STAGE_ORDER still gets a step appended at the end.
    const statusesPresent = new Set(allOrders.map((o) => o.status));
    const extras = [...statusesPresent].filter((s) => STAGE_ORDER.indexOf(s) === -1);
    const result = {};
    STAGE_ORDER.concat(extras).forEach((key) => {
      result[key] = allOrders.filter((o) => o.status === key).length;
    });
    return { counts: result, extras };
  }, [allOrders]);

  const flagged = useMemo(() => allOrders
    .filter((o) => STAGE_AGE_LIMITS[o.status])
    .map((o) => {
      const days = daysInStage(o);
      const lim = STAGE_AGE_LIMITS[o.status];
      return { o, days, sev: days >= lim.late ? 'late' : days >= lim.warn ? 'warn' : null };
    })
    .filter((e) => e.sev)
    .sort((a, b) => {
      if (a.sev !== b.sev) return a.sev === 'late' ? -1 : 1;
      return b.days - a.days;
    }), [allOrders]);

  const visibleRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let filtered = allOrders;

    if (activeTab !== 'all') {
      filtered = filtered.filter((o) => o.status === activeTab);
    }

    if (courierFilter !== 'all') {
      // Website orders arrive with NO courier (one is assigned at waybill
      // time) — they get their own filter bucket instead of being shown,
      // falsely, as J&T's.
      filtered = filtered.filter((o) => (courierFilter === 'unassigned' ? !o.courier : o.courier === courierFilter));
    }

    if (term) {
      filtered = filtered.filter((o) => {
        const itemText = orderItems(o, skuSizeMap).map((it) => it.product + ' ' + it.sku).join(' ');
        return (o.order_id + (o.external_order_id || '') + o.customer_name + o.product + ' ' + itemText).toLowerCase().includes(term);
      });
    }

    return sortNewestFirst(filtered);
  }, [allOrders, activeTab, courierFilter, searchTerm, skuSizeMap]);

  const selectedVisibleCount = useMemo(
    () => visibleRows.filter((r) => selectedOrderIds.has(r.order_id)).length,
    [visibleRows, selectedOrderIds],
  );

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate =
      visibleRows.length > 0 && selectedVisibleCount > 0 && selectedVisibleCount < visibleRows.length;
  }, [visibleRows.length, selectedVisibleCount]);

  // ---- Mutations --------------------------------------------------------

  async function saveStatus() {
    const newStatus = statusDraft;
    const orderId = currentPanelOrderId;

    setSaveStatusMsg({ text: 'Saving...', color: '#64748b' });

    try {
      const updatedRow = await updateOrderStatus(orderId, newStatus);
      setAllOrders((prev) => mergeRows(prev, [updatedRow]));
      // Re-render the panel so stage-dependent sections (return approval,
      // scan hint, timeline) match the status that was just saved.
      setCurrentPanelOrderId(orderId);
      setDetailOpen(true);

      setSaveStatusMsg({ text: 'Saved.', color: '#16a34a' });
    } catch (err) {
      setSaveStatusMsg({ text: 'Save failed: ' + err.message, color: '#dc2626' });
    }
  }

  // ---- Return approval: the manual gate ---------------------------------
  // The server refuses to set an order to "returned" unless it's currently
  // "return_requested", so these two buttons are the whole approval surface.
  async function resolveReturn(newStatus, successMsg) {
    const orderId = currentPanelOrderId;
    try {
      const updatedRow = await updateOrderStatus(orderId, newStatus);
      setAllOrders((prev) => mergeRows(prev, [updatedRow]));
      setCurrentPanelOrderId(orderId);
      setSaveStatusMsg({ text: '', color: '' });
      setDetailOpen(true);
      syncOk(successMsg);
    } catch (err) {
      setSaveStatusMsg({ text: err.message, color: '#dc2626' });
    }
  }

  function handleApproveReturn() {
    const row = panelRow;
    if (!row) return;
    showConfirm(
      'Approve return?',
      'Approve the return for order ' + row.order_id + '? Every item in the order will be restored to inventory. This is the manual approval step — it can be undone by moving the order back to Return Requested.',
      'Approve Return',
      function () { resolveReturn('returned', 'Return approved for ' + row.order_id + ' — stock restored to inventory.'); },
    );
  }

  function handleRejectReturn() {
    const row = panelRow;
    if (!row) return;
    // Put the order back where it was before the request: Completed if it
    // had reached completion, otherwise Shipped.
    const revertTo = row.completed_date ? 'completed' : 'shipped';
    showConfirm(
      'Reject return request?',
      'Reject the return request for order ' + row.order_id + '? The order goes back to ' + (revertTo === 'completed' ? 'Completed' : 'Shipped') + ' and no stock moves.',
      'Reject Request',
      function () { resolveReturn(revertTo, 'Return request rejected for ' + row.order_id + '.'); },
    );
  }

  async function applyBulkCommand() {
    const command = bulkCommand;
    if (!command) { window.alert('Choose an action to apply to the selected orders.'); return; }
    const ids = [...selectedOrderIds];
    if (ids.length === 0) return;

    const verb = command === 'cancelled' ? 'Cancel' : ('Mark as ' + BULK_LABELS[command]);
    showConfirm(
      verb + '?',
      verb + ' ' + ids.length + ' selected order' + (ids.length > 1 ? 's' : '') + '? ' +
        (command === 'cancelled' ? 'Cancelling releases any reserved stock back to inventory.' : 'This is a manual status change.'),
      verb,
      async function () {
        const updates = [];
        try {
          for (const orderId of ids) {
            const updatedRow = await updateOrderStatus(orderId, command);
            updates.push(updatedRow);
          }
          setSelectedOrderIds(new Set());
          setBulkCommand('');
          syncOk(ids.length + ' order(s) updated to ' + BULK_LABELS[command]);
        } catch (err) {
          syncError('Bulk update failed: ' + err.message);
        } finally {
          setAllOrders((prev) => mergeRows(prev, updates));
        }
      },
    );
  }

  async function advancePrintedOrders(ids) {
    const updates = [];
    try {
      for (const orderId of ids) {
        const updatedRow = await updateOrderStatus(orderId, 'in_process', pendingWaybillCourierRef.current[orderId]);
        delete pendingWaybillCourierRef.current[orderId];
        updates.push(updatedRow);
      }
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (currentPanelOrderId && ids.includes(currentPanelOrderId)) {
        setSaveStatusMsg({ text: '', color: '' });
        setDetailOpen(true);
      }
    } catch (err) {
      window.alert('Could not advance order(s): ' + err.message);
    } finally {
      setAllOrders((prev) => mergeRows(prev, updates));
    }
  }

  // ---- Waybill printing -------------------------------------------------

  const reallyPrintWaybills = useCallback((rows) => {
    printSeqRef.current += 1;
    setPrintJob({
      seq: printSeqRef.current,
      // Snapshot the courier at print time so a later re-render (the pending
      // choice is deleted once the batch is confirmed) can't repaint the
      // label with a different logo than the one that came off the printer.
      entries: rows.map((r) => ({ row: r, courier: pendingWaybillCourierRef.current[r.order_id] || r.courier })),
    });
  }, []);

  const printWaybillsFor = useCallback((rows) => {
    // Any NEW order without a courier needs one before the waybill exists —
    // the label carries the courier's logo, and the storefront's tracker
    // shows whatever we save here.
    const needCourier = rows.filter((r) => !r.courier && r.status === 'new');
    if (needCourier.length > 0) {
      setCourierModalMessage(
        (needCourier.length === 1 ? 'Order ' + needCourier[0].order_id + ' has' : needCourier.length + ' of these orders have') +
        ' no courier yet. The courier you pick is printed on the waybill' + (rows.length > 1 ? 's' : '') +
        ' and saved when the batch is confirmed into In Process.',
      );
      courierModalCallbackRef.current = function (courier) {
        needCourier.forEach((r) => { pendingWaybillCourierRef.current[r.order_id] = courier; });
        reallyPrintWaybills(rows);
      };
      setCourierModalOpen(true);
      return;
    }
    reallyPrintWaybills(rows);
  }, [reallyPrintWaybills]);

  function printWaybill() {
    if (!panelRow) return;
    printWaybillsFor([panelRow]);
  }

  function printSelectedWaybills() {
    const rows = allOrders.filter((o) => selectedOrderIds.has(o.order_id));
    if (rows.length === 0) return;
    printWaybillsFor(rows);
  }

  // The waybill markup is in the DOM by the time this runs (same commit), so
  // this is the original's "fill #print-root, mount the QRs, print" sequence.
  useEffect(() => {
    if (!printJob) return;

    printJob.entries.forEach(({ row }) => {
      const container = qrRefs.current.get(row.order_id);
      if (!container) return;
      container.innerHTML = '';
      try {
        new window.QRCode(container, { text: row.order_id, width: 118, height: 118 });
      } catch {
        // QR library failed to load (e.g. offline / CDN blocked) — the
        // Order ID is already printed large right next to this, so the
        // waybill is still fully usable without the QR image.
        container.innerHTML = "<div style='width:118px;height:118px;border:1px dashed #000;display:flex;align-items:center;justify-content:center;font-size:10px;color:#000;text-align:center;padding:8px;box-sizing:border-box;'>QR unavailable &mdash; use Order ID</div>";
      }
    });

    // Remember which "new" orders were in this batch, but DON'T advance yet.
    // afterprint fires whether the user actually printed OR cancelled the
    // preview, so we can't trust it as a signal that a waybill was really
    // printed. Instead we ask for explicit confirmation once the dialog
    // closes — this is what lets the user verify the print preview first.
    ordersPendingPrintAdvanceRef.current = printJob.entries
      .filter(({ row }) => row.status === 'new')
      .map(({ row }) => row.order_id);
    window.print();
  }, [printJob]);

  // The afterprint listener is registered once; this keeps the callback it
  // fires pointed at the current closure without re-binding the listener.
  const advanceRef = useRef(null);
  useEffect(() => {
    advanceRef.current = advancePrintedOrders;
  });

  useEffect(() => {
    function handleAfterPrint() {
      if (ordersPendingPrintAdvanceRef.current.length === 0) return;
      const ids = ordersPendingPrintAdvanceRef.current;
      ordersPendingPrintAdvanceRef.current = [];

      const label = ids.length === 1 ? 'order ' + ids[0] : ids.length + ' new orders';
      showConfirm(
        'Move to In Process?',
        'Did the waybill' + (ids.length > 1 ? 's' : '') + ' print correctly? Confirm to move ' + label +
          ' to In Process. Choose Cancel if you were just previewing or the print failed.',
        'Yes, move to In Process',
        function () { advanceRef.current(ids); },
      );
    }
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [showConfirm]);

  // ---- Selection --------------------------------------------------------

  function toggleRowSelection(orderId, checked) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  }

  function toggleSelectAll(checked) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      visibleRows.forEach((r) => {
        if (checked) next.add(r.order_id);
        else next.delete(r.order_id);
      });
      return next;
    });
  }

  // ---- Stepper ----------------------------------------------------------

  const stepNodes = useMemo(() => {
    const c = counts.counts;
    const flow = ['new', 'in_process', 'to_pickup', 'shipped', 'completed'];
    const max = Math.max.apply(null, flow.map((k) => c[k]).concat([1]));

    // Only flag a "largest queue" when there's an actual pile-up (2+
    // orders) — flagging a queue of one is noise, not triage.
    const actionable = ['new', 'in_process', 'to_pickup'];
    let biggest = null;
    actionable.forEach((k) => {
      if (c[k] >= 2 && (biggest === null || c[k] > c[biggest])) biggest = k;
    });

    // barPct === null → no load bar (the All step's bar would always be
    // full and carries no comparative information).
    function step(key, count, barPct) {
      const meta = STEP_META[key] || { label: key, color: '' };
      const className = 'step' + (meta.color ? ' step-' + meta.color : '') +
        (key === activeTab ? ' active' : '') +
        (count === 0 && key !== 'all' ? ' step-empty' : '');
      return (
        <div key={'step-' + key} className={className} onClick={() => selectTab(key)}>
          {key === biggest ? <span className="step-tag">Largest queue</span> : null}
          <span className="step-label">{meta.label}</span>
          <div className="step-count">{count}</div>
          {barPct === null ? null : (
            <div className="step-load"><i style={{ width: barPct + '%' }} /></div>
          )}
        </div>
      );
    }

    function bar(key) {
      return c[key] === 0 ? 0 : Math.max(6, Math.round((c[key] / max) * 100));
    }

    const nodes = [];
    nodes.push(step('all', allOrders.length, null));
    nodes.push(<span key="div-1" className="step-divider" />);
    flow.forEach((key, i) => {
      if (i > 0) nodes.push(<span key={'arrow-' + key} className="step-arrow">➜</span>);
      nodes.push(step(key, c[key], bar(key)));
    });
    nodes.push(<span key="div-2" className="step-divider" />);
    nodes.push(step('cancelled', c.cancelled, bar('cancelled')));
    nodes.push(<span key="div-3" className="step-divider" />);
    nodes.push(step('return_requested', c.return_requested, bar('return_requested')));
    nodes.push(<span key="arrow-returned" className="step-arrow">➜</span>);
    nodes.push(step('returned', c.returned, bar('returned')));
    counts.extras.forEach((key) => {
      nodes.push(step(key, c[key], null));
    });
    return nodes;
  }, [counts, allOrders.length, activeTab, selectTab]);

  // ---- Orders by Courier: answers "where's my backlog" directly ---------
  // Rows = couriers, columns = the four active stages. The amber cell is
  // the courier whose queue is notably larger than the others in that
  // stage (strictly the biggest, with at least 2 couriers to compare).
  const courierMatrix = useMemo(() => {
    const stages = ['new', 'in_process', 'to_pickup', 'shipped'];
    const couriers = [...new Set(allOrders.map((o) => o.courier || 'Unassigned'))].sort();
    if (couriers.length === 0) return { stages, couriers, grid: {} };

    const grid = {};
    couriers.forEach((c) => {
      grid[c] = {};
      stages.forEach((s) => {
        grid[c][s] = allOrders.filter((o) => (o.courier || 'Unassigned') === c && o.status === s).length;
      });
    });
    return { stages, couriers, grid };
  }, [allOrders]);

  const MATRIX_SHORT = { new: 'New', in_process: 'In Proc', to_pickup: 'Pickup', shipped: 'Shipped' };

  // Clicking a count jumps the table to that courier + stage.
  function matrixCellClick(stage, courier) {
    // A native <select> drops a value that matches no <option>. The matrix
    // labels the courier-less bucket "Unassigned" while the filter option's
    // value is "unassigned", so that one cell lands the filter on "" —
    // faithfully reproduced rather than quietly corrected.
    setCourierFilter(COURIER_FILTER_VALUES.includes(courier) ? courier : '');
    selectTab(stage);
  }

  // ---- Detail panel data ------------------------------------------------

  const panelItems = panelRow ? orderItems(panelRow, skuSizeMap) : [];
  const panelTotalQty = panelItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  // Customer contact + payment — present only on orders the REEFER website
  // forwarded.
  const custRows = panelRow
    ? [
      ['Email', panelRow.email],
      ['Phone', panelRow.phone],
      ['Address', panelRow.address],
      ['Payment', panelRow.payment_method ? (PAYMENT_LABEL[panelRow.payment_method] || panelRow.payment_method) : null],
    ].filter((pair) => pair[1])
    : [];

  const timelineSteps = [];
  if (panelRow) {
    timelineSteps.push({ label: 'Ordered', date: panelRow.order_date });
    timelineSteps.push({ label: 'In Process', date: panelRow.in_process_date });
    timelineSteps.push({ label: 'To Pickup', date: panelRow.to_pickup_date });
    timelineSteps.push({ label: 'Shipped', date: panelRow.shipped_date });
    timelineSteps.push({ label: 'Completed', date: panelRow.completed_date });
    // The return steps only appear once a return is actually in play, so
    // the timeline stays a clean five-step ladder for normal orders.
    if (panelRow.return_requested_date || panelRow.returned_date ||
        panelRow.status === 'return_requested' || panelRow.status === 'returned') {
      timelineSteps.push({ label: 'Return Requested', date: panelRow.return_requested_date });
      timelineSteps.push({ label: 'Returned', date: panelRow.returned_date });
    }
  }

  const panelCourierName = panelRow ? (panelRow.courier || 'the courier') : 'the courier';
  const NEXT_STEP_TEXT = {
    in_process: "Waiting for a warehouse staff member to scan this order's QR at the Scan Station to move it to To Pickup.",
    to_pickup: 'Waiting for ' + panelCourierName + " to scan this order's QR at pickup to mark it Shipped.",
    shipped: 'Waiting for ' + panelCourierName + "'s delivery confirmation scan to mark this order Completed.",
    completed: 'This order has been delivered by ' + panelCourierName + ' and completed.',
    cancelled: 'This order was cancelled.',
    return_requested: 'The customer asked to return this order. It stays out of inventory until someone approves the return below.',
    returned: 'Return approved — every item was restored to inventory.',
  };

  const selectedCount = selectedOrderIds.size;

  return (
    <>
      <h1>Orders Queue</h1>
      <p className="sub">Live orders — reading directly from ash-erp-data.xlsx.</p>

      <SyncLine sync={sync} />

      <div className="toolbar">
        <div className="search-box">
          <span>🔍</span>
          <input
            id="search-input"
            placeholder="Search order ID, customer, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          id="courier-filter"
          value={courierFilter}
          onChange={(e) => setCourierFilter(e.target.value)}
        >
          <option value="all">All Couriers</option>
          <option value="J&T Express">J&T Express</option>
          <option value="NinjaVan">NinjaVan</option>
          <option value="unassigned">Unassigned</option>
        </select>
        <Link to="/stocks/scan" className="btn btn-outline">Open Scan Station</Link>
      </div>

      <div className="stepper" id="tabs">{stepNodes}</div>

      <div id="bulk-action-bar" className={selectedCount > 0 ? 'visible' : ''}>
        <span className="bulk-count" id="bulk-count">{selectedCount} selected</span>
        <select id="bulk-command" value={bulkCommand} onChange={(e) => setBulkCommand(e.target.value)}>
          <option value="">Choose action…</option>
          <option value="in_process">Mark as In Process</option>
          <option value="to_pickup">Mark as To Pickup</option>
          <option value="shipped">Mark as Shipped</option>
          <option value="completed">Mark as Completed</option>
          <option value="cancelled">Cancel Orders</option>
        </select>
        <button id="bulk-apply-btn" type="button" className="btn btn-primary" onClick={applyBulkCommand}>Apply</button>
        <button id="bulk-print-btn" type="button" className="btn btn-accent" onClick={printSelectedWaybills}>
          🖨️ Print Waybills ({selectedCount})
        </button>
        <button
          id="bulk-clear-btn"
          type="button"
          className="btn btn-outline"
          onClick={() => setSelectedOrderIds(new Set())}
        >
          Clear
        </button>
      </div>

      <div className="work-row">
        <div className="table-scroll">
          <table>
            <colgroup>
              <col style={{ width: '36px' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    id="select-all-checkbox"
                    ref={selectAllRef}
                    checked={visibleRows.length > 0 && selectedVisibleCount === visibleRows.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Size</th>
                <th className="col-num">Qty</th>
                <th>Status</th>
                <th>Courier</th>
                <th className="col-num">Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody id="orders-body">
              {visibleRows.map((row) => {
                const items = orderItems(row, skuSizeMap);
                const multi = items.length > 1;
                const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

                return (
                  <tr key={row.order_id} className="data-row" onClick={() => openDetailPanel(row.order_id)}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(row.order_id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => toggleRowSelection(row.order_id, e.target.checked)}
                      />
                    </td>
                    <td>{row.order_id}</td>
                    {/* customer_name arrives from public storefront checkout — hostile input. */}
                    <td>{row.customer_name}</td>
                    {/* Multi-design orders list every design on its own sub-line; the
                        matching size and per-design quantity sit on the same line in the
                        Size and Qty columns (all three share the .multi-products layout so
                        the rows line up across columns). */}
                    <td>
                      {multi ? (
                        <div className="multi-products">
                          {items.map((it, i) => (
                            <div className="multi-product-line" key={(it.sku || 'item') + '-' + i}>{it.product}</div>
                          ))}
                        </div>
                      ) : items[0].product}
                    </td>
                    <td>
                      {multi ? (
                        <div className="multi-products">
                          {items.map((it, i) => (
                            <div className="multi-product-line" key={(it.sku || 'item') + '-' + i}>
                              <span className="size-badge">{it.size || '—'}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="size-badge">{items[0].size || orderSize(row, skuSizeMap)}</span>}
                    </td>
                    <td className="col-num">
                      {multi ? (
                        <div className="multi-products multi-qty">
                          {items.map((it, i) => (
                            <div className="multi-product-line" key={(it.sku || 'item') + '-' + i}>{Number(it.qty) || 0}</div>
                          ))}
                        </div>
                      ) : totalQty}
                    </td>
                    <td>
                      <span className={'status-pill status-' + row.status}>
                        {STEP_META[row.status] ? STEP_META[row.status].label : row.status}
                      </span>
                    </td>
                    <td>
                      <span className={'courier-pill courier-' + courierSlug(row.courier)}>
                        {row.courier || 'Unassigned'}
                      </span>
                    </td>
                    <td className="col-num">₱{row.total}</td>
                    <td>{stageDate(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="side-col">
          <div className="panel">
            <div className="panel-title">
              Needs Follow-up
              <span className={'aging-count' + (flagged.length > 0 ? ' visible' : '')} id="aging-count">
                {flagged.length}
              </span>
            </div>
            <div className="panel-sub">{"Past their stage's normal turnaround — oldest first. Click one to open it."}</div>
            <div id="aging-list" style={{ marginTop: '6px' }}>
              {flagged.length === 0 ? (
                <div className="aging-empty">✓ Nothing stuck — every active order is inside its stage&apos;s turnaround.</div>
              ) : (
                <>
                  {flagged.slice(0, 5).map((e) => (
                    <div
                      key={e.o.order_id}
                      className="aging-row"
                      title={'In this stage since ' + stageDate(e.o) + ' — click to open'}
                      onClick={() => openDetailPanel(e.o.order_id)}
                    >
                      <span className="aging-id">{e.o.order_id}</span>
                      <span className="aging-cust">{e.o.customer_name}</span>
                      <span className={'status-pill status-' + e.o.status}>{STAGE_SHORT[e.o.status] || e.o.status}</span>
                      <span className={'aging-days ' + e.sev}>{e.days}d</span>
                    </div>
                  ))}
                  {flagged.length > 5 ? (
                    <div className="aging-more">
                      +{flagged.length - 5} more past their turnaround — resolve the ones above first.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* "Where's my backlog" — per-courier queue sizes per stage. The
              amber cell is the courier queue that's notably larger than the
              others in that stage; click any count to filter the table. */}
          <div className="panel">
            <div className="panel-title">🚚 Orders by Courier</div>
            <div className="panel-sub">Amber = the notably bigger queue in that stage. Click a count to filter.</div>
            <div id="courier-matrix" style={{ marginTop: '8px' }}>
              {courierMatrix.couriers.length === 0 ? (
                <div className="aging-empty">No orders yet.</div>
              ) : (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Courier</th>
                      {courierMatrix.stages.map((s) => (
                        <th key={s} className="num" title={STEP_META[s].label}>{MATRIX_SHORT[s]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {courierMatrix.couriers.map((c) => (
                      <tr key={c}>
                        <td style={{ fontWeight: 700 }}>{c}</td>
                        {courierMatrix.stages.map((s) => {
                          const v = courierMatrix.grid[c][s];
                          const columnMax = Math.max.apply(null, courierMatrix.couriers.map((cc) => courierMatrix.grid[cc][s]));
                          // Amber only for a real backlog: the strict column max, at least 2
                          // orders — a 1-vs-0 difference isn't a signal worth highlighting.
                          const isHot = courierMatrix.couriers.length > 1 && v >= 2 && v === columnMax &&
                            courierMatrix.couriers.filter((cc) => courierMatrix.grid[cc][s] === columnMax).length === 1;
                          return (
                            <td
                              key={s}
                              className={'num' + (isHot ? ' hot' : '') + (v === 0 ? ' zero' : '')}
                              title={c + ' — ' + v + ' order(s) ' + STEP_META[s].label + '. Click to filter.'}
                              onClick={() => matrixCellClick(s, c)}
                            >
                              {v}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* The detail panel, the two modals and #print-root were direct children
          of <body> in the original — a fixed-position drawer, two fixed
          overlays and the print surface, none of which belong inside the
          scrolling .main column. A fragment portal puts them back exactly
          where they were without inserting a wrapper flex item. */}
      {createPortal(
        <>
          <div className={'detail-panel' + (detailOpen ? ' open' : '')} id="detail-panel">
            <button className="close-btn" id="close-panel-btn" type="button" onClick={closeDetailPanel}>✕</button>
            {panelRow ? (
              <>
                <div className="order-id" id="panel-order-id">{panelRow.order_id}</div>
                {/* The originating system's own number (e.g. the website's RFR-PH…),
                    shown only when the order came from outside this ERP. */}
                <div
                  className="prod-line"
                  id="panel-external-line"
                  style={{ display: panelRow.external_order_id ? 'block' : 'none', marginTop: '2px' }}
                >
                  Website order: <strong id="panel-external-ref">{panelRow.external_order_id || ''}</strong>
                </div>
                <div className="cust-name" id="panel-customer">{panelRow.customer_name}</div>

                <div className="section-label" style={{ margin: '12px 0 6px' }}>Items in this package</div>
                <div id="panel-items">
                  {panelItems.map((it, i) => {
                    const lineTotal = it.line_total != null ? it.line_total : (Number(it.price) || 0) * (Number(it.qty) || 0);
                    return (
                      <div className="panel-item-row" key={(it.sku || 'item') + '-' + i}>
                        <div className="panel-item-main">
                          {it.product}
                          {it.size ? <> <span className="size-badge">{it.size}</span></> : null}
                        </div>
                        <div className="panel-item-meta">×{it.qty} · ₱{Number(lineTotal).toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="stat-row" style={{ marginTop: '12px' }}>
                  <div className="stat-box">
                    <div className="stat-label">Total Qty</div>
                    <div className="stat-value" id="panel-qty">{panelTotalQty}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Order Total</div>
                    <div className="stat-value" id="panel-total">₱{Number(panelRow.total).toLocaleString()}</div>
                  </div>
                </div>

                <div className="prod-line" style={{ marginTop: '14px' }}>
                  Tracking: <strong id="panel-tracking">{panelRow.tracking_number}</strong>
                </div>
                {/* No fallback name here: inventing "J&T Express" for an order no
                    courier has touched made the panel disagree with the website,
                    which honestly says "not assigned yet". Same fact, same words. */}
                <div className="prod-line">Courier: <strong id="panel-courier">{panelRow.courier || 'Unassigned'}</strong></div>
                <div className="prod-line">Order date: <strong id="panel-date">{panelRow.order_date}</strong></div>

                {/* Filled for orders forwarded from the REEFER website; hidden entirely
                    for simulated/hand-made orders, which carry no contact details. */}
                <div id="panel-customer-info" style={{ display: custRows.length ? 'block' : 'none' }}>
                  <div className="section-label" style={{ margin: '16px 0 6px' }}>Customer Info</div>
                  <div id="panel-customer-rows">
                    {custRows.map((pair) => (
                      <div className="prod-line" key={pair[0]}>{pair[0]}: <strong>{pair[1]}</strong></div>
                    ))}
                  </div>
                </div>

                <div className="section-label" style={{ margin: '16px 0 8px' }}>Stage Timeline</div>
                <div id="panel-timeline">
                  {timelineSteps.map((s) => {
                    const done = !!s.date;
                    return (
                      <div
                        key={s.label}
                        style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 0', fontSize: '12px', color: done ? '#334155' : '#94a3b8' }}
                      >
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: done ? '#16a34a' : '#cbd5e1', flex: 'none' }} />
                        <span style={{ flex: 1 }}>{s.label}</span>
                        <span style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: '11.5px' }}>{done ? s.date : '—'}</span>
                      </div>
                    );
                  })}
                </div>

                <div id="print-waybill-section" style={{ marginTop: '14px', display: panelRow.status === 'new' ? 'block' : 'none' }}>
                  <button id="print-waybill-btn" type="button" className="btn btn-accent btn-block" onClick={printWaybill}>
                    🖨️ Print Waybill
                  </button>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                    Prints a QR waybill and moves this order to In Process.
                  </div>
                </div>

                <div
                  id="scan-hint-section"
                  style={{ marginTop: '14px', fontSize: '11.5px', color: '#64748b', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', display: panelRow.status === 'new' ? 'none' : 'block' }}
                >
                  {panelRow.status === 'new' ? '' : (NEXT_STEP_TEXT[panelRow.status] || '')}
                </div>

                {/* Returns are never auto-approved: this section is the ONLY way an
                    order becomes Returned, and it's a person clicking Approve. */}
                <div
                  id="return-approval-section"
                  style={{ display: panelRow.status === 'return_requested' ? 'block' : 'none', marginTop: '14px', background: 'var(--amber-bg)', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px 14px' }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--amber-text)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Return awaiting approval
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--amber-text)', marginTop: '6px', lineHeight: 1.45 }}>
                    Approving restores every item in this order to inventory. Rejecting puts the order back to its previous stage.
                  </div>
                  <button id="approve-return-btn" type="button" className="btn btn-primary btn-block" style={{ marginTop: '10px' }} onClick={handleApproveReturn}>
                    ✅ Approve Return
                  </button>
                  <button id="reject-return-btn" type="button" className="btn btn-outline btn-block" style={{ marginTop: '8px' }} onClick={handleRejectReturn}>
                    Reject Request
                  </button>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f0f1f3' }}>
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Manual override
                  </div>
                  <select id="status-select" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                    <option value="new">New</option>
                    <option value="in_process">In Process</option>
                    <option value="to_pickup">To Pickup</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="return_requested">Return Requested</option>
                  </select>
                  <button id="save-status-btn" type="button" className="btn btn-primary btn-block" style={{ marginTop: '10px' }} onClick={saveStatus}>
                    Update Status
                  </button>
                </div>
                <div id="save-status-msg" style={{ fontSize: '11.5px', marginTop: '8px', color: saveStatusMsg.color }}>
                  {saveStatusMsg.text}
                </div>
              </>
            ) : null}
          </div>

          <div
            className={'modal-overlay' + (confirmOpen ? ' open' : '')}
            id="confirm-modal"
            style={{ display: 'none' }}
          >
            <div className="modal-card">
              <div className="modal-title" id="confirm-title">{confirmContent.title}</div>
              <div className="modal-body" id="confirm-message">{confirmContent.message}</div>
              <div className="modal-actions">
                <button className="btn btn-outline" id="confirm-cancel-btn" type="button" onClick={hideConfirm}>Back</button>
                <button
                  className="btn btn-primary"
                  id="confirm-ok-btn"
                  type="button"
                  onClick={() => {
                    const cb = confirmCallbackRef.current;
                    hideConfirm();
                    if (cb) cb();
                  }}
                >
                  {confirmContent.okLabel}
                </button>
              </div>
            </div>
          </div>

          {/* Courier choice for waybills. Website orders arrive courier-less on
              purpose (nothing has touched them yet); the waybill is the first thing
              that names a courier, so the choice is made here at print time. */}
          <div
            className={'modal-overlay' + (courierModalOpen ? ' open' : '')}
            id="courier-modal"
            style={{ display: 'none' }}
          >
            <div className="modal-card">
              <div className="modal-title">Choose Courier</div>
              <div className="modal-body" id="courier-modal-message">{courierModalMessage}</div>
              <select
                id="waybill-courier-select"
                value={waybillCourier}
                onChange={(e) => setWaybillCourier(e.target.value)}
              >
                <option value="J&T Express">J&T Express</option>
                <option value="NinjaVan">NinjaVan</option>
              </select>
              <div className="modal-actions">
                <button
                  className="btn btn-outline"
                  id="courier-cancel-btn"
                  type="button"
                  onClick={() => {
                    setCourierModalOpen(false);
                    courierModalCallbackRef.current = null;
                  }}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  id="courier-ok-btn"
                  type="button"
                  onClick={() => {
                    const cb = courierModalCallbackRef.current;
                    courierModalCallbackRef.current = null;
                    setCourierModalOpen(false);
                    if (cb) cb(waybillCourier);
                  }}
                >
                  Print Waybill
                </button>
              </div>
            </div>
          </div>

          <div id="print-root">
            {printJob ? printJob.entries.map(({ row, courier }) => (
              <WaybillBlock
                key={row.order_id}
                row={row}
                courierOverride={courier}
                skuSizeMap={skuSizeMap}
                qrRefs={qrRefs}
              />
            )) : null}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

// Port of public/inventory.html.
//
// Same two tabs (Products / Activity Log), the same List and Grid subviews, the
// same right-hand detail panel with its confirm-and-queue stock adjustment, the
// same Import Stock modal (Excel bulk upload + single product add/update), the
// same column-help popovers and toast. Endpoints, payloads, validation text and
// status colours are unchanged.
//
// What the port replaces, and nothing more:
//   * requireAuth()            → ProtectedRoute (src/routes/ProtectedRoute.jsx)
//   * the copied <div class="sidebar">   → AppLayout
//   * authFetch / API_BASE     → src/api/client.js
//   * authDownload()           → downloadFile() in the same module
//   * initSyncStatus(el, …)    → useSyncStatus() + <SyncLine>
//   * compareSizes             → src/utils/sizeOrder.js
//   * escapeHtml() / attr()    → gone; JSX escapes interpolated text
//   * document.getElementById  → state + controlled inputs
//   * .main.panel-open toggling → useAppShell().setPanelOpen (AppLayout owns .main)

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import SyncLine from '../components/SyncLine';
import client, { API_BASE, downloadFile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAppShell } from '../layouts/AppLayout';
import { compareSizes } from '../utils/sizeOrder';
import useSyncStatus from '../utils/syncStatus';

import './Inventory.css';

// Product photos are files in the Laravel app's public/images/products/, which
// is also where POST /api/inventory/photo writes new uploads. The static pages
// were served by that same origin, so a bare "images/products/<file>" resolved
// against it; this SPA runs on its own origin — and on a split deployment a
// DIFFERENT origin from the API — so the media root is derived from API_BASE.
//
// Parsed with URL().origin rather than by stripping a suffix. The old
// `.replace(/\/api(\/stocks)?\/?$/, '')` assumed the API sat at exactly /api or
// /api/stocks, and broke twice as this module moved: first to /api/stocks, then to
// /api/storefront/stocks inside ash-ai-backend, where `storefront` sits between the
// two segments the pattern needed adjacent. Origin parsing is indifferent to the
// path, so it survives the next move too.
const MEDIA_ORIGIN = (() => {
  try {
    return new URL(API_BASE, window.location.origin).origin;
  } catch {
    return '';
  }
})();

const MEDIA_BASE = MEDIA_ORIGIN;

// Prefer the absolute `image_url` the API returns: the server stores the path and is
// the only side that knows where the media actually lives. The derived path stays as
// a fallback for rows that predate it, and the placeholder for rows with no photo.
// /storage/products/, not /images/products/ — Reefer_Backend keeps these on Laravel's
// public disk and has no public/images/ directory. Requesting the old path is worse
// than a 404: the catch-all route answers 200 with the SPA's HTML, so the image
// "loads" and then fails to decode, leaving a broken thumbnail and no failed request.
function imgUrl(row) {
  if (row && row.image_url) return row.image_url;
  return row && row.image
    ? MEDIA_BASE + '/storage/products/' + row.image
    : MEDIA_BASE + '/storage/products/_placeholder.jpg';
}

function stockClass(available) {
  if (available === 0) return 'stock-out';
  if (available <= 5) return 'stock-low';
  return 'stock-ok';
}

function totalStockClass(total) {
  if (total === 0) return 'out';
  if (total <= 6) return 'low';
  return 'ok';
}

// Size ordering comes from utils/sizeOrder (compareSizes) — shared with the
// Product Catalog and the Excel export so all three agree.

// Collapse the per-size SKU rows into one card per design, keyed by
// product_code (falls back to name if a legacy row has no code).
function groupProducts(rows) {
  const map = {};
  rows.forEach(function (r) {
    const key = r.product_code || r.name;
    if (!map[key]) {
      map[key] = {
        key: key,
        product_code: r.product_code || '',
        name: r.name,
        category: r.category,
        price: r.price,
        image: r.image,
        sizes: [],
        total: 0,
        priceVaries: false,
      };
    }
    map[key].sizes.push({
      sku: r.sku,
      size: r.size || '—',
      available: Number(r.available) || 0,
      price: Number(r.price) || 0,
    });
    map[key].total += Number(r.available) || 0;
  });
  const list = Object.keys(map).map(function (k) {
    return map[k];
  });
  list.forEach(function (p) {
    p.sizes.sort(function (a, b) {
      return compareSizes(a.size, b.size);
    });
    // Flag designs whose sizes aren't all the same price, so the UI can show a
    // "from ₱X" range instead of a single figure.
    const prices = p.sizes.map(function (s) {
      return s.price;
    });
    p.priceVaries = new Set(prices).size > 1;
    p.minPrice = Math.min.apply(null, prices);
  });
  return list;
}

function priceLabel(p) {
  if (p.priceVaries) return 'from ₱' + Number(p.minPrice).toLocaleString();
  return '₱' + Number(p.price).toLocaleString();
}

// Standard values for the four warehousing fields, mirroring FIELD_DEFAULTS in
// the API. The server already backfills these, so this is belt-and-braces for a
// row that somehow arrives blank — the grid should never render an empty box
// where a value is expected.
const GRID_DEFAULTS = {
  weight_g: 150,
  dimensions: '5.00*5.00*5.00',
  warehouse: 'Reefer QC',
  area: 'Storage 1',
};

function gridValue(row, field) {
  const value = row[field];
  if (value === null || value === undefined || value === '') return GRID_DEFAULTS[field] ?? '';
  if (field === 'weight_g' && !Number(value)) return GRID_DEFAULTS[field];
  return value;
}

// ---- Column help popovers -------------------------------------------------
// Bodies are fixed markup written here, never user input — <em class="hl">
// marks the phrase that carries the point.
const COLUMN_HELP = {
  onhand: {
    title: 'On Hand',
    body: (
      <ul>
        <li>
          Stock <em className="hl">physically in the warehouse</em>.
        </li>
        <li>
          Open the item to adjust it — a <em className="hl">reason is required</em> and logged.
        </li>
        <li>
          Set to <em className="hl">0</em> and the SKU goes inactive.
        </li>
      </ul>
    ),
  },
  allocated: {
    title: 'Order Allocated',
    body: (
      <ul>
        <li>
          Units <em className="hl">reserved for open orders</em>.
        </li>
        <li>
          <em className="hl">Not editable</em> — it comes from Orders.
        </li>
        <li>
          Cancel an order and the units <em className="hl">come back</em>.
        </li>
      </ul>
    ),
  },
  sellable: {
    title: 'Sellable',
    body: (
      <ul>
        <li>
          On Hand <em className="hl">minus</em> Order Allocated — what the shop can
          actually sell.
        </li>
        <li>
          Drops <em className="hl">the moment a customer checks out</em>, before
          anything leaves the shelf.
        </li>
        <li>
          <em className="hl">This is the number the storefront shows.</em> An
          inactive size is always 0 here.
        </li>
      </ul>
    ),
  },
};

// Human labels for the "Change" pill. Columns not listed here (available,
// price, active, marketplace, deleted) already read fine as-is.
const LOG_FIELD_LABELS = {
  location: 'shelf',
  warehouse: 'warehouse',
  area: 'area',
  weight_g: 'weight',
  dimensions: 'size (cm)',
  name: 'name',
  category: 'category',
  size: 'size',
  product_code: 'code',
};

const VALID_MARKETPLACES = ['TikTok', 'REEFER (Website)'];

function validMarketplace(m) {
  return VALID_MARKETPLACES.includes(m) ? m : '';
}

// The static pages read failures as `data.error || "<page fallback>"`. The API
// client already resolved `data.error`, filling in "Server responded with
// status N" when the body carried none — so the page's own fallback goes there
// instead, and a genuine server message still wins.
function errorText(err, fallback) {
  if (err && err.isNetworkError) return err.message;
  const apiError = err && err.data && typeof err.data === 'object' ? err.data.error : null;
  return apiError || fallback;
}

const EMPTY_PANEL = {
  name: '',
  category: '',
  price: '',
  available: '',
  weight: '',
  dimensions: '',
  warehouse: '',
  area: '',
  location: '',
};

const EMPTY_SINGLE = {
  product_code: '',
  sku: '',
  name: '',
  category: '',
  marketplace: '',
  available: '',
  price: '',
  location: '',
  size: '',
  weight: '',
  dimensions: '',
  warehouse: '',
  area: '',
};

const MUTED = '#64748b';
const RED = '#dc2626';
const GREEN = '#16a34a';
const AMBER = '#B26A00';

export default function Inventory() {
  const { user } = useAuth();
  const { setPanelOpen } = useAppShell();

  // ---- data -------------------------------------------------------------
  const [allInventory, setAllInventory] = useState([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [allLogs, setAllLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [logError, setLogError] = useState('');

  // Read inside native listeners and async handlers, where the closed-over
  // state would be a render behind.
  const inventoryRef = useRef(allInventory);
  useEffect(() => {
    inventoryRef.current = allInventory;
  }, [allInventory]);

  const currentUser = user && user.username ? user.username : 'unknown';

  // ---- view state -------------------------------------------------------
  const [view, setView] = useState('products'); // 'products' | 'log'
  const [currentSubview, setCurrentSubview] = useState('list'); // 'list' | 'grid'
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logField, setLogField] = useState('all');

  // ---- toast ------------------------------------------------------------
  const [toast, setToast] = useState(null); // { message, kind }
  const toastTimer = useRef(null);

  const showToast = useCallback((message, kind) => {
    setToast({ message: message, kind: kind || '' });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(function () {
      setToast(null);
    }, 3200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // ---- loading ----------------------------------------------------------
  // Status dot + "last synced" line instead of the old wide green banner, with
  // a red "Reconnecting…" dot and automatic retry if the feed drops. The retry
  // forwards through a ref because useSyncStatus() has to be declared before
  // loadInventory(), which needs sync.ok / sync.error.
  const loadInventoryRef = useRef(function () {});
  const retry = useCallback(() => {
    loadInventoryRef.current();
  }, []);
  const sync = useSyncStatus({ retry: retry });
  const { ok: syncOk, error: syncError } = sync;

  const loadInventory = useCallback(async () => {
    try {
      const response = await client.get('/inventory');
      const rows = Array.isArray(response.data) ? response.data : [];
      setAllInventory(rows);
      setInventoryLoaded(true);
      syncOk(rows.length + ' SKUs loaded');
    } catch (err) {
      syncError(err.message);
    }
  }, [syncOk, syncError]);

  useEffect(() => {
    loadInventoryRef.current = loadInventory;
  }, [loadInventory]);

  const loadLogs = useCallback(async () => {
    try {
      const response = await client.get('/inventory/logs');
      setAllLogs(Array.isArray(response.data) ? response.data : []);
      setLogsLoaded(true);
      setLogError('');
    } catch (err) {
      setLogError(err.message);
    }
  }, []);

  useEffect(() => {
    loadInventory();
    loadLogs();
  }, [loadInventory, loadLogs]);

  // ---- filters ----------------------------------------------------------
  // The category <select> was rebuilt from the rows on every load, keeping the
  // current selection when it survived; a selection that no longer exists fell
  // back to "All categories".
  const categories = useMemo(() => {
    return [
      ...new Set(
        allInventory.map(function (r) {
          return r.category;
        }),
      ),
    ].sort();
  }, [allInventory]);

  const activeCategory = categories.includes(categoryFilter) ? categoryFilter : 'all';

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let filtered = allInventory;

    if (term) {
      filtered = filtered.filter(function (r) {
        return (r.sku + r.name).toLowerCase().includes(term);
      });
    }

    if (activeCategory !== 'all') {
      filtered = filtered.filter(function (r) {
        return r.category === activeCategory;
      });
    }

    return filtered;
  }, [allInventory, searchTerm, activeCategory]);

  const groupedAll = useMemo(() => groupProducts(allInventory), [allInventory]);
  const products = useMemo(() => groupProducts(filteredRows), [filteredRows]);

  // Suggestions for the Product Code field — one entry per design (deduped).
  const productCodes = useMemo(() => {
    const seen = {};
    const list = [];
    allInventory.forEach(function (r) {
      const code = r.product_code;
      if (!code || seen[code]) return;
      seen[code] = true;
      list.push({ code: code, name: r.name || '' });
    });
    return list;
  }, [allInventory]);

  // ---- detail panel -----------------------------------------------------
  const [currentPanelSku, setCurrentPanelSku] = useState(null);
  const [panelForm, setPanelForm] = useState(EMPTY_PANEL);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState({ text: '', color: '' });
  const panelPhotoRef = useRef(null);

  const panelRow =
    allInventory.find(function (r) {
      return r.sku === currentPanelSku;
    }) || null;

  // Fills every panel field from a row. Used both when the panel first opens
  // and to refresh it in place after a save — including a save that failed and
  // has to put the typed values back to what is actually stored.
  const fillPanelFields = useCallback((row) => {
    setPanelForm({
      name: row.name == null ? '' : String(row.name),
      category: row.category || '',
      price: row.price == null ? '' : String(row.price),
      available: row.available == null ? '' : String(row.available),
      weight: String(gridValue(row, 'weight_g')),
      dimensions: String(gridValue(row, 'dimensions')),
      warehouse: String(gridValue(row, 'warehouse')),
      area: String(gridValue(row, 'area')),
      location: row.location || '',
    });
  }, []);

  const openDetailPanel = useCallback(
    (sku) => {
      const row = inventoryRef.current.find(function (r) {
        return r.sku === sku;
      });
      if (!row) return;

      setCurrentPanelSku(sku);
      setSaveStatus({ text: '', color: '' });
      fillPanelFields(row);
      // resetReasonFields()
      setReason('');
      setNotes('');
      setPanelOpen(true);
    },
    [fillPanelFields, setPanelOpen],
  );

  const closeDetailPanel = useCallback(() => {
    setCurrentPanelSku(null);
    setPanelOpen(false);
  }, [setPanelOpen]);

  // The reason block only appears once the quantity actually differs from
  // what's on file — no point asking why nothing changed.
  const reasonVisible =
    !!panelRow &&
    panelForm.available.trim() !== '' &&
    Number(panelForm.available) !== Number(panelRow.available);

  // Flattened SKU order matching what's currently on screen (respects active
  // search/category filters), so ▲▼ steps through exactly what the person is
  // looking at rather than the full unfiltered inventory.
  const skuSequence = useMemo(() => {
    // The List subview shows rows in the order the server sent them, one per
    // SKU. Grouping here would reorder sizes and make ▲▼ jump around the
    // screen, so the grid's sequence is just the rows as rendered.
    if (currentSubview === 'list') {
      return filteredRows.map(function (r) {
        return r.sku;
      });
    }
    const seq = [];
    products.forEach(function (p) {
      p.sizes.forEach(function (s) {
        seq.push(s.sku);
      });
    });
    return seq;
  }, [currentSubview, filteredRows, products]);

  const navIndex = skuSequence.indexOf(currentPanelSku);

  const navigatePanel = useCallback(
    (direction) => {
      const idx = skuSequence.indexOf(currentPanelSku);
      if (idx === -1) return;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= skuSequence.length) return;
      openDetailPanel(skuSequence[newIdx]);
    },
    [skuSequence, currentPanelSku, openDetailPanel],
  );

  // Arrow-key navigation while the panel is open — skipped while a text field
  // is focused (e.g. the quantity input) so native browser behavior like
  // number-spinner arrows still works as expected.
  useEffect(() => {
    function onKeyDown(e) {
      if (!currentPanelSku) return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigatePanel(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigatePanel(1);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [currentPanelSku, navigatePanel]);

  // ---- column help popover ----------------------------------------------
  const [help, setHelp] = useState(null); // { key, rect }
  const [helpPos, setHelpPos] = useState(null); // { anchor, left, top, arrowLeft }
  const helpPopRef = useRef(null);
  const helpPositioned = !!(help && helpPos && helpPos.anchor === help);

  const closeHelpPop = useCallback(() => setHelp(null), []);

  function toggleHelpPop(event, key) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setHelp(function (prev) {
      return prev && prev.key === key ? null : { key: key, rect: rect };
    });
  }

  // Measure first, then position — the popover has to be rendered to have real
  // dimensions to position against, which is why it goes out display:block but
  // visibility:hidden on the pass before this one.
  useLayoutEffect(() => {
    if (!help) {
      setHelpPos(null);
      return;
    }
    const pop = helpPopRef.current;
    if (!pop) return;

    const rect = help.rect;
    const width = pop.offsetWidth;
    // Centre on the "?" but keep the whole box on screen.
    let left = rect.left + window.scrollX + rect.width / 2 - width / 2;
    left = Math.max(
      10,
      Math.min(left, window.scrollX + document.documentElement.clientWidth - width - 10),
    );

    setHelpPos({
      anchor: help,
      left: left,
      top: rect.bottom + window.scrollY + 9,
      // Point the arrow back at the icon even when the box was nudged inward.
      arrowLeft: Math.max(
        10,
        Math.min(rect.left + window.scrollX + rect.width / 2 - left - 5, width - 20),
      ),
    });
  }, [help]);

  useEffect(() => {
    // Any click outside the popover (or the "?" buttons, which toggle it
    // themselves) dismisses it.
    function onDocClick(e) {
      const target = e.target;
      if (target && target.closest && (target.closest('.th-help') || target.closest('#help-pop'))) {
        return;
      }
      closeHelpPop();
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') closeHelpPop();
    }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', closeHelpPop);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', closeHelpPop);
    };
  }, [closeHelpPop]);

  // ---- photo replacement -------------------------------------------------
  // Uploads to the existing /inventory/photo endpoint, then attaches the stored
  // filename to the row with a normal field update.
  async function uploadPhotoForSku(sku, file) {
    const form = new FormData();
    form.append('photo', file);

    let uploadData;
    try {
      // The shared axios instance defaults to application/json, which would
      // make axios serialise the FormData as JSON and drop the file — the
      // multipart override tells it (and then the browser) to send the real
      // body with its boundary.
      const uploadRes = await client.post('/inventory/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      uploadData = uploadRes.data;
    } catch (err) {
      throw new Error(errorText(err, 'Upload failed.'));
    }

    try {
      const saveRes = await client.put('/inventory/' + encodeURIComponent(sku), {
        image: uploadData.image,
        user: currentUser,
      });
      return saveRes.data;
    } catch (err) {
      throw new Error(errorText(err, 'Could not attach the photo.'));
    }
  }

  function openPanelPhotoPicker() {
    if (!currentPanelSku) return;
    const picker = panelPhotoRef.current;
    if (!picker) return;
    picker.value = '';
    picker.click();
  }

  async function onPanelPhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    const sku = currentPanelSku;
    if (!file || !sku) return;

    showToast('Uploading photo...');

    try {
      const saved = await uploadPhotoForSku(sku, file);
      setAllInventory(function (prev) {
        return prev.map(function (r) {
          return r.sku === sku ? saved : r;
        });
      });
      if (currentPanelSku === sku) fillPanelFields(saved);
      showToast('Photo updated for ' + sku, 'ok');
    } catch (err) {
      showToast('Photo update failed: ' + err.message, 'err');
    }
  }

  // ---- saving the detail panel ------------------------------------------
  const [pendingAdjustment, setPendingAdjustment] = useState(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  // Saves the panel's non-quantity edits in one request, without the confirm
  // dialog — mirrors how a single grid cell saved on blur.
  async function savePanelFieldsDirect(sku, extraFields) {
    setSaveStatus({ text: 'Saving...', color: MUTED });

    try {
      const response = await client.put('/inventory/' + encodeURIComponent(sku), {
        ...extraFields,
        user: currentUser,
      });
      const data = response.data;

      setAllInventory(function (prev) {
        return prev.map(function (r) {
          return r.sku === sku ? data : r;
        });
      });
      if (currentPanelSku === sku) fillPanelFields(data);
      await loadLogs();

      setSaveStatus({ text: 'Saved.', color: GREEN });
    } catch (err) {
      // Put the panel back to what's actually stored — a failed save must not
      // leave an edited field sitting there looking committed.
      if (currentPanelSku === sku) {
        const row = inventoryRef.current.find(function (r) {
          return r.sku === sku;
        });
        if (row) fillPanelFields(row);
      }
      setSaveStatus({
        text: 'Save failed: ' + errorText(err, 'Server responded with status ' + err.status),
        color: RED,
      });
    }
  }

  // Step 1: validate, then show the confirmation dialog. Nothing is written yet.
  function requestSaveChanges() {
    const row = panelRow;
    if (!row) return;

    const name = panelForm.name.trim();
    if (!name) {
      setSaveStatus({ text: "Product name can't be empty.", color: RED });
      return;
    }

    const rawValue = panelForm.available;
    const newAvailable = Number(rawValue);
    const oldAvailable = Number(row.available);

    if (rawValue.trim() === '' || isNaN(newAvailable) || newAvailable < 0) {
      setSaveStatus({ text: 'Enter a valid quantity (0 or more).', color: RED });
      return;
    }
    const availableChanged = newAvailable !== oldAvailable;

    // Everything besides On Hand saves without a reason. Only fields that
    // actually differ from what's on file go in the payload, so re-saving an
    // untouched panel is a no-op.
    const extraFields = {};
    if (name !== row.name) extraFields.name = name;

    const category = panelForm.category.trim();
    if (category && category !== row.category) extraFields.category = category;

    const priceRaw = panelForm.price;
    if (priceRaw.trim() !== '' && Number(priceRaw) !== Number(row.price)) {
      extraFields.price = Number(priceRaw);
    }

    const weightRaw = panelForm.weight;
    const weightValue = Number(weightRaw) > 0 ? Number(weightRaw) : GRID_DEFAULTS.weight_g;
    if (weightValue !== Number(gridValue(row, 'weight_g'))) extraFields.weight_g = weightValue;

    const dimensions = panelForm.dimensions.trim() || GRID_DEFAULTS.dimensions;
    if (dimensions !== String(gridValue(row, 'dimensions'))) extraFields.dimensions = dimensions;

    const warehouse = panelForm.warehouse.trim() || GRID_DEFAULTS.warehouse;
    if (warehouse !== String(gridValue(row, 'warehouse'))) extraFields.warehouse = warehouse;

    const area = panelForm.area.trim() || GRID_DEFAULTS.area;
    if (area !== String(gridValue(row, 'area'))) extraFields.area = area;

    const location = panelForm.location.trim();
    if (location !== (row.location || '')) extraFields.location = location;

    const hasExtra = Object.keys(extraFields).length > 0;

    if (!availableChanged && !hasExtra) {
      setSaveStatus({ text: 'No changes to save.', color: MUTED });
      return;
    }

    // On Hand didn't move, so nothing here needs a reason — save right away
    // instead of opening the confirm dialog.
    if (!availableChanged) {
      savePanelFieldsDirect(row.sku, extraFields);
      return;
    }

    if (!reason) {
      setSaveStatus({ text: 'Select a reason for this adjustment.', color: RED });
      return;
    }
    if (reason === 'Other' && !notes.trim()) {
      setSaveStatus({ text: 'Specify the reason when choosing "Other".', color: RED });
      return;
    }

    setSaveStatus({ text: '', color: '' });
    setPendingAdjustment({
      sku: row.sku,
      name: name,
      oldAvailable: oldAvailable,
      newAvailable: newAvailable,
      reason: reason,
      notes: notes.trim(),
      extraFields: extraFields,
    });
  }

  function closeConfirmDialog() {
    setPendingAdjustment(null);
  }

  // Cancelling an adjustment has to put every edited panel field back to what's
  // on file — otherwise a field still shows the abandoned value even though
  // nothing was saved.
  function cancelConfirmDialog() {
    const adj = pendingAdjustment;
    closeConfirmDialog();
    if (adj && currentPanelSku === adj.sku && panelRow) {
      fillPanelFields(panelRow);
    }
  }

  // Step 2: actually commit the adjustment.
  //
  // Since Push Product: the On Hand change itself does NOT write to inventory
  // here. It queues in pending_product_edits (reason and notes riding along for
  // the audit log) and is applied by the 12:00 AM Asia/Manila batch — or a
  // Force Push from the Catalog's Push Product popup. Every other edited panel
  // field still saves live, exactly as before. Only this human path queues:
  // order reservations/releases, Excel imports and storefront syncs keep
  // writing stock directly.
  async function commitAdjustment() {
    if (!pendingAdjustment) return;

    const adj = pendingAdjustment;
    const username = currentUser;

    // Whatever the panel should snap back to afterwards: the live row, updated
    // in place if step 1 wrote anything.
    let latestRow =
      inventoryRef.current.find(function (r) {
        return r.sku === adj.sku;
      }) || null;

    setConfirmSaving(true);
    setSaveStatus({ text: 'Saving...', color: MUTED });

    try {
      // 1) Non-quantity fields: live write, same as always.
      if (adj.extraFields && Object.keys(adj.extraFields).length) {
        const response = await client.put('/inventory/' + adj.sku, {
          ...adj.extraFields,
          user: username,
        });
        const data = response.data;
        latestRow = data;
        setAllInventory(function (prev) {
          return prev.map(function (r) {
            return r.sku === adj.sku ? data : r;
          });
        });
      }

      // 2) The On Hand change: queue it in Push Product.
      const queueRes = await client.post('/inventory/pending-edits', {
        sku: adj.sku,
        field: 'available',
        new_value: adj.newAvailable,
        reason: adj.reason,
        notes: adj.notes,
        user: username,
      });
      const queued = queueRes.data;

      closeConfirmDialog();
      // resetReasonFields()
      setReason('');
      setNotes('');
      // On Hand snaps back to the LIVE value — the queued number lives in Push
      // Product until the push applies it.
      if (currentPanelSku === adj.sku && latestRow) fillPanelFields(latestRow);
      await loadLogs();

      setSaveStatus({
        text:
          queued.status === 'cleared'
            ? 'Pending stock edit cleared — the value matches what’s on file. Other fields saved.'
            : 'Stock change queued — applies at the 12:00 AM push, or Force Push it from Product Catalog → Push Product.',
        color: AMBER,
      });
    } catch (err) {
      closeConfirmDialog();
      // Roll back to stored values; a failed save must not leave the typed
      // number (or any other edited field) sitting there looking committed.
      if (currentPanelSku === adj.sku && latestRow) fillPanelFields(latestRow);
      setSaveStatus({
        text: 'Save failed: ' + errorText(err, 'Server responded with status ' + err.status),
        color: RED,
      });
    } finally {
      setConfirmSaving(false);
    }
  }

  async function deleteRow() {
    const sku = currentPanelSku;
    const confirmed = window.confirm('Delete ' + sku + ' permanently? This cannot be undone.');
    if (!confirmed) return;

    setSaveStatus({ text: 'Deleting...', color: MUTED });

    try {
      await client.delete('/inventory/' + sku, { data: { user: currentUser } });

      setAllInventory(function (prev) {
        return prev.filter(function (r) {
          return r.sku !== sku;
        });
      });
      closeDetailPanel();
      await loadLogs();
    } catch (err) {
      // The original ignored the body here and reported the bare status.
      setSaveStatus({
        text:
          'Delete failed: ' +
          (err.isNetworkError ? err.message : 'Server responded with status ' + err.status),
        color: RED,
      });
    }
  }

  // ---- Import Stock modal ------------------------------------------------
  const [importOpen, setImportOpen] = useState(false);
  const [importTab, setImportTab] = useState('xlsx');
  const [singleMode, setSingleModeState] = useState('add');
  const [singleForm, setSingleForm] = useState(EMPTY_SINGLE);
  const [singleStatus, setSingleStatus] = useState({ text: '', color: '' });
  const [singleSaving, setSingleSaving] = useState(false);
  const [singlePreview, setSinglePreview] = useState('');

  const singleModeRef = useRef(singleMode);
  useEffect(() => {
    singleModeRef.current = singleMode;
  }, [singleMode]);

  const skuInputRef = useRef(null);
  const codeInputRef = useRef(null);
  const singlePhotoRef = useRef(null);

  const clearSingleForm = useCallback(() => {
    setSingleForm(EMPTY_SINGLE);
    if (singlePhotoRef.current) singlePhotoRef.current.value = '';
    setSinglePreview('');
    setSingleStatus({ text: '', color: '' });
  }, []);

  const setSingleMode = useCallback(
    (mode) => {
      setSingleModeState(mode);
      clearSingleForm();
    },
    [clearSingleForm],
  );

  // ---- Excel (.xlsx) bulk update ----
  const [xlsxFile, setXlsxFile] = useState(null);
  const [xlsxDragover, setXlsxDragover] = useState(false);
  const [xlsxStatus, setXlsxStatus] = useState({ text: '', color: '' });
  const [xlsxResult, setXlsxResult] = useState(null); // { result, createMissing }
  const [xlsxRunning, setXlsxRunning] = useState(false);
  const [createMissing, setCreateMissing] = useState(false);
  const xlsxPickerRef = useRef(null);

  const clearXlsxForm = useCallback(() => {
    setXlsxFile(null);
    if (xlsxPickerRef.current) xlsxPickerRef.current.value = '';
    setXlsxDragover(false);
    setXlsxStatus({ text: '', color: '' });
    setXlsxResult(null);
    setCreateMissing(false);
  }, []);

  function openImportModal() {
    setImportOpen(true);
    setImportTab('xlsx');
    setSingleMode('add');
    clearSingleForm();
    clearXlsxForm();
  }

  function closeImportModal() {
    setImportOpen(false);
  }

  function chooseXlsxFile(file) {
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      setXlsxStatus({
        text: "That isn't an .xlsx file. Save your sheet as Excel Workbook (.xlsx) and try again.",
        color: RED,
      });
      return;
    }

    setXlsxFile(file);
    setXlsxStatus({ text: '', color: '' });
    setXlsxResult(null);
  }

  async function runXlsxImport() {
    if (!xlsxFile) return;

    const wantsCreate = createMissing;

    setXlsxRunning(true);
    setXlsxResult(null);
    setXlsxStatus({ text: 'Reading ' + xlsxFile.name + '...', color: MUTED });

    try {
      const form = new FormData();
      form.append('file', xlsxFile);
      form.append('user', currentUser);
      form.append('createMissing', wantsCreate ? '1' : '0');

      const response = await client.post('/inventory/import-xlsx', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;

      setXlsxResult({ result: result, createMissing: wantsCreate });

      const changed = result.created || result.updated;
      setXlsxStatus({
        color: changed ? GREEN : MUTED,
        text: changed
          ? 'Import complete — changes are in the Activity Log.'
          : 'Nothing to change; every row already matched what’s on file.',
      });

      await loadInventory();
      await loadLogs();
    } catch (err) {
      setXlsxStatus({
        text:
          'Import failed: ' + errorText(err, 'Server responded with status ' + err.status),
        color: RED,
      });
    } finally {
      setXlsxRunning(false);
    }
  }

  // When updating, selecting an existing SKU pre-fills the form with its
  // values. The DOM "change" event is what fires when a datalist option is
  // picked (React's onChange is the "input" event), so it is wired natively —
  // and reads the SKU off the event target so it can never lag a keystroke
  // behind.
  const prefillFromSku = useCallback((rawSku) => {
    if (singleModeRef.current !== 'update') return;
    const sku = String(rawSku || '').trim();
    const row = inventoryRef.current.find(function (r) {
      return String(r.sku) === sku;
    });
    if (!row) return;

    setSingleForm({
      product_code: row.product_code || '',
      sku: sku,
      name: row.name || '',
      category: row.category || '',
      marketplace: validMarketplace(row.marketplace),
      available: row.available != null ? String(row.available) : '',
      price: row.price != null ? String(row.price) : '',
      location: row.location || '',
      size: row.size || '',
      // The API always backfills these with standard values (150g,
      // 5.00*5.00*5.00, Reefer QC, Storage 1) — see FIELD_DEFAULTS — so
      // row.weight_g etc. are never blank here.
      weight: row.weight_g != null ? String(row.weight_g) : '',
      dimensions: row.dimensions || '',
      warehouse: row.warehouse || '',
      area: row.area || '',
    });
    setSinglePreview(row.image ? imgUrl(row) : '');
    setSingleStatus({ text: 'Loaded current values for ' + sku + '. Edit and save.', color: MUTED });
  }, []);

  // Adding a new size of an existing design: pick its Product Code and the
  // shared details (name/category/price/photo) prefill so variants stay grouped.
  const prefillFromCode = useCallback((rawCode) => {
    if (singleModeRef.current !== 'add') return;
    const code = String(rawCode || '').trim();
    if (!code) return;
    const sibling = inventoryRef.current.find(function (r) {
      return String(r.product_code) === code;
    });
    if (!sibling) return;

    setSingleForm(function (prev) {
      const next = { ...prev };
      if (!next.name) next.name = sibling.name || '';
      if (!next.category) next.category = sibling.category || '';
      if (!next.price) next.price = sibling.price != null ? String(sibling.price) : '';
      if (!next.marketplace) next.marketplace = validMarketplace(sibling.marketplace);
      // New sizes of the same design almost always share a box/warehouse —
      // inherit them too, same as name/category/price above.
      if (!next.weight && sibling.weight_g != null) next.weight = String(sibling.weight_g);
      if (!next.dimensions && sibling.dimensions) next.dimensions = sibling.dimensions;
      if (!next.warehouse && sibling.warehouse) next.warehouse = sibling.warehouse;
      if (!next.area && sibling.area) next.area = sibling.area;
      return next;
    });

    const chosenPhoto = singlePhotoRef.current && singlePhotoRef.current.files[0];
    if (sibling.image && !chosenPhoto) setSinglePreview(imgUrl(sibling));

    setSingleStatus({
      text:
        'Matches design ' +
        code +
        ' (' +
        (sibling.name || '') +
        '). Set the SKU, size and quantity for this variant.',
      color: MUTED,
    });
  }, []);

  useEffect(() => {
    const el = skuInputRef.current;
    if (!el) return undefined;
    function onChange(event) {
      prefillFromSku(event.target.value);
    }
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [prefillFromSku]);

  useEffect(() => {
    const el = codeInputRef.current;
    if (!el) return undefined;
    function onChange(event) {
      prefillFromCode(event.target.value);
    }
    el.addEventListener('change', onChange);
    return () => el.removeEventListener('change', onChange);
  }, [prefillFromCode]);

  function onSinglePhotoChange(e) {
    const file = e.target.files[0];
    setSinglePreview(file ? URL.createObjectURL(file) : '');
  }

  async function saveSingleProduct() {
    const sku = singleForm.sku.trim();
    const name = singleForm.name.trim();

    if (!sku || !name) {
      setSingleStatus({ text: 'SKU and product name are required.', color: RED });
      return;
    }

    setSingleSaving(true);
    setSingleStatus({ text: 'Saving...', color: MUTED });

    try {
      // Upload the photo first (if one was chosen) and attach its filename.
      let uploadedImage = null;
      const photoFile = singlePhotoRef.current && singlePhotoRef.current.files[0];
      if (photoFile) {
        setSingleStatus({ text: 'Uploading photo...', color: MUTED });
        const form = new FormData();
        form.append('photo', photoFile);
        let upData;
        try {
          const up = await client.post('/inventory/photo', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          upData = up.data;
        } catch (err) {
          throw new Error(errorText(err, 'Photo upload failed.'));
        }
        uploadedImage = upData.image;
        setSingleStatus({ text: 'Saving...', color: MUTED });
      }

      const available = Number(singleForm.available) || 0;
      const productCode = singleForm.product_code.trim();
      const payload = {
        sku: sku,
        name: name,
        category: singleForm.category.trim(),
        price: Number(singleForm.price) || 0,
        location: singleForm.location.trim(),
        size: singleForm.size.trim(),
        product_code: productCode,
        marketplace: singleForm.marketplace,
        available: available,
        // Blank/zero here just means "use the standard value" — the API
        // backfills weight_g/dimensions/warehouse/area itself (see
        // FIELD_DEFAULTS), so no client fallback needed.
        weight_g: Number(singleForm.weight) || 0,
        dimensions: singleForm.dimensions.trim(),
        warehouse: singleForm.warehouse.trim(),
        area: singleForm.area.trim(),
        user: currentUser,
      };
      if (uploadedImage) {
        payload.image = uploadedImage;
      } else if (singleMode === 'add' && productCode) {
        // New variant with no new photo: inherit the design's existing image.
        const sib = inventoryRef.current.find(function (r) {
          return String(r.product_code) === productCode && r.image;
        });
        if (sib) payload.image = sib.image;
      }

      try {
        if (singleMode === 'add') {
          await client.post('/inventory/product', payload);
        } else {
          // Updating quantity requires an audit reason on the backend.
          payload.reason = 'Stock correction';
          payload.notes = 'Updated via Import Stock';
          await client.put('/inventory/' + encodeURIComponent(sku), payload);
        }
      } catch (err) {
        throw new Error(errorText(err, 'Server responded with status ' + err.status));
      }

      setSingleStatus({
        color: GREEN,
        text:
          singleMode === 'add'
            ? 'Added ' +
              sku +
              ' — it starts Inactive so you can finish its price and product page first. Activate it from the Catalog when it’s ready. Next product?'
            : 'Updated ' + sku + '. Ready for the next product.',
      });

      await loadInventory();
      clearSingleForm();
      if (skuInputRef.current) skuInputRef.current.focus();
    } catch (err) {
      setSingleStatus({
        text: (singleMode === 'add' ? 'Add' : 'Update') + ' failed: ' + err.message,
        color: RED,
      });
    } finally {
      setSingleSaving(false);
    }
  }

  // ---- activity log ------------------------------------------------------
  const filteredLogs = useMemo(() => {
    const term = logSearch.trim().toLowerCase();
    let filtered = allLogs;

    if (logField !== 'all') {
      filtered = filtered.filter(function (l) {
        return l.field === logField;
      });
    }

    if (term) {
      filtered = filtered.filter(function (l) {
        return (l.sku + ' ' + l.product_name + ' ' + l.reason + ' ' + (l.notes || '') + ' ' + l.user)
          .toLowerCase()
          .includes(term);
      });
    }

    return filtered;
  }, [allLogs, logField, logSearch]);

  // Size for a logged SKU — looked up from current inventory, falling back to
  // parsing the SKU suffix (…UM/UL/UXL) if the SKU was since removed.
  function logSize(sku) {
    const item = allInventory.find(function (r) {
      return r.sku === sku;
    });
    if (item && item.size) return item.size;
    const m = String(sku || '').match(/U(2XL|3XL|XL|S|M|L)$/);
    return m ? m[1] : '';
  }

  // ---- view switching ----------------------------------------------------
  function switchView(next) {
    setView(next);
    if (next === 'log') closeDetailPanel();
  }

  function handleExport(e) {
    // The export link points at an erp.auth-protected endpoint; a plain <a>
    // carries no Authorization header, so intercept the navigation and download
    // with the Bearer token instead.
    e.preventDefault();
    downloadFile('/inventory/export', 'ash-inventory.xlsx');
  }

  // ---- derived labels ----------------------------------------------------
  const galleryCountLabel =
    currentSubview === 'list'
      ? filteredRows.length + ' of ' + allInventory.length + ' SKUs'
      : products.length + ' of ' + groupedAll.length + ' products';

  const galleryEmpty =
    currentSubview === 'list' ? filteredRows.length === 0 : products.length === 0;

  const logCountLabel = logError ? '' : filteredLogs.length + ' of ' + allLogs.length + ' entries';

  const helpBody = help ? COLUMN_HELP[help.key] : null;

  return (
    <>
      <h1>Inventory</h1>
      <p className="sub">
        Live stock levels. Every manual quantity adjustment requires a reason, queues in{' '}
        <strong>Push Product</strong> (goes live at the 12:00 AM push or a Force Push), and is
        recorded in the Activity Log when it applies. Order-driven stock movement stays immediate.
      </p>

      <SyncLine sync={sync} />

      <div className="toolbar">
        <div className="search-box">
          <span>🔍</span>
          <input
            id="search-input"
            placeholder="Search SKU or product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          id="category-filter"
          value={activeCategory}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={String(cat)} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <a
          id="export-btn"
          href="/api/inventory/export"
          className="btn btn-primary"
          onClick={handleExport}
        >
          Export to Excel
        </a>
        <button id="open-import-btn" className="btn btn-outline" onClick={openImportModal}>
          Import Stock
        </button>
      </div>

      <div className="tabs" id="view-tabs">
        <div
          className={'tab' + (view === 'products' ? ' active' : '')}
          onClick={() => switchView('products')}
        >
          Products
          <span className="count" id="product-count">
            {inventoryLoaded ? groupedAll.length : ''}
          </span>
        </div>
        <div className={'tab' + (view === 'log' ? ' active' : '')} onClick={() => switchView('log')}>
          Activity Log
          <span className="count" id="log-count">
            {logsLoaded ? allLogs.length : ''}
          </span>
        </div>
      </div>

      <div id="gallery-view" style={{ display: view === 'products' ? 'block' : 'none' }}>
        <div className="gallery-toolbar">
          <div className="count-label" id="gallery-count-label" style={{ margin: 0 }}>
            {galleryCountLabel}
          </div>
          <div className="subview-toggle" id="subview-toggle">
            <button
              className={'subview-btn' + (currentSubview === 'list' ? ' active' : '')}
              onClick={() => setCurrentSubview('list')}
            >
              ☰ List
            </button>
            <button
              className={'subview-btn' + (currentSubview === 'grid' ? ' active' : '')}
              onClick={() => setCurrentSubview('grid')}
            >
              ▦ Grid
            </button>
          </div>
        </div>

        {/* List subview: the read-only warehousing grid — one row per SKU,
            every field edited from the detail panel. */}
        <div id="gallery-list-wrap" style={{ display: currentSubview === 'list' ? 'block' : 'none' }}>
          <div className="grid-hint">
            This list is read-only. Click anywhere on an item&apos;s name/SKU to open its full
            detail panel and edit it there, or use <strong>Import Stock → Update Product</strong> to
            change weight, size, category, warehouse, area, or shelf.
          </div>

          <div className="table-scroll" onScroll={closeHelpPop}>
            <table className="stock-grid">
              <thead>
                <tr>
                  <th className="sg-img-col">Image</th>
                  <th>Item Name / SKU</th>
                  <th className="sg-num">Weight (g)</th>
                  <th>Size (cm)</th>
                  <th>Category</th>
                  <th>Warehouse</th>
                  <th>Area</th>
                  <th>Shelves</th>
                  <th className="sg-num">
                    <button
                      type="button"
                      className={'th-help' + (help && help.key === 'onhand' ? ' open' : '')}
                      aria-label="What is On Hand?"
                      onClick={(e) => toggleHelpPop(e, 'onhand')}
                    >
                      ?
                    </button>
                    On Hand
                  </th>
                  <th className="sg-num">
                    <button
                      type="button"
                      className={'th-help' + (help && help.key === 'allocated' ? ' open' : '')}
                      aria-label="What is Order Allocated?"
                      onClick={(e) => toggleHelpPop(e, 'allocated')}
                    >
                      ?
                    </button>
                    Order Allocated
                  </th>
                  <th className="sg-num">
                    <button
                      type="button"
                      className={'th-help' + (help && help.key === 'sellable' ? ' open' : '')}
                      aria-label="What is Sellable?"
                      onClick={(e) => toggleHelpPop(e, 'sellable')}
                    >
                      ?
                    </button>
                    Sellable
                  </th>
                </tr>
              </thead>
              <tbody id="inventory-body">
                {filteredRows.map((row) => {
                  const allocated = Number(row.order_allocated) || 0;
                  // Server-computed (InventoryData: on_hand - allocated, floored
                  // at 0, and 0 outright for an inactive size) so this column and
                  // the storefront can never disagree about the same row.
                  const sellable = Number(row.sellable) || 0;
                  return (
                    <tr className="data-row" key={row.sku}>
                      <td>
                        <div className="sg-thumb">
                          <img loading="lazy" src={imgUrl(row)} alt={row.name} />
                        </div>
                      </td>
                      {/* Name and SKU share one column, stacked; the whole cell
                          opens the detail panel — that's where every field here
                          is actually edited. */}
                      <td>
                        <div
                          className="sg-idcell"
                          title="Open detail panel"
                          onClick={() => openDetailPanel(row.sku)}
                        >
                          <span className="sg-name-text">{row.name}</span>
                          <span className="sg-sku">{row.sku}</span>
                        </div>
                      </td>
                      <td className="sg-num">{gridValue(row, 'weight_g')}</td>
                      <td>{gridValue(row, 'dimensions')}</td>
                      <td>{row.category}</td>
                      <td>{gridValue(row, 'warehouse')}</td>
                      <td>{gridValue(row, 'area')}</td>
                      {/* The `location` column has always held the shelf code. */}
                      <td>{row.location}</td>
                      <td className={'sg-num ' + stockClass(Number(row.available))}>
                        {Number(row.available)}
                      </td>
                      <td className="sg-num">
                        <span className={'sg-derived alloc' + (allocated ? '' : ' zero')}>
                          {allocated}
                        </span>
                      </td>
                      {/* The number that moves the moment a customer checks out.
                          On Hand deliberately does not — the goods are still on
                          the shelf until someone picks them — so without this
                          column an order looked like it had changed nothing. */}
                      <td className={'sg-num ' + stockClass(sellable)}>
                        <span className="sg-derived">{sellable}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className="gallery-grid"
          id="gallery-grid"
          style={{ display: currentSubview === 'grid' ? 'grid' : 'none' }}
        >
          {products.map((p) => (
            <div className="product-card" key={p.key}>
              <div className="thumb">
                <img loading="lazy" src={imgUrl(p)} alt={p.name} />
              </div>
              <div className="card-body">
                <div className="pc-eyebrow">
                  {p.product_code || '—'}
                  <span className="dot">·</span>
                  <span className="pc-cat">{p.category}</span>
                </div>
                <div className="pc-name">{p.name}</div>
                <div className="pc-priceline">
                  <span className="pc-price">{priceLabel(p)}</span>
                  <span className={'pc-total ' + totalStockClass(p.total)}>
                    {p.total} in stock
                  </span>
                </div>
                <div className="pc-sizes">
                  {p.sizes.map((s) => (
                    <div
                      className="pc-size-row"
                      key={s.sku}
                      onClick={() => openDetailPanel(s.sku)}
                    >
                      <span className="pc-size-badge">{s.size}</span>
                      <span className="pc-size-sku">{s.sku}</span>
                      <span className="pc-size-price">
                        {'₱' + Number(s.price).toLocaleString()}
                      </span>
                      <span className={'pc-size-qty ' + stockClass(s.available)}>
                        {s.available === 0
                          ? 'Out of stock'
                          : s.available + (s.available === 1 ? ' pc' : ' pcs')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          id="gallery-empty"
          className="empty-state"
          style={{ display: galleryEmpty ? 'block' : 'none', marginTop: '12px' }}
        >
          No products match your filters.
        </div>
      </div>

      <div id="log-view" style={{ display: view === 'log' ? 'block' : 'none' }}>
        <div className="toolbar" style={{ marginBottom: '4px' }}>
          <div className="search-box">
            <span>🔍</span>
            <input
              id="log-search-input"
              placeholder="Search SKU, product, reason, or user..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
            />
          </div>
          <select
            id="log-field-filter"
            value={logField}
            onChange={(e) => setLogField(e.target.value)}
          >
            <option value="all">All changes</option>
            <option value="available">Quantity</option>
            <option value="price">Price</option>
            <option value="active">Status</option>
            <option value="marketplace">Marketplace</option>
            <option value="location">Shelf</option>
            <option value="warehouse">Warehouse</option>
            <option value="area">Area</option>
            <option value="weight_g">Weight</option>
            <option value="dimensions">Size (cm)</option>
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="size">Size</option>
            <option value="product_code">Product code</option>
            <option value="deleted">Deletions</option>
          </select>
        </div>

        <div className="count-label" id="log-count-label">
          {logCountLabel}
        </div>

        <div className="table-scroll" onScroll={closeHelpPop}>
          <table>
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Change</th>
                <th>Value</th>
                <th>Reason</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody id="log-body">
              {logError ? (
                <tr>
                  <td colSpan="7" style={{ color: 'var(--red)' }}>
                    Could not load activity log: {logError}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const delta = Number(log.delta) || 0;
                  const isPrice = log.field === 'price';
                  const showDelta =
                    log.field === 'available' || log.field === 'price' || log.field === 'deleted';
                  const deltaColor =
                    delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--muted)';
                  const money = isPrice ? '₱' : '';
                  const size = logSize(log.sku);

                  return (
                    <tr key={log.id}>
                      <td className="log-ts">{String(log.timestamp).replace('T', ' ')}</td>
                      <td>{log.sku}</td>
                      <td>
                        {log.product_name}
                        {size ? (
                          <>
                            {' '}
                            <span className="list-size-badge">{size}</span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <span className={'log-field-pill log-' + log.field}>
                          {LOG_FIELD_LABELS[log.field] || log.field}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--muted-dark)' }}>
                          {money}
                          {log.old_value}
                        </span>
                        <span style={{ color: 'var(--muted)', margin: '0 5px' }}>{'→'}</span>
                        <strong>
                          {money}
                          {log.new_value}
                        </strong>
                        {showDelta ? (
                          <>
                            {' '}
                            <span className="log-delta" style={{ color: deltaColor }}>
                              {'(' + (delta > 0 ? '+' : '') + delta + ')'}
                            </span>
                          </>
                        ) : null}
                      </td>
                      <td>
                        {log.reason || '—'}
                        {log.notes ? (
                          <div
                            style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}
                          >
                            {log.notes}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="pill-muted">{log.user}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div
          id="log-empty"
          className="empty-state"
          style={{
            display: !logError && filteredLogs.length === 0 ? 'block' : 'none',
            marginTop: '12px',
          }}
        >
          {allLogs.length === 0
            ? 'No inventory activity recorded yet.'
            : 'No entries match your filters.'}
        </div>
      </div>

      {/* ---- detail panel ---------------------------------------------- */}
      <div className={'detail-panel' + (currentPanelSku ? ' open' : '')} id="detail-panel">
        <div className="panel-header-row">
          <div className="panel-nav">
            <button
              className="panel-nav-btn"
              id="panel-nav-up"
              title="Previous (↑)"
              disabled={navIndex <= 0}
              onClick={() => navigatePanel(-1)}
            >
              ▲
            </button>
            <span className="panel-nav-pos" id="panel-nav-pos">
              {navIndex === -1 ? '' : navIndex + 1 + ' of ' + skuSequence.length}
            </span>
            <button
              className="panel-nav-btn"
              id="panel-nav-down"
              title="Next (↓)"
              disabled={navIndex === -1 || navIndex >= skuSequence.length - 1}
              onClick={() => navigatePanel(1)}
            >
              ▼
            </button>
          </div>
          <button className="close-btn" id="close-panel-btn" onClick={closeDetailPanel}>
            ✕
          </button>
        </div>
        <div
          className="panel-thumb"
          id="panel-thumb"
          title="Click to replace this photo"
          onClick={openPanelPhotoPicker}
        >
          <img
            id="panel-thumb-img"
            src={panelRow ? imgUrl(panelRow) : undefined}
            alt={panelRow ? panelRow.name : ''}
          />
        </div>
        <input
          type="file"
          id="panel-photo-input"
          accept="image/*"
          style={{ display: 'none' }}
          ref={panelPhotoRef}
          onChange={onPanelPhotoChange}
        />

        <div className="sku-code" id="panel-sku">
          {panelRow ? panelRow.sku : ''}
        </div>

        <div className="pf-name-row">
          <input
            id="panel-name-input"
            className="pf-name-input"
            placeholder="Product name"
            value={panelForm.name}
            onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })}
          />
          <span
            className="panel-size-badge"
            id="panel-size-badge"
            style={{ display: panelRow && panelRow.size ? 'inline-block' : 'none' }}
          >
            {panelRow && panelRow.size ? panelRow.size : ''}
          </span>
        </div>

        <div className="pf-grid-2">
          <div className="pf-field">
            <label>Category</label>
            <input
              id="panel-category-input"
              className="pf-input"
              list="panel-category-list"
              value={panelForm.category}
              onChange={(e) => setPanelForm({ ...panelForm, category: e.target.value })}
            />
            {/* Autocomplete suggestions reuse whatever categories already exist
                rather than a hardcoded list. */}
            <datalist id="panel-category-list">
              {categories.map((cat) => (
                <option key={String(cat)} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="pf-field">
            <label>Price (₱)</label>
            <input
              id="panel-price-input"
              className="pf-input"
              type="number"
              min="0"
              step="0.01"
              value={panelForm.price}
              onChange={(e) => setPanelForm({ ...panelForm, price: e.target.value })}
            />
          </div>
        </div>

        <div className="stat-row">
          <div className="stat-box">
            <div className="stat-label">On Hand</div>
            <input
              type="number"
              className="stat-value stat-input"
              id="panel-available-input"
              min="0"
              value={panelForm.available}
              onChange={(e) => setPanelForm({ ...panelForm, available: e.target.value })}
            />
          </div>
          <div className="stat-box">
            <div className="stat-label">Order Allocated</div>
            <div className="stat-value" id="panel-allocated" style={{ color: 'var(--navy)' }}>
              {panelRow ? Number(panelRow.order_allocated) || 0 : ''}
            </div>
          </div>
        </div>

        <div id="reason-block" style={{ display: reasonVisible ? 'block' : 'none' }}>
          <div className="reason-label">
            Reason for adjustment <span style={{ color: 'var(--red)' }}>*</span>
          </div>
          <select
            id="reason-select"
            className="reason-select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Select a reason...</option>
            <option value="New stock received">New stock received</option>
            <option value="Stock correction">Stock correction</option>
            <option value="Other">Other</option>
          </select>

          <div id="notes-block" style={{ display: reason === 'Other' ? 'block' : 'none' }}>
            <div className="reason-label">
              Specify reason <span style={{ color: 'var(--red)' }}>*</span>
            </div>
            <textarea
              id="reason-notes"
              className="reason-notes"
              placeholder="Describe why this quantity is being changed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="pf-section-label">Warehousing</div>
        <div className="pf-grid-2">
          <div className="pf-field">
            <label>Weight (g)</label>
            <input
              id="panel-weight-input"
              className="pf-input"
              type="number"
              min="0"
              step="0.01"
              value={panelForm.weight}
              onChange={(e) => setPanelForm({ ...panelForm, weight: e.target.value })}
            />
          </div>
          <div className="pf-field">
            <label>Size (cm)</label>
            <input
              id="panel-dimensions-input"
              className="pf-input"
              placeholder="5.00*5.00*5.00"
              value={panelForm.dimensions}
              onChange={(e) => setPanelForm({ ...panelForm, dimensions: e.target.value })}
            />
          </div>
        </div>
        <div className="pf-grid-3">
          <div className="pf-field">
            <label>Warehouse</label>
            <input
              id="panel-warehouse-input"
              className="pf-input"
              value={panelForm.warehouse}
              onChange={(e) => setPanelForm({ ...panelForm, warehouse: e.target.value })}
            />
          </div>
          <div className="pf-field">
            <label>Area</label>
            <input
              id="panel-area-input"
              className="pf-input"
              value={panelForm.area}
              onChange={(e) => setPanelForm({ ...panelForm, area: e.target.value })}
            />
          </div>
          <div className="pf-field">
            <label>Shelf</label>
            <input
              id="panel-location-input"
              className="pf-input"
              placeholder="A01"
              value={panelForm.location}
              onChange={(e) => setPanelForm({ ...panelForm, location: e.target.value })}
            />
          </div>
        </div>

        <button
          id="save-btn"
          className="btn btn-primary btn-block"
          style={{ marginTop: '16px' }}
          onClick={requestSaveChanges}
        >
          Save Changes
        </button>
        <button
          id="delete-btn"
          className="btn btn-outline-danger btn-block"
          style={{ marginTop: '8px' }}
          onClick={deleteRow}
        >
          Delete SKU
        </button>
        <div id="save-status" style={{ fontSize: '11.5px', marginTop: '8px', color: saveStatus.color }}>
          {saveStatus.text}
        </div>
        <div className="pf-hint">
          Changing <strong>On Hand</strong> asks for a reason and is{' '}
          <strong>queued in Push Product</strong> (applies at the 12:00 AM push, or Force Push from
          Product Catalog). Every other field saves live when you press{' '}
          <strong>Save Changes</strong>.
        </div>
      </div>

      <div
        id="help-pop"
        ref={helpPopRef}
        style={{
          display: help ? 'block' : 'none',
          visibility: helpPositioned ? 'visible' : 'hidden',
          left: helpPositioned ? helpPos.left + 'px' : undefined,
          top: helpPositioned ? helpPos.top + 'px' : undefined,
        }}
      >
        <div
          className="help-arrow"
          style={{ left: helpPositioned ? helpPos.arrowLeft + 'px' : undefined }}
        />
        <div className="help-title">{helpBody ? helpBody.title : ''}</div>
        <div className="help-body">{helpBody ? helpBody.body : null}</div>
      </div>

      <div
        id="grid-toast"
        className={toast ? toast.kind : ''}
        style={{ display: toast ? 'block' : 'none' }}
      >
        {toast ? toast.message : ''}
      </div>

      {/* ---- confirm inventory adjustment ------------------------------- */}
      <div
        id="confirm-overlay"
        className="modal-overlay"
        style={{ display: pendingAdjustment ? 'flex' : 'none' }}
      >
        <div className="confirm-box">
          <div className="confirm-title">Confirm inventory adjustment</div>
          <div className="confirm-desc">
            The stock change is <strong>queued in Push Product</strong> and applies at the 12:00 AM
            push (or a Force Push from Product Catalog). Any other edited fields save immediately.
          </div>

          <div id="confirm-product" style={{ fontSize: '13px', fontWeight: 700, marginTop: '14px' }}>
            {pendingAdjustment ? pendingAdjustment.sku + ' — ' + pendingAdjustment.name : ''}
          </div>

          <div className="diff-row">
            <div>
              <span className="diff-old" id="confirm-old">
                {pendingAdjustment ? pendingAdjustment.oldAvailable + ' units' : ''}
              </span>
              <span className="diff-arrow">→</span>
              <span className="diff-new" id="confirm-new">
                {pendingAdjustment ? pendingAdjustment.newAvailable + ' units' : ''}
              </span>
            </div>
            {pendingAdjustment ? (
              <ConfirmDelta
                delta={pendingAdjustment.newAvailable - pendingAdjustment.oldAvailable}
              />
            ) : (
              <span className="diff-delta" id="confirm-delta" />
            )}
          </div>

          <div className="confirm-meta" id="confirm-meta">
            {pendingAdjustment ? (
              <ConfirmMeta adj={pendingAdjustment} username={currentUser} />
            ) : null}
          </div>
          <div
            id="confirm-warning"
            style={{
              display: pendingAdjustment && pendingAdjustment.newAvailable === 0 ? 'block' : 'none',
              fontSize: '12px',
              marginTop: '10px',
              padding: '9px 11px',
              borderRadius: '8px',
              background: 'var(--orange-bg)',
              border: '1px solid var(--orange-border)',
              color: 'var(--orange-text)',
            }}
          >
            Setting stock to 0 will also mark this product Inactive on TikTok when the push applies.
          </div>

          <div className="modal-actions">
            <button
              id="confirm-save-btn"
              className="btn btn-primary btn-flex"
              disabled={confirmSaving}
              onClick={commitAdjustment}
            >
              Confirm &amp; Queue
            </button>
            <button
              id="confirm-cancel-btn"
              className="btn btn-outline btn-flex"
              onClick={cancelConfirmDialog}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* ---- Import Stock ---------------------------------------------- */}
      <div
        id="import-overlay"
        className="modal-overlay"
        style={{ display: importOpen ? 'flex' : 'none' }}
      >
        <div className="modal-box" style={{ width: '620px' }}>
          <div className="modal-title">Import Stock</div>

          <div className="imp-tabs">
            <button
              type="button"
              className={'imp-tab' + (importTab === 'xlsx' ? ' active' : '')}
              onClick={() => setImportTab('xlsx')}
            >
              Excel File
            </button>
            <button
              type="button"
              className={'imp-tab' + (importTab === 'single' ? ' active' : '')}
              onClick={() => setImportTab('single')}
            >
              Single Product
            </button>
          </div>

          {/* Excel (.xlsx) bulk update, using the styled template layout */}
          <div
            className={'imp-panel' + (importTab === 'xlsx' ? ' active' : '')}
            id="imp-panel-xlsx"
          >
            <div className="modal-desc">
              Download your current stock, edit the file, then drop it back below.
              <br />
              <br />
              Rows are matched by <strong>SKU</strong> — leave a cell blank to keep its current
              value, and don&apos;t change the SKU of an existing product.
              <br />
              To add a <strong>new product</strong>, type it on an empty row at the bottom with a
              new SKU, then tick the box below.
              <br />
              <br />
              <span style={{ color: 'var(--muted-dark)' }}>
                Adding or editing just one product? Use the{' '}
                <a
                  href="#"
                  id="goto-single-tab"
                  style={{ color: 'var(--navy)', fontWeight: 700 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setImportTab('single');
                  }}
                >
                  Single Product
                </a>{' '}
                tab instead.
              </span>
            </div>

            <a
              href="/api/inventory/export"
              className="btn btn-outline"
              style={{ display: 'inline-block', marginTop: '12px', textDecoration: 'none' }}
              onClick={handleExport}
            >
              ⬇ Download current stock
            </a>

            <div
              className={
                'imp-drop' + (xlsxFile ? ' has-file' : '') + (xlsxDragover ? ' dragover' : '')
              }
              id="xlsx-drop"
              onClick={() => xlsxPickerRef.current && xlsxPickerRef.current.click()}
              // Without preventDefault on dragover the browser just navigates to
              // the dropped file instead of handing it to us.
              onDragEnter={(e) => {
                e.preventDefault();
                setXlsxDragover(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setXlsxDragover(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setXlsxDragover(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setXlsxDragover(false);
                chooseXlsxFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                id="xlsx-file"
                accept=".xlsx"
                style={{ display: 'none' }}
                ref={xlsxPickerRef}
                onChange={(e) => chooseXlsxFile(e.target.files && e.target.files[0])}
              />
              <div className="imp-drop-icon">📄</div>
              <div className="imp-drop-main" id="xlsx-drop-main">
                {xlsxFile
                  ? xlsxFile.name + ' · ' + Math.max(1, Math.round(xlsxFile.size / 1024)) + ' KB'
                  : 'Drop an .xlsx file here, or click to browse'}
              </div>
              <div className="imp-drop-sub">Excel Workbook (.xlsx) · max 8&nbsp;MB</div>
            </div>

            <label className="imp-check">
              <input
                type="checkbox"
                id="xlsx-create-missing"
                checked={createMissing}
                onChange={(e) => setCreateMissing(e.target.checked)}
              />
              Also create new SKUs found in this file{' '}
              <span className="imp-check-sub">
                (needs at least a Product Name — everything else falls back to standard values)
              </span>
            </label>

            <div id="xlsx-status" style={{ fontSize: '12px', marginTop: '10px', color: xlsxStatus.color }}>
              {xlsxStatus.text}
            </div>
            <div
              id="xlsx-result"
              className="imp-result"
              style={{ display: xlsxResult ? 'block' : 'none' }}
            >
              {xlsxResult ? (
                <XlsxResult result={xlsxResult.result} createMissing={xlsxResult.createMissing} />
              ) : null}
            </div>

            <div className="modal-actions">
              <button
                id="run-xlsx-btn"
                className="btn btn-primary btn-flex"
                disabled={xlsxRunning || !xlsxFile}
                onClick={runXlsxImport}
              >
                Upload &amp; Update
              </button>
              <button
                id="cancel-xlsx-btn"
                className="btn btn-outline btn-flex"
                onClick={closeImportModal}
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Single product: add or update, one at a time */}
          <div
            className={'imp-panel' + (importTab === 'single' ? ' active' : '')}
            id="imp-panel-single"
          >
            <div className="imp-mode">
              <button
                type="button"
                className={'imp-mode-btn' + (singleMode === 'add' ? ' active' : '')}
                onClick={() => setSingleMode('add')}
              >
                Add Product
              </button>
              <button
                type="button"
                className={'imp-mode-btn' + (singleMode === 'update' ? ' active' : '')}
                onClick={() => setSingleMode('update')}
              >
                Update Product
              </button>
            </div>

            <div className="imp-form-grid">
              <div className="imp-field">
                <label>Product Code</label>
                <input
                  id="sp-product-code"
                  list="sp-code-list"
                  placeholder="R001"
                  autoComplete="off"
                  ref={codeInputRef}
                  value={singleForm.product_code}
                  onChange={(e) => setSingleForm({ ...singleForm, product_code: e.target.value })}
                />
                <datalist id="sp-code-list">
                  {productCodes.map((entry) => (
                    <option key={entry.code} value={entry.code} label={entry.name} />
                  ))}
                </datalist>
              </div>
              <div className="imp-field">
                <label id="sp-sku-label">
                  {singleMode === 'update' ? 'SKU to update ' : 'SKU '}
                  <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  id="sp-sku"
                  list={singleMode === 'update' ? 'sp-sku-list' : undefined}
                  placeholder={singleMode === 'update' ? 'Search existing SKU...' : 'R400XX'}
                  autoComplete="off"
                  ref={skuInputRef}
                  value={singleForm.sku}
                  onChange={(e) => setSingleForm({ ...singleForm, sku: e.target.value })}
                />
                <datalist id="sp-sku-list">
                  {allInventory.map((r) => (
                    <option key={r.sku} value={r.sku} label={r.name || ''} />
                  ))}
                </datalist>
              </div>
              <div className="imp-field">
                <label>
                  Product name <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  id="sp-name"
                  placeholder="Midnight Boxy"
                  value={singleForm.name}
                  onChange={(e) => setSingleForm({ ...singleForm, name: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Category</label>
                <input
                  id="sp-category"
                  placeholder="Boxy Tee"
                  value={singleForm.category}
                  onChange={(e) => setSingleForm({ ...singleForm, category: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Marketplace</label>
                <select
                  id="sp-marketplace"
                  value={singleForm.marketplace}
                  onChange={(e) => setSingleForm({ ...singleForm, marketplace: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="TikTok">TikTok</option>
                  <option value="REEFER (Website)">REEFER (Website)</option>
                </select>
              </div>
              <div className="imp-field">
                <label>Available</label>
                <input
                  id="sp-available"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={singleForm.available}
                  onChange={(e) => setSingleForm({ ...singleForm, available: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Price (₱)</label>
                <input
                  id="sp-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={singleForm.price}
                  onChange={(e) => setSingleForm({ ...singleForm, price: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Location (Shelf)</label>
                <input
                  id="sp-location"
                  placeholder="B10"
                  value={singleForm.location}
                  onChange={(e) => setSingleForm({ ...singleForm, location: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Size</label>
                <input
                  id="sp-size"
                  placeholder="M"
                  value={singleForm.size}
                  onChange={(e) => setSingleForm({ ...singleForm, size: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Weight (g)</label>
                <input
                  id="sp-weight"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="150"
                  value={singleForm.weight}
                  onChange={(e) => setSingleForm({ ...singleForm, weight: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Size (cm)</label>
                <input
                  id="sp-dimensions"
                  placeholder="5.00*5.00*5.00"
                  value={singleForm.dimensions}
                  onChange={(e) => setSingleForm({ ...singleForm, dimensions: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Warehouse</label>
                <input
                  id="sp-warehouse"
                  placeholder="Reefer QC"
                  value={singleForm.warehouse}
                  onChange={(e) => setSingleForm({ ...singleForm, warehouse: e.target.value })}
                />
              </div>
              <div className="imp-field">
                <label>Area</label>
                <input
                  id="sp-area"
                  placeholder="Storage 1"
                  value={singleForm.area}
                  onChange={(e) => setSingleForm({ ...singleForm, area: e.target.value })}
                />
              </div>
              <div className="imp-field full">
                <label>Photo</label>
                <div className="imp-photo-row">
                  <div className="imp-photo-thumb">
                    <img id="sp-photo-preview" src={singlePreview || undefined} alt="" />
                  </div>
                  <input
                    id="sp-photo"
                    type="file"
                    accept="image/*"
                    style={{ fontSize: '12.5px' }}
                    ref={singlePhotoRef}
                    onChange={onSinglePhotoChange}
                  />
                </div>
              </div>
            </div>

            <div id="sp-status" style={{ fontSize: '12px', marginTop: '12px', color: singleStatus.color }}>
              {singleStatus.text}
            </div>
            <div className="modal-actions">
              <button
                id="sp-save-btn"
                className="btn btn-primary btn-flex"
                disabled={singleSaving}
                onClick={saveSingleProduct}
              >
                {singleMode === 'update' ? 'Update & Next' : 'Save & Next'}
              </button>
              <button
                id="sp-done-btn"
                className="btn btn-outline btn-flex"
                onClick={closeImportModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ConfirmDelta({ delta }) {
  return (
    <span
      className={'diff-delta ' + (delta > 0 ? 'delta-up' : 'delta-down')}
      id="confirm-delta"
    >
      {(delta > 0 ? '+' : '') + delta}
    </span>
  );
}

// The panel bundles any other edited fields into this same save, since asking
// for a second confirmation just to change the category would be annoying —
// this block is the only place that combination is visible.
const CONFIRM_FIELD_LABELS = {
  name: 'Name',
  category: 'Category',
  price: 'Price',
  weight_g: 'Weight',
  dimensions: 'Size (cm)',
  warehouse: 'Warehouse',
  area: 'Area',
  location: 'Shelf',
};

function ConfirmMeta({ adj, username }) {
  const extraNames =
    adj.extraFields && Object.keys(adj.extraFields).length
      ? Object.keys(adj.extraFields).map(function (f) {
          return CONFIRM_FIELD_LABELS[f] || f;
        })
      : null;

  return (
    <>
      <strong>Reason:</strong> {adj.reason}
      {adj.notes ? (
        <>
          <br />
          <strong>Notes:</strong> {adj.notes}
        </>
      ) : null}
      <br />
      {extraNames ? (
        <>
          <br />
          <strong>Also saving:</strong> {extraNames.join(', ')}
        </>
      ) : null}
      <br />
      <strong>Recorded by:</strong> {username}
      <br />
      <strong>Applies:</strong> at the 12:00 AM push — or Force Push from Product Catalog → Push
      Product
    </>
  );
}

function XlsxResult({ result, createMissing }) {
  return (
    <>
      <div className="r-line">
        <span>Rows read from &ldquo;{result.sheetName}&rdquo;</span>
        <strong>{result.rowsRead}</strong>
      </div>
      {createMissing ? (
        <>
          <div className="r-line">
            <span>Products created</span>
            <strong>{result.created}</strong>
          </div>
          {result.created ? (
            <div className="r-warn">
              New SKUs start <strong>Inactive</strong> — finish their price and product page in the
              Catalog, then activate them (queues in Push Product).
            </div>
          ) : null}
        </>
      ) : null}
      <div className="r-line">
        <span>Products updated</span>
        <strong>{result.updated}</strong>
      </div>
      <div className="r-line">
        <span>Field changes written</span>
        <strong>{result.fieldChanges}</strong>
      </div>
      {result.unchanged ? (
        <div className="r-line">
          <span>Already up to date</span>
          <strong>{result.unchanged}</strong>
        </div>
      ) : null}
      {result.notFound && result.notFound.length ? (
        <div className="r-warn">
          <strong>Skipped &mdash; SKU not in Inventory:</strong>{' '}
          {result.notFound.slice(0, 12).join(', ')}
          {result.notFound.length > 12 ? ' and ' + (result.notFound.length - 12) + ' more' : ''}.
          <br />
          Check &ldquo;Also create new SKUs&rdquo; to add these instead, or use the Single Product
          tab.
        </div>
      ) : null}
      {result.missingName && result.missingName.length ? (
        <div className="r-warn">
          <strong>Skipped &mdash; new SKU with no Product Name:</strong>{' '}
          {result.missingName.slice(0, 12).join(', ')}
          {result.missingName.length > 12
            ? ' and ' + (result.missingName.length - 12) + ' more'
            : ''}
          .
          <br />
          Add a name in the sheet and re-upload, or create it under the Single Product tab.
        </div>
      ) : null}
    </>
  );
}

// Port of public/catalog.html — the Product Catalog.
//
// Everything the static page did is here: the KPI row, the List/Grid subviews,
// the inline price editor, the Active/Inactive toggle, the right-hand detail
// panel with ▲▼ navigation, the Activity Log tab, the Website View (storefront
// preview + content editor with photo upload) and the Push Product queue.
//
// What changed, and only this:
//   * the sidebar is gone — src/layouts/AppLayout.jsx renders it.
//   * `authFetch(API_BASE + …)` → src/api/client.js (axios, Bearer token in an
//     interceptor). Error text still comes from the API's `{ "error": … }`.
//   * `getSession()` → useAuth(); `initSyncStatus()` → useSyncStatus/<SyncLine>;
//     `compareSizes()` → src/utils/sizeOrder.js.
//   * escapeHtml() has no port: every value below is interpolated as JSX text,
//     which escapes it.
//   * document.getElementById / innerHTML / classList are replaced by state.
//     The page's own <style> block is Catalog.css, imported here, and every
//     class name is unchanged.
//
// The `.main.panel-open` class the detail panel needs belongs to AppLayout now,
// so it is toggled through useAppShell() instead of querySelector(".main").

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import SyncLine from '../components/SyncLine';
import client, { API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAppShell } from '../layouts/AppLayout';
import { compareSizes } from '../utils/sizeOrder';
import useSyncStatus from '../utils/syncStatus';
import './Catalog.css';

// Product photos are files in the Laravel app's public/images/products/, which
// is also where POST /api/inventory/photo writes the uploads the Website View
// makes. The static pages were served by that same origin, so a bare
// "images/products/<file>" resolved against it; this SPA runs on its own
// origin, so the media root is derived from VITE_API_URL by dropping the
// trailing "/api". A relative VITE_API_URL (e.g. "/api") collapses to "", i.e.
// this app's own origin. Same derivation as src/pages/Inventory.jsx — the two
// pages show the same photos and must not disagree about where they live.
// Derivation kept only as a FALLBACK. It strips a trailing "/api", which no longer
// matches: since this module moved inside the storefront SPA the base is
// ".../api/stocks", so the replace was a no-op and every photo requested
// /api/stocks/images/products/<file> — a 404, rendered as a broken thumbnail.
//
// The rows now carry `image_url`, an absolute URL the backend builds from the
// product's stored path. Preferring it means the server owns where media lives,
// which is the only place that can know.
// /storage/products/, not /images/products/.
//
// The standalone app served photos from its own public/images/products/. In
// Reefer_Backend they live on Laravel's public disk — InventoryController's upload
// does Storage::disk('public')->putFileAs(IMAGE_DIR, …) and reports back a
// /storage/products/… URL. There is no public/images/ directory here at all, and
// requesting one is worse than a 404: the catch-all route answers 200 with the SPA's
// HTML, so the browser fetches "successfully" and then fails to DECODE it. That
// renders as a broken thumbnail with no failed request to point at.
// Photos are served from the BACKEND's origin, which is not this page's origin on a
// split deployment (shop on reeferclothing.com, API on api.sorbetesapparel.com), so
// it is derived from API_BASE rather than from window.location.
//
// Parsed with URL().origin, NOT by stripping a suffix off the string. The previous
// version was `.replace(/\/api(\/stocks)?\/?$/, '')`, which silently broke the day
// the API moved: inside ash-ai-backend the module mounts at /api/storefront/stocks,
// where `storefront` sits between the two segments the pattern expected to be
// adjacent, so nothing matched and every URL came out as
// …/api/storefront/stocks/storage/products/x.jpg. Origin parsing does not care what
// the path looks like or where the API is mounted next.
const MEDIA_ORIGIN = (() => {
  try {
    return new URL(API_BASE, window.location.origin).origin;
  } catch {
    return '';
  }
})();

const IMAGE_BASE = MEDIA_ORIGIN + '/storage/products/';

// ---- Website content fields (per DESIGN, queued under its product code) --
// Mirrors PendingProductEdits::CONTENT_FIELDS on the server. These are the
// pieces of the REEFER product page the Website View lets you edit.
const CONTENT_FIELD_META = {
  tag: { label: 'Tag badge' },
  audience: { label: 'Audience' },
  type: { label: 'Product type' },
  color: { label: 'Colorway' },
  blurb: { label: 'Description' },
  material: { label: 'Fabric' },
  print_method: { label: 'Print' },
  care: { label: 'Care' },
  origin: { label: 'Origin' },
  fit_name: { label: 'Fit name' },
  fit_desc: { label: 'Fit description' },
  image_front: { label: 'Front photo', image: true },
  image_back: { label: 'Back photo', image: true },
  image_detail: { label: 'Detail photo', image: true },
};
const WV_TAG_OPTIONS = ['', 'NEW', 'BEST SELLER', 'HEAVYWEIGHT', 'LAST FEW', 'ESSENTIAL', 'STAPLE'];
const WV_AUDIENCES = [['unisex', 'UNISEX'], ['men', "MEN'S"], ['women', "WOMEN'S"], ['accessories', 'ACCESSORIES']];
const WV_TYPES = [['tee', 'TEES'], ['hoodie', 'HOODIES'], ['shorts', 'SHORTS'], ['pants', 'PANTS'], ['bag', 'BAGS'], ['socks', 'SOCKS']];
const WV_AUD_LABEL = Object.fromEntries(WV_AUDIENCES);
const WV_TYPE_LABEL = Object.fromEntries(WV_TYPES);
// [value, label, swatch] — mirrors PendingProductEdits::CONTENT_COLORS.
const WV_COLORS = [
  ['black', 'Black', '#101010'], ['white', 'White', '#FFFFFF'], ['gray', 'Gray', '#8A8A8A'],
  ['beige', 'Beige', '#D8CDB4'], ['navy', 'Navy', '#1F2A44'], ['blue', 'Blue', '#3B6BB0'],
  ['red', 'Red', '#C0392B'], ['orange', 'Orange', '#F97B0C'], ['green', 'Green', '#1F8A5B'],
  ['multi', 'Multi', 'conic-gradient(#C0392B,#F97B0C,#1F8A5B,#3B6BB0,#C0392B)'],
];
// What the website falls back to when the ERP hasn't pushed the field —
// shown muted in the Website View so the preview still reads complete.
const WV_FALLBACKS = {
  print_method: '1–2 colour halftone screen print, hand-pulled in Quezon City.',
  care: 'Cold wash inside-out. Hang dry. Don’t iron the print.',
  origin: 'Designed & printed in Quezon City, PH.',
};
// The site's per-type FABRIC fallback (mirrors the storefront's map).
const WV_FABRIC = {
  tee: '100% combed cotton, 220gsm. Pre-shrunk, garment-washed.',
  hoodie: '380gsm cotton-poly fleece, brushed interior. Ribbed cuffs + hem.',
  shorts: 'Quick-dry nylon shell with mesh lining.',
  pants: 'Midweight cotton twill, garment-washed.',
  bag: 'Water-resistant coated canvas, taped seams.',
  socks: 'Combed-cotton blend with arch support.',
};

// "Pending" = reserved but not yet a confirmed sale — everything still
// moving through the pipeline. Cancelled orders never counted
// since their stock was already released back to Inventory.
const PENDING_STATUSES = ['new', 'in_process', 'to_pickup', 'shipped'];

// ---- Push Product: the queued-edit list --------------------------------
// Every queued field type in one list: price + status from this Catalog,
// On Hand corrections from the Inventory panel, and website content from
// the Website View. Applied by the 12:00 AM (Asia/Manila) batch, or right
// now via Force Push.
const PUSH_FIELD_LABELS = Object.assign(
  { price: 'Price', active: 'Status', available: 'Stock (On Hand)' },
  Object.fromEntries(Object.keys(CONTENT_FIELD_META).map((f) => [f, 'Web ' + CONTENT_FIELD_META[f].label])),
);

function pushFieldClass(field) {
  return CONTENT_FIELD_META[field] ? 'push-field-content' : 'push-field-' + field;
}

function formatPendingValue(field, value) {
  if (field === 'price') return '₱' + Number(value).toLocaleString();
  if (field === 'active') return value === '1' ? 'Active' : 'Inactive';
  if (field === 'available') return Number(value).toLocaleString() + ' pcs';
  const meta = CONTENT_FIELD_META[field];
  if (!meta) return String(value);
  const s = String(value == null ? '' : value);
  if (s === '') return '(cleared)';
  if (meta.image) return '📷 ' + s;
  return s.length > 60 ? s.slice(0, 60) + '…' : s;
}

// Takes the whole row, not just `image`, so it can use the absolute `image_url` the
// API supplies. Falls back to the derived path for any caller still passing a bare
// filename, and to the placeholder when there is no photo at all.
function catImgUrl(rowOrImage) {
  if (rowOrImage && typeof rowOrImage === 'object') {
    if (rowOrImage.image_url) return rowOrImage.image_url;
    return rowOrImage.image ? IMAGE_BASE + rowOrImage.image : IMAGE_BASE + '_placeholder.jpg';
  }
  return rowOrImage ? IMAGE_BASE + rowOrImage : IMAGE_BASE + '_placeholder.jpg';
}

// Keyed by SKU (not product name) — each size is a distinct SKU, so this
// keeps units/revenue accurate per size instead of blending all sizes of
// the same design together.
function buildSalesLookup(orders) {
  const completedOrders = orders.filter((o) => o.status === 'completed');
  const lookup = {};
  completedOrders.forEach((o) => {
    if (!lookup[o.sku]) {
      lookup[o.sku] = { units: 0, revenue: 0 };
    }
    lookup[o.sku].units += o.qty;
    lookup[o.sku].revenue += o.total;
  });
  return lookup;
}

// Group per-SKU catalog rows into one design per card/photo block,
// attaching each size's completed sales figures.
// Size ordering comes from src/utils/sizeOrder.js (compareSizes) — shared with
// the Inventory page and the Excel export so all three agree.
function groupCatalog(rows, salesByProduct) {
  const map = {};
  rows.forEach((r) => {
    const key = r.product_code || r.name;
    if (!map[key]) {
      // image_url rides along with image. The grid groups per DESIGN, so the thumbnail
      // comes from this object rather than the row — and dropping the absolute URL here
      // silently forced catImgUrl() back onto a client-derived path.
      map[key] = { key, product_code: r.product_code || '', name: r.name, category: r.category, image: r.image, image_url: r.image_url || null, website: r.website || null, sizes: [] };
    }
    const sales = salesByProduct[r.sku] || { units: 0, revenue: 0 };
    map[key].sizes.push({ row: r, sku: r.sku, size: r.size || '—', units: sales.units, revenue: sales.revenue });
  });
  const list = Object.keys(map).map((k) => map[k]);
  list.forEach((p) => {
    p.sizes.sort((a, b) => compareSizes(a.size, b.size));
  });
  return list;
}

// The storefront derives type/audience from the ERP category when a design
// first syncs; mirror that guess so the preview reads right before anyone
// has pushed an explicit pick.
function wvGuessType(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('hood')) return 'hoodie';
  if (c.includes('short')) return 'shorts';
  if (c.includes('pant') || c.includes('underwear') || c.includes('brief') || c.includes('boxer')) return 'pants';
  if (c.includes('bag') || c.includes('tote')) return 'bag';
  if (c.includes('sock')) return 'socks';
  return 'tee';
}

function wvGuessAudience(category) {
  const c = String(category || '').toLowerCase();
  if (c.includes('women')) return 'women';
  if (c.includes('men')) return 'men';
  const t = wvGuessType(category);
  return (t === 'bag' || t === 'socks') ? 'accessories' : 'unisex';
}

// ERP size names → the storefront's size chips (MEDIUM → M etc.).
function wvShortSize(size) {
  const map = {
    'EXTRA SMALL': 'XS', SMALL: 'S', MEDIUM: 'M', LARGE: 'L',
    'EXTRA LARGE': 'XL', XLARGE: 'XL', 'X-LARGE': 'XL', XXL: '2XL',
    '2XLARGE': '2XL', XXXL: '3XL', '': 'OS', 'ONE SIZE': 'OS', ONESIZE: 'OS',
    'FREE SIZE': 'OS', FREESIZE: 'OS', F: 'OS',
  };
  const s = String(size || '').toUpperCase();
  return map[s] || s;
}

// The three gallery slots. The preview shows what WILL be live: a queued
// photo wins over the pushed one; the front slot falls back to the
// design's per-SKU inventory photo (which is what the site uses until a
// front photo is pushed).
function wvViews(design, code, pendingFor) {
  const website = design.website || {};
  const invImage = (design.rows.find((r) => r.image) || {}).image || '';
  return [
    { field: 'image_front', label: 'FRONT', live: website.image_front || '', fallback: invImage, placeholder: 'Drop the ' + design.name + ' shot' },
    { field: 'image_back', label: 'BACK', live: website.image_back || '', fallback: '', placeholder: 'Drop the back shot' },
    { field: 'image_detail', label: 'DETAIL', live: website.image_detail || '', fallback: '', placeholder: 'Drop a detail shot' },
  ].map((v) => {
    v.pending = pendingFor(code, v.field);
    const file = v.pending ? String(v.pending.new_value || '') : (v.live || v.fallback);
    v.src = file ? IMAGE_BASE + file : null;
    return v;
  });
}

// What the muted empty-state of a field should say: the actual value the
// site will render (its default or derived guess) whenever we know it,
// instead of a generic "not set" on every row.
function wvEmptyText(field, design) {
  const website = design.website || {};
  const effType = website.type || wvGuessType(design.category);
  if (field === 'material') {
    return (WV_FABRIC[effType] || 'Not set') + ' (site default)';
  }
  if (WV_FALLBACKS[field]) {
    return WV_FALLBACKS[field] + ' (site default)';
  }
  if (field === 'audience') {
    const eff = website.audience || wvGuessAudience(design.category);
    return (WV_AUD_LABEL[eff] || String(eff).toUpperCase()) + ' — auto from the ERP category';
  }
  if (field === 'type') {
    return (WV_TYPE_LABEL[effType] || String(effType).toUpperCase()) + ' — auto from the ERP category';
  }
  if (field === 'tag') return 'No badge shown.';
  if (field === 'color') return "Not set — this design won't appear in the site's color filter.";
  if (field === 'blurb') return 'Not set — the site keeps its current description.';
  return 'Not set — the site keeps its current copy.';
}

// Enum fields edit through a <select>; everything else through a textarea
// (or a one-line input for the fit name). Same option sets and same empty
// labels as buildSelect() in the original.
function wvSelectSpec(field) {
  if (field === 'tag') return { pairs: WV_TAG_OPTIONS.filter(Boolean).map((t) => [t, t]), empty: '— no badge —' };
  if (field === 'audience') return { pairs: WV_AUDIENCES, empty: '— not set (site keeps its own) —' };
  if (field === 'type') return { pairs: WV_TYPES, empty: '— not set (site keeps its own) —' };
  if (field === 'color') return { pairs: WV_COLORS.map((c) => [c[0], c[1]]), empty: '— not set —' };
  return null;
}

// Size for a logged SKU — from current catalog data, fallback to SKU parse.
function logSize(sku, allProducts) {
  const item = allProducts.find((r) => r.sku === sku);
  if (item && item.size) return item.size;
  const m = String(sku || '').match(/U(2XL|3XL|XL|S|M|L)$/);
  return m ? m[1] : '';
}

// ---------------------------------------------------------------- pieces --

// Stock-left badge, shared by the list rows, grid cards and detail panel.
// `available` is what can still be sold (order allocations already netted out).
function StockBadge({ row }) {
  const n = Number(row.available) || 0;
  return (
    <span className={'stock-left ' + (n === 0 ? 'stock-out' : n <= 5 ? 'stock-low' : 'stock-ok')}>
      {n === 0 ? 'Out of stock' : n + ' left'}
    </span>
  );
}

// Active/Inactive toggle, reused by both list rows and grid cards.
//
// The pill shows the EFFECTIVE status — what this SKU will be once the push runs —
// so a click flips its colour and its label immediately. That is the feedback a
// toggle owes you; queueing silently while the pill stayed put read as a dead click.
//
// The live value is not lost: while a change is queued the pill is outlined rather
// than solid, and the chip beside it names what the site is still serving ("was
// Active"). So the row still answers both questions — what it is now, and what it
// is about to become.
function StatusButton({ row, pending, onToggle }) {
  const liveActive = row.active !== false;
  // What the SKU becomes at the next push: the queued value if one exists, else live.
  const effectiveActive = pending ? pending.new_value === '1' : liveActive;
  const isQueued = Boolean(pending) && pending.new_value === '1' !== liveActive;

  function handleClick(event) {
    event.stopPropagation();
    // Toggle relative to what's already queued, so a second click undoes
    // the pending flip (the server clears a row that matches live).
    const next = !effectiveActive;
    if (next && row.available === 0) {
      window.alert(row.name + " is out of stock (0 available) and can't be reactivated until it's restocked.");
      return;
    }
    onToggle(row.sku, next);
  }

  const className =
    'status-pill ' +
    (effectiveActive ? 'status-active' : 'status-inactive') +
    (isQueued ? ' status-queued' : '');

  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <button
        type="button"
        className={className}
        // Names the outcome rather than the mechanism — "Click to queue a status
        // change" told you what the system does, not what you get.
        title={
          (effectiveActive ? 'Set Inactive' : 'Set Active') +
          ' — queues the change for the 12:00 AM Push Product run' +
          (isQueued ? ' (currently ' + (liveActive ? 'Active' : 'Inactive') + ' on the site)' : '')
        }
        aria-label={
          row.name + ' ' + row.size + ' — ' +
          (isQueued
            ? 'queued to become ' + (effectiveActive ? 'Active' : 'Inactive') +
              ', still ' + (liveActive ? 'Active' : 'Inactive') + ' on the site. Activate to undo.'
            : (effectiveActive ? 'Active' : 'Inactive') +
              '. Activate to queue setting it ' + (effectiveActive ? 'Inactive' : 'Active') + '.')
        }
        aria-pressed={effectiveActive}
        onClick={handleClick}
      >
        {effectiveActive ? 'Active' : 'Inactive'}
      </button>
      {isQueued && (
        <span
          className="queued-chip"
          title={'Queued by ' + pending.edited_by + ' — applies at the 12:00 AM push'}
        >
          {'queued · was ' + (liveActive ? 'Active' : 'Inactive')}
        </span>
      )}
    </span>
  );
}

// ---- Editable price cell ----------------------------------------------
// Click the pencil to swap the cell into an input. Enter or blur commits,
// Escape cancels. A confirm step guards against fat-finger price changes.
function PriceCell({ row, pending, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  // The original guarded commit/cancel with a `settled` flag so a blur
  // arriving after Enter (or after Escape tore the input down) could not run
  // the commit twice. Same flag, same job.
  const settled = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function beginEdit() {
    settled.current = false;
    setValue(String(row.price));
    setEditing(true);
  }

  function cancel() {
    if (settled.current) return;
    settled.current = true;
    setEditing(false);
  }

  function commit() {
    if (settled.current) return;
    const newPrice = Number(value);

    if (!value.trim() || Number.isNaN(newPrice) || newPrice < 0) {
      cancel();
      return;
    }
    if (newPrice === Number(row.price)) {
      cancel();
      return;
    }

    settled.current = true;
    const ok = window.confirm(
      'Queue price change for ' + row.name + '?\n\n'
      + '₱' + Number(row.price).toLocaleString() + '  →  ₱' + newPrice.toLocaleString() + '\n\n'
      + 'Applies at the 12:00 AM push — or Force Push it now from Push Product.',
    );

    setEditing(false);
    if (!ok) return;
    onSave(row.sku, newPrice);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="1"
        className="price-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); commit(); }
          if (event.key === 'Escape') { event.preventDefault(); cancel(); }
        }}
        onBlur={commit}
      />
    );
  }

  return (
    <span className="cell-edit">
      <span>{'₱' + Number(row.price).toLocaleString()}</span>
      <button type="button" className="cell-edit-btn" title="Edit price" onClick={beginEdit}>✎</button>
      {pending && (
        <span
          className="queued-chip"
          title={'Queued by ' + pending.edited_by + ' — applies at the 12:00 AM push'}
        >
          {'→ ₱' + Number(pending.new_value).toLocaleString() + ' queued'}
        </span>
      )}
    </span>
  );
}

function WvQueuedChip({ pending }) {
  const val = String(pending.new_value == null ? '' : pending.new_value);
  return (
    <span
      className="queued-chip"
      title={'Queued by ' + pending.edited_by + ' — applies at the 12:00 AM push (or Force Push)'}
    >
      {'→ ' + (val === '' ? '(cleared)' : (val.length > 34 ? val.slice(0, 34) + '…' : val)) + ' queued'}
    </span>
  );
}

// One editable field: label row (+ ✎ + queued chip) over the value.
// `hideLabel` drops the label text when a section heading directly above
// already names the field (keeps the ✎ and queued chip).
//
// `editorValue` is undefined while the field is closed. Open editors survive
// re-renders for free here — the original had to snapshot every open editor's
// text before rewriting the modal's innerHTML and restore it afterwards.
function WvField({ field, design, pending, hideLabel, editorValue, saving, onOpen, onChange, onQueue, onCancel }) {
  const meta = CONTENT_FIELD_META[field];
  const live = (design.website || {})[field] || '';
  const open = editorValue !== undefined;
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const spec = wvSelectSpec(field);
  let control = null;
  if (open && spec) {
    // A pushed value the option list doesn't know about still has to be
    // selectable, exactly as buildSelect() appended it.
    const options = spec.pairs.slice();
    if (live && !options.some((p) => p[0] === live)) options.push([live, live]);
    control = (
      <select ref={inputRef} value={editorValue} onChange={(event) => onChange(field, event.target.value)}>
        <option value="">{spec.empty}</option>
        {options.map((p) => <option key={p[0]} value={p[0]}>{p[1]}</option>)}
      </select>
    );
  } else if (open && field === 'fit_name') {
    control = (
      <input
        ref={inputRef}
        type="text"
        maxLength={60}
        placeholder="e.g. BOX FIT"
        value={editorValue}
        onChange={(event) => onChange(field, event.target.value)}
      />
    );
  } else if (open) {
    control = (
      <textarea
        ref={inputRef}
        maxLength={2000}
        value={editorValue}
        onChange={(event) => onChange(field, event.target.value)}
      />
    );
  }

  const color = field === 'color' ? WV_COLORS.find((x) => x[0] === live) : null;

  return (
    <div className="wv-field" data-field={field}>
      <div className="wv-field-k">
        {!hideLabel && meta.label.toUpperCase()}
        <button
          type="button"
          className="wv-edit-btn"
          title="Edit — queues in Push Product"
          onClick={() => onOpen(field, live)}
        >
          ✎ Edit
        </button>
        {pending && <WvQueuedChip pending={pending} />}
      </div>

      {!open && (live ? (
        <div className="wv-field-v">
          {field === 'color' ? (
            <>
              {/* Show the swatch, not just the word. */}
              <span
                style={{
                  display: 'inline-block', width: '13px', height: '13px', borderRadius: '50%',
                  border: '2px solid #101010', verticalAlign: '-2px', marginRight: '7px',
                  background: color ? color[2] : '#ccc',
                }}
              />
              {color ? color[1] : live}
            </>
          ) : live}
        </div>
      ) : (
        <div className="wv-field-v empty">{wvEmptyText(field, design)}</div>
      ))}

      {open && (
        <div className="wv-editor" data-field={field}>
          {control}
          <div className="wv-editor-actions">
            <button type="button" className="wv-mini-btn" disabled={saving} onClick={() => onQueue(field, editorValue)}>
              Queue edit
            </button>
            <button type="button" className="wv-mini-btn" onClick={() => onCancel(field)}>Cancel</button>
          </div>
          <div className="wv-editor-hint">Blank = clear back to the site&apos;s own copy.</div>
        </div>
      )}
    </div>
  );
}

// ---- Website View: storefront-styled preview + content editor ----------
// One design (product_code) at a time. Every field mirrors what the
// REEFER product page renders; ✎ queues an edit into Push Product under
// the design's product code (see PendingProductEdits::CONTENT_FIELDS).
function WebsiteView({
  code, design, pendingFor, activeSlot, onSelectSlot,
  editors, savingField, onOpenEditor, onChangeEditor, onQueueEditor, onCancelEditor,
  onQueueAll, queueAllBusy, onReplacePhoto, onClose, onOverlayClick,
}) {
  const openEditorCount = Object.keys(editors).length;

  function fieldProps(field, hideLabel) {
    return {
      field,
      design,
      hideLabel,
      pending: pendingFor(code, field),
      editorValue: editors[field],
      saving: savingField === field,
      onOpen: onOpenEditor,
      onChange: onChangeEditor,
      onQueue: onQueueEditor,
      onCancel: onCancelEditor,
    };
  }

  let body;
  if (!design) {
    body = <p style={{ padding: '20px', fontWeight: 700 }}>This design is no longer in the catalog.</p>;
  } else {
    const website = design.website || {};
    const effType = website.type || wvGuessType(design.category);
    const effAud = website.audience || wvGuessAudience(design.category);
    const pendingTag = pendingFor(code, 'tag');
    const effTag = pendingTag ? String(pendingTag.new_value || '') : (website.tag || '');

    const views = wvViews(design, code, pendingFor);
    const slot = activeSlot >= views.length ? 0 : activeSlot;
    const activeView = views[slot];

    // FROM ₱min across sellable sizes + total stock chip, like the site.
    const activeRows = design.rows.filter((r) => r.active !== false);
    const pricePool = (activeRows.length ? activeRows : design.rows).map((r) => Number(r.price) || 0);
    const minPrice = Math.min.apply(null, pricePool);
    const distinctPrices = [...new Set(pricePool)];
    const totalStock = design.rows.reduce((sum, r) => sum + (Number(r.available) || 0), 0);

    body = (
      <>
        {/* Breadcrumb */}
        <div className="wv-crumb">
          {'SHOP / ' + (WV_TYPE_LABEL[effType] || String(effType).toUpperCase()) + ' / '}
          <strong>{design.name}</strong>
        </div>

        <div className="wv-grid">
          {/* ---- Left: gallery + the batch-queue button beneath the photo. */}
          <div className="wv-left">
            <div className="wv-gallery">
              <div className="wv-thumbs">
                {views.map((v, i) => (
                  <button
                    key={v.field}
                    type="button"
                    className={'wv-thumb' + (i === slot ? ' active' : '')}
                    title={v.label + ' photo'}
                    onClick={() => onSelectSlot(i)}
                  >
                    {v.src && <img src={v.src} alt="" />}
                    <span className="wv-slot-label">{v.label}</span>
                  </button>
                ))}
              </div>

              <div className="wv-main">
                <div className="wv-main-frame">
                  {activeView.src
                    ? <img src={activeView.src} alt={design.name} />
                    : activeView.placeholder}
                </div>
                {effTag && <span className="wv-tag-badge">{effTag}</span>}
                <div className="wv-photo-actions">
                  {activeView.pending && <WvQueuedChip pending={activeView.pending} />}
                  <button
                    type="button"
                    className="wv-mini-btn"
                    title="Upload a photo for this slot — queues in Push Product"
                    onClick={() => onReplacePhoto(activeView.field)}
                  >
                    {'📷 Replace ' + activeView.label + ' photo'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="wv-queue-all-btn"
              className="wv-queue-all"
              title="Queue every open, changed field in one go"
              disabled={queueAllBusy}
              onClick={onQueueAll}
            >
              {'⚡ Queue all edits' + (openEditorCount ? ' (' + openEditorCount + ')' : '')}
            </button>
          </div>

          {/* ---- Right: info column ------------------------------------ */}
          <div>
            <div className="wv-eyebrow">
              {(WV_AUD_LABEL[effAud] || String(effAud).toUpperCase()) + ' · ' + (WV_TYPE_LABEL[effType] || String(effType).toUpperCase())}
            </div>
            <div className="wv-name">{design.name}</div>

            <div className="wv-price-row">
              <span className="wv-price">
                {(distinctPrices.length > 1 ? 'FROM ' : '') + '₱' + minPrice.toLocaleString()}
              </span>
              <span className={'wv-stock-chip' + (totalStock === 0 ? ' out' : totalStock <= 6 ? ' low' : '')}>
                {totalStock === 0 ? 'SOLD OUT' : totalStock + ' LEFT'}
              </span>
            </div>

            <WvField {...fieldProps('tag')} />

            <div className="wv-section-label">CATEGORY</div>
            <WvField {...fieldProps('audience')} />
            <WvField {...fieldProps('type')} />
            <WvField {...fieldProps('color')} />

            <div className="wv-section-label">DESCRIPTIONS</div>
            <WvField {...fieldProps('blurb', true)} />

            <div className="wv-section-label">SELECT SIZE</div>
            <div className="wv-sizes">
              {design.rows.map((r) => (
                <span
                  key={r.sku}
                  className="wv-size-chip"
                  style={{ opacity: (Number(r.available) || 0) === 0 ? 0.35 : 1 }}
                >
                  {wvShortSize(r.size)}
                </span>
              ))}
            </div>
            <div className="wv-static-note">
              Sizes come from this design&apos;s Inventory SKUs — add or retire sizes there.
            </div>

            <div className="wv-pay-row">
              {['GCASH', 'MAYA', 'COD'].map((p) => (
                <span key={p} className="wv-pay-badge">{p}</span>
              ))}
              <span className="wv-static-note" style={{ marginTop: '0' }}>
                MNL 1–3 DAYS · PROVINCIAL 3–7 (site-wide, not per-product)
              </span>
            </div>

            <div className="wv-section-label">THE DETAILS</div>
            <WvField {...fieldProps('material')} />
            <WvField {...fieldProps('print_method')} />
            <WvField {...fieldProps('care')} />
            <WvField {...fieldProps('origin')} />

            <div className="wv-fit-box">
              <WvField {...fieldProps('fit_name')} />
              <WvField {...fieldProps('fit_desc')} />
            </div>
          </div>
        </div>

        <div className="wv-footnote">
          Product <strong>name</strong>, <strong>per-size prices</strong> and <strong>Active status</strong> are
          managed on the Catalog and Inventory screens (name via Inventory / Excel import). Website edits queued
          here apply at the <strong>12:00 AM push</strong> (or a Force Push) and the REEFER site picks them up on
          its next catalog sync, usually within a minute.
        </div>
      </>
    );
  }

  return (
    <div id="wv-overlay" className="modal-overlay" style={{ display: 'flex' }} onClick={onOverlayClick}>
      <div className="wv-box">
        <div className="wv-topbar">
          <div>
            <div className="wv-title">🌐 WEBSITE VIEW <span style={{ color: '#F97B0C' }}>— REEFER product page</span></div>
            <div className="wv-note">
              This is how the design renders on the website. Click ✎ to edit a field — edits queue
              in <strong>Push Product</strong> and go live at the 12:00 AM push (or a Force Push), then the site
              picks them up on its next sync.
            </div>
          </div>
          <button type="button" className="wv-close" title="Close" onClick={onClose}>✕</button>
        </div>
        <div id="wv-body">{body}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- the page --

export default function Catalog() {
  const location = useLocation();
  const { user } = useAuth();
  const { setPanelOpen } = useAppShell();

  const [allProducts, setAllProducts] = useState([]);
  const [latestOrders, setLatestOrders] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);   // Push Product queue, mirrored from the server
  const [allLogs, setAllLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [logError, setLogError] = useState('');

  const [view, setView] = useState('catalog');            // Catalog | Activity Log tab
  const [subview, setSubview] = useState(
    () => (new URLSearchParams(location.search).get('subview') === 'grid' ? 'grid' : 'list'),
  );
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logField, setLogField] = useState('all');

  // currentPanelSku is null while the panel is closed; `panelShownSku` keeps the
  // last design on screen so the 0.15s slide-out isn't a blank card.
  const [panelSku, setPanelSku] = useState(null);
  const [panelShownSku, setPanelShownSku] = useState(null);

  const [pushOpen, setPushOpen] = useState(false);
  const [pushMessage, setPushMessage] = useState({ text: '', isError: false });
  const [pushAllBusy, setPushAllBusy] = useState(false);

  const [wvCode, setWvCode] = useState(null);
  const [wvActiveSlot, setWvActiveSlot] = useState(0);
  // Open editors: { field: current text }. A field that isn't a key is closed.
  const [wvEditors, setWvEditors] = useState({});
  const [wvSavingField, setWvSavingField] = useState(null);
  const [wvQueueAllBusy, setWvQueueAllBusy] = useState(false);

  const photoInputRef = useRef(null);
  const wvUploadField = useRef(null);

  const username = user ? user.username : 'unknown';

  // Status dot + "last synced" line instead of the old wide green banner,
  // with a red "Reconnecting…" dot and automatic retry if the feed drops.
  const loadCatalogRef = useRef(null);
  const retry = useCallback(() => {
    if (loadCatalogRef.current) loadCatalogRef.current();
  }, []);
  const sync = useSyncStatus({ retry });
  const syncOk = sync.ok;
  const syncError = sync.error;

  // ---- loaders ----------------------------------------------------------

  const loadCatalog = useCallback(async () => {
    try {
      const [invResponse, ordersResponse] = await Promise.all([
        client.get('/inventory'),
        client.get('/orders'),
      ]);

      const products = invResponse.data;
      setAllProducts(products);
      setLatestOrders(ordersResponse.data);

      syncOk(products.length + ' products loaded');
      return products;
    } catch (err) {
      syncError(err.message);
      return null;
    }
  }, [syncOk, syncError]);

  useEffect(() => {
    loadCatalogRef.current = loadCatalog;
  }, [loadCatalog]);

  const loadPendingEdits = useCallback(async () => {
    try {
      const { data } = await client.get('/inventory/pending-edits');
      setPendingEdits(Array.isArray(data) ? data : []);
    } catch {
      setPendingEdits([]);
    }
    // The four things the original did next — the badge count, the Push
    // Product list, the queued chips in the table and the open panel/Website
    // View — all read `pendingEdits`, so they redraw on their own.
  }, []);

  // ---- Activity Log (scoped to Catalog-modifiable fields) ----------------
  // Price, Active status, and pushed website-content edits. Same
  // InventoryLog sheet Inventory reads from — quantity/deletion entries are
  // filtered out here since those belong to the Inventory page.
  const loadCatalogLogs = useCallback(async () => {
    try {
      const { data } = await client.get('/inventory/logs');
      setAllLogs(data.filter((l) => l.field === 'price' || l.field === 'active' || CONTENT_FIELD_META[l.field]));
      setLogsLoaded(true);
      setLogError('');
    } catch (err) {
      setLogError('Could not load activity log: ' + err.message);
    }
  }, []);

  // A push changes live inventory + writes activity log rows — refresh all
  // of it in one sweep.
  const refreshAfterPush = useCallback(async () => {
    await loadCatalog();
    await loadPendingEdits();
    loadCatalogLogs();
  }, [loadCatalog, loadPendingEdits, loadCatalogLogs]);

  // ---- derived data -----------------------------------------------------

  const pendingFor = useCallback(
    (sku, field) => pendingEdits.find((e) => e.sku === sku && e.field === field) || null,
    [pendingEdits],
  );

  const salesByProduct = useMemo(() => buildSalesLookup(latestOrders), [latestOrders]);

  const categories = useMemo(
    () => [...new Set(allProducts.map((r) => r.category))].sort(),
    [allProducts],
  );

  // populateCategoryFilter() rebuilt the <select> after every load and kept the
  // current pick only when it still existed; a category that disappeared fell
  // back to "All Categories".
  useEffect(() => {
    if (category !== 'all' && !categories.includes(category)) setCategory('all');
  }, [categories, category]);

  const kpis = useMemo(() => {
    const completedOrders = latestOrders.filter((o) => o.status === 'completed');
    const pendingOrders = latestOrders.filter((o) => PENDING_STATUSES.indexOf(o.status) !== -1);
    return {
      activeCount: allProducts.filter((p) => p.active !== false).length,
      totalUnits: completedOrders.reduce((sum, o) => sum + o.qty, 0),
      totalRevenue: completedOrders.reduce((sum, o) => sum + o.total, 0),
      pipelineRevenue: pendingOrders.reduce((sum, o) => sum + o.total, 0),
    };
  }, [allProducts, latestOrders]);

  const filteredRows = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    let filtered = allProducts;
    if (searchTerm) {
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(searchTerm));
    }
    if (category !== 'all') {
      filtered = filtered.filter((r) => r.category === category);
    }
    return filtered;
  }, [allProducts, search, category]);

  const groupedProducts = useMemo(
    () => groupCatalog(filteredRows, salesByProduct),
    [filteredRows, salesByProduct],
  );

  // Flattened SKU order matching what's currently on screen (respects
  // active search/category filters), so ▲▼ steps through exactly what the
  // person is looking at rather than the full unfiltered catalog.
  const skuSequence = useMemo(() => {
    const seq = [];
    groupedProducts.forEach((p) => p.sizes.forEach((s) => seq.push(s.sku)));
    return seq;
  }, [groupedProducts]);

  const panelRow = useMemo(
    () => allProducts.find((r) => r.sku === panelShownSku) || null,
    [allProducts, panelShownSku],
  );

  const navIndex = skuSequence.indexOf(panelShownSku);

  const wvDesign = useMemo(() => {
    if (!wvCode) return null;
    const rows = allProducts.filter((r) => (r.product_code || '') === wvCode);
    if (!rows.length) return null;
    rows.sort((a, b) => compareSizes(a.size || '', b.size || ''));
    return { code: wvCode, name: rows[0].name, category: rows[0].category, rows, website: rows[0].website || {} };
  }, [allProducts, wvCode]);

  // ---- detail panel -----------------------------------------------------

  const openDetailPanel = useCallback((sku) => {
    if (!allProducts.some((r) => r.sku === sku)) return;
    setPanelSku(sku);
    setPanelShownSku(sku);
    setPanelOpen(true);
  }, [allProducts, setPanelOpen]);

  const closeDetailPanel = useCallback(() => {
    setPanelSku(null);
    setPanelOpen(false);
  }, [setPanelOpen]);

  const navigatePanel = useCallback((direction) => {
    const idx = skuSequence.indexOf(panelShownSku);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= skuSequence.length) return;
    openDetailPanel(skuSequence[newIdx]);
  }, [skuSequence, panelShownSku, openDetailPanel]);

  // Arrow-key navigation while the panel is open — skipped while a text
  // field is focused (e.g. the price edit input) so native browser
  // behavior isn't hijacked.
  useEffect(() => {
    function onKeyDown(event) {
      if (!panelSku) return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'ArrowUp') { event.preventDefault(); navigatePanel(-1); }
      if (event.key === 'ArrowDown') { event.preventDefault(); navigatePanel(1); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelSku, navigatePanel]);

  // ---- queued edits (price / status) ------------------------------------

  // Price edits no longer write to inventory directly — they queue in Push
  // Product (pending_product_edits) and go live at the 12:00 AM push or a
  // Force Push. Editing the same field again overwrites the pending row;
  // typing the live price back in clears it (that's the undo).
  const savePrice = useCallback(async (sku, newPrice) => {
    try {
      const { data } = await client.post('/inventory/pending-edits', {
        sku,
        field: 'price',
        new_value: newPrice,
        user: username,
      });

      await loadPendingEdits();

      const row = allProducts.find((p) => p.sku === sku);
      syncOk(data.status === 'cleared'
        ? 'Pending price edit cleared for ' + (row ? row.name : sku) + " — value matches what's live."
        : 'Price change queued for ' + (row ? row.name : sku) + ' — applies at the 12:00 AM push (or Force Push).');
    } catch (err) {
      syncError('Could not queue price change: ' + err.message);
    }
  }, [allProducts, username, loadPendingEdits, syncOk, syncError]);

  // Status flips queue the same way — the pill keeps showing the LIVE
  // status until the push applies, with the queued flip chip beside it.
  const toggleActive = useCallback(async (sku, newActiveValue) => {
    try {
      const { data } = await client.post('/inventory/pending-edits', {
        sku,
        field: 'active',
        new_value: newActiveValue,
        user: username,
      });

      await loadPendingEdits();

      const row = allProducts.find((p) => p.sku === sku);
      syncOk(data.status === 'cleared'
        ? 'Pending status edit cleared for ' + (row ? row.name : sku) + '.'
        : (newActiveValue ? 'Activation' : 'Deactivation') + ' queued for ' + (row ? row.name : sku) + ' — applies at the 12:00 AM push (or Force Push).');
    } catch (err) {
      window.alert('Could not queue status change: ' + err.message);
    }
  }, [allProducts, username, loadPendingEdits, syncOk]);

  // ---- Website View -----------------------------------------------------

  const openWebsiteView = useCallback((code) => {
    setWvCode(code);
    setWvActiveSlot(0);
  }, []);

  const closeWebsiteView = useCallback(() => {
    setWvCode(null);
    // The original left its (hidden) editors in the DOM, so reopening the modal
    // resurrected text it had just told you was discarded — even onto a
    // different design. Closing drops them, which is what the confirm promises.
    setWvEditors({});
  }, []);

  // In-progress editors hold unqueued text — closing must not eat it silently.
  const confirmDiscardEdits = useCallback(() => {
    const n = Object.keys(wvEditors).length;
    return n === 0 || window.confirm(n + ' open edit' + (n > 1 ? 's' : '') + ' will be discarded (not queued). Close anyway?');
  }, [wvEditors]);

  // Click the dimmed backdrop (not the box) or press Escape to close.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'Escape' || !wvCode) return;
      // With editors open, Escape must not throw away in-progress text by
      // closing the whole modal — cancel or queue the edits first.
      if (Object.keys(wvEditors).length > 0) return;
      closeWebsiteView();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [wvCode, wvEditors, closeWebsiteView]);

  const openWvEditor = useCallback((field, live) => {
    setWvEditors((prev) => ({ ...prev, [field]: live }));
  }, []);

  const changeWvEditor = useCallback((field, value) => {
    setWvEditors((prev) => ({ ...prev, [field]: value }));
  }, []);

  const cancelWvEditor = useCallback((field) => {
    setWvEditors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const queueContentEdit = useCallback(async (field, value) => {
    const label = CONTENT_FIELD_META[field] ? CONTENT_FIELD_META[field].label : field;
    setWvSavingField(field);
    try {
      const { data } = await client.post('/inventory/pending-edits', {
        sku: wvCode,
        field,
        new_value: value,
        user: username,
      });
      // close this editor; keep the others open
      setWvEditors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      await loadPendingEdits();     // refreshes chips + this modal
      syncOk(data.status === 'cleared'
        ? label + ' edit cleared for ' + wvCode + " — it matches what's already pushed."
        : label + ' queued for ' + wvCode + ' — applies at the 12:00 AM push (or Force Push).');
    } catch (err) {
      window.alert('Could not queue website edit: ' + err.message);
    } finally {
      setWvSavingField(null);
    }
  }, [wvCode, username, loadPendingEdits, syncOk]);

  // The "Queue all edits" button under the photo: submit every OPEN editor
  // whose value was actually changed, in one sweep, then re-render once.
  // Failed fields keep their editor (and typed text) so nothing is lost.
  const queueAllOpenEdits = useCallback(async () => {
    const website = (wvDesign && wvDesign.website) || {};
    const changes = [];
    Object.keys(wvEditors).forEach((field) => {
      // An untouched editor must not re-submit the live value and thereby
      // clear a pending row (the undo semantic).
      const original = String(website[field] || '');
      if (String(wvEditors[field]).trim() === original.trim()) return;
      changes.push({ field, value: wvEditors[field] });
    });

    if (changes.length === 0) {
      window.alert('Nothing to queue yet — open a field with ✎ Edit and change its value first.');
      return;
    }

    setWvQueueAllBusy(true);
    const queued = [];
    const failed = [];

    for (const c of changes) {
      const label = CONTENT_FIELD_META[c.field] ? CONTENT_FIELD_META[c.field].label : c.field;
      try {
        // Sequential on purpose: the original awaited each POST in turn so the
        // server sees the same one-at-a-time upserts.
        await client.post('/inventory/pending-edits', {
          sku: wvCode,
          field: c.field,
          new_value: c.value,
          user: username,
        });
        queued.push(c.field);
      } catch (err) {
        failed.push(label + ': ' + err.message);
      }
    }

    // close the queued editors, keep failed ones open
    setWvEditors((prev) => {
      const next = { ...prev };
      queued.forEach((f) => delete next[f]);
      return next;
    });
    await loadPendingEdits();
    setWvQueueAllBusy(false);

    if (failed.length) {
      window.alert('Queued ' + queued.length + ' of ' + changes.length + ' edits.\n\nNot queued:\n' + failed.join('\n'));
    } else {
      syncOk(queued.length + ' website edit' + (queued.length > 1 ? 's' : '') + ' queued for ' + wvCode + ' — they apply at the 12:00 AM push (or Force Push).');
    }
  }, [wvDesign, wvEditors, wvCode, username, loadPendingEdits, syncOk]);

  function beginPhotoUpload(field) {
    wvUploadField.current = field;
    const input = photoInputRef.current;
    if (!input) return;
    input.value = '';
    input.click();
  }

  async function onPhotoChosen(event) {
    const file = event.target.files && event.target.files[0];
    const field = wvUploadField.current;
    wvUploadField.current = null;
    if (!file || !field) return;
    try {
      const fd = new FormData();
      fd.append('photo', file);
      // The Content-Type override is required, not decorative: src/api/client.js
      // sets `Content-Type: application/json` on the instance, and axios's
      // default transformRequest turns FormData into JSON whenever the header
      // says JSON — the file would arrive as `{"photo":{}}`. Naming multipart
      // here makes axios pass the FormData through; it then clears the header
      // so the browser can add the multipart boundary.
      const { data } = await client.post('/inventory/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await queueContentEdit(field, data.image);
    } catch (err) {
      window.alert('Photo upload failed: ' + err.message);
    }
  }

  // ---- Push Product -----------------------------------------------------

  const pushStatus = useCallback((message, isError) => {
    setPushMessage({ text: message, isError: !!isError });
  }, []);

  const openPushModal = useCallback(() => {
    pushStatus('', false);
    setPushOpen(true);
  }, [pushStatus]);

  const forcePushOne = useCallback(async (edit) => {
    const ok = window.confirm(
      'Force push now?\n\n' + edit.sku + ' — ' + (PUSH_FIELD_LABELS[edit.field] || edit.field) + ': '
      + formatPendingValue(edit.field, edit.old_value) + ' → ' + formatPendingValue(edit.field, edit.new_value)
      + '\n\nThis applies immediately instead of waiting for the 12:00 AM push.',
    );
    if (!ok) return;
    try {
      const { data } = await client.post('/inventory/pending-edits/' + edit.id + '/push');
      await refreshAfterPush();
      pushStatus(data.status === 'applied'
        ? 'Pushed — ' + edit.sku + ' is live and logged to the Activity Log.'
        : 'Nothing to apply — the live value already matched; row removed.', false);
    } catch (err) {
      pushStatus('Force push failed: ' + err.message, true);
    }
  }, [refreshAfterPush, pushStatus]);

  const discardOne = useCallback(async (edit) => {
    const ok = window.confirm(
      'Discard this pending edit?\n\n' + edit.sku + ' — ' + (PUSH_FIELD_LABELS[edit.field] || edit.field)
      + ' → ' + formatPendingValue(edit.field, edit.new_value) + '\n\nThe live value stays as it is.',
    );
    if (!ok) return;
    try {
      await client.delete('/inventory/pending-edits/' + edit.id);
      await loadPendingEdits();
      pushStatus('Discarded — nothing was applied.', false);
    } catch (err) {
      pushStatus('Discard failed: ' + err.message, true);
    }
  }, [loadPendingEdits, pushStatus]);

  const forcePushAll = useCallback(async () => {
    if (pendingEdits.length === 0) return;
    const ok = window.confirm(
      'Force push ALL ' + pendingEdits.length + ' pending edit(s) now?\n\n'
      + 'Every queued price, status and stock change becomes live immediately.',
    );
    if (!ok) return;
    setPushAllBusy(true);
    try {
      const { data } = await client.post('/inventory/pending-edits/push-all');
      await refreshAfterPush();
      let message = data.applied + ' applied';
      if (data.no_change) message += ', ' + data.no_change + ' already matched live';
      if (data.sku_gone) message += ', ' + data.sku_gone + ' dropped (SKU deleted)';
      if (data.failed && data.failed.length) message += ', ' + data.failed.length + ' FAILED (still queued)';
      pushStatus('Push complete: ' + message + '.', !!(data.failed && data.failed.length));
    } catch (err) {
      pushStatus('Force push failed: ' + err.message, true);
    } finally {
      setPushAllBusy(false);
    }
  }, [pendingEdits, refreshAfterPush, pushStatus]);

  // The sidebar's "Push Product" subtab lands here as /catalog?push=1 —
  // open the popup straight away. The static page could only read the query
  // string once, on load; in the SPA the link is a client-side navigation, so
  // this watches for it.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('push')) openPushModal();
  }, [location.search, openPushModal]);

  // ---- boot -------------------------------------------------------------
  // Deep links: ?subview=grid opens the Grid view (read straight into state
  // above), ?website=R001 opens a design's Website View once the catalog is in
  // (used by the sidebar/push flows and handy for sharing a direct link).
  const bootSearch = useRef(location.search);
  useEffect(() => {
    (async () => {
      const products = await loadCatalog();
      loadCatalogLogs();
      await loadPendingEdits();
      const wv = new URLSearchParams(bootSearch.current).get('website');
      if (wv && products && products.some((r) => r.product_code === wv)) {
        openWebsiteView(wv);
      }
    })();
  }, [loadCatalog, loadCatalogLogs, loadPendingEdits, openWebsiteView]);

  // ---- Activity Log filtering -------------------------------------------

  const filteredLogs = useMemo(() => {
    const term = logSearch.trim().toLowerCase();
    let filtered = allLogs;

    if (logField === 'website') {
      filtered = filtered.filter((l) => !!CONTENT_FIELD_META[l.field]);
    } else if (logField !== 'all') {
      filtered = filtered.filter((l) => l.field === logField);
    }

    if (term) {
      filtered = filtered.filter((l) => (l.sku + ' ' + l.product_name + ' ' + l.reason + ' ' + (l.notes || '') + ' ' + l.user)
        .toLowerCase().includes(term));
    }

    return filtered;
  }, [allLogs, logSearch, logField]);

  // ---- view tabs --------------------------------------------------------

  function selectView(name) {
    setView(name);
    if (name === 'log') closeDetailPanel();
  }

  // ---- render -----------------------------------------------------------

  return (
    <>
      <h1>Product Catalog</h1>
      <p className="sub">
        Browse Reefer apparel, pricing, and sales performance. Hover a price and click ✎ to edit it,
        or click a <strong>status pill</strong> to flip a size between Active and Inactive. Open a design
        to preview its <strong>🌐 Product Page</strong> on the REEFER site and edit its photos, description,
        category and details. Price, status and website-content edits all queue
        in <strong>Push Product</strong> and go live at the 12:00 AM push (or a Force Push). Stock is managed in
        Inventory.
      </p>

      <SyncLine sync={sync} />

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Active Products</div>
          <div className="kpi-value">{kpis.activeCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Units Sold</div>
          <div className="kpi-value">{kpis.totalUnits}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Catalog Revenue</div>
          <div className="kpi-value">{'₱' + kpis.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">
            Pipeline Revenue <span style={{ opacity: 0.6, fontWeight: 400, textTransform: 'none' }}>(not yet completed)</span>
          </div>
          <div className="kpi-value c-orange">{'₱' + kpis.pipelineRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="tabs" id="view-tabs">
        <div className={'tab' + (view === 'catalog' ? ' active' : '')} onClick={() => selectView('catalog')}>Catalog</div>
        <div className={'tab' + (view === 'log' ? ' active' : '')} onClick={() => selectView('log')}>
          Activity Log<span className="count">{logsLoaded ? allLogs.length : ''}</span>
        </div>
      </div>

      <div id="catalog-view" style={{ display: view === 'catalog' ? 'block' : 'none' }}>
        <div className="toolbar">
          <div className="search-box">
            <span>🔍</span>
            <input
              id="search-input"
              placeholder="Search product name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button
            type="button"
            className="btn btn-primary push-btn"
            title="Queued price / status / stock edits"
            onClick={openPushModal}
          >
            🚀 Push Product{' '}
            <span className="push-count" style={{ display: pendingEdits.length ? 'inline-block' : 'none' }}>
              {pendingEdits.length}
            </span>
          </button>
        </div>

        <div className="catalog-toolbar">
          <div className="count-label" style={{ margin: 0 }}>
            {filteredRows.length + ' of ' + allProducts.length + ' products'}
          </div>
          <div className="subview-toggle">
            <button
              type="button"
              className={'subview-btn' + (subview === 'list' ? ' active' : '')}
              onClick={() => setSubview('list')}
            >
              ☰ List
            </button>
            <button
              type="button"
              className={'subview-btn' + (subview === 'grid' ? ' active' : '')}
              onClick={() => setSubview('grid')}
            >
              ▦ Grid
            </button>
          </div>
        </div>

        {/* ---- List view: spreadsheet-style, photo/code/category/name grouped
            across each design's sizes; price/units/revenue/status per size. */}
        <div id="catalog-list-wrap" style={{ display: subview === 'list' ? 'block' : 'none' }}>
          <table>
            <colgroup>
              <col style={{ width: '64px' }} /><col style={{ width: '8%' }} /><col style={{ width: '9%' }} />
              <col style={{ width: '7%' }} /><col style={{ width: '18%' }} /><col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} /><col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Photo</th>
                <th>Code</th>
                <th>Category</th>
                <th>Size</th>
                <th>Name</th>
                <th>SKU</th>
                <th>Price <span style={{ opacity: 0.55, fontWeight: 400, textTransform: 'none' }}>✎ editable</span></th>
                <th>Stock Left</th>
                <th className="col-num">Units Sold</th>
                <th className="col-num">Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="catalog-body">
              {subview === 'list' && groupedProducts.map((p) => (
                <Fragment key={p.key}>
                  {p.sizes.map((s, idx) => (
                    <tr
                      key={s.sku}
                      className={idx === 0 ? 'group-first-row' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openDetailPanel(s.sku)}
                    >
                      {idx === 0 && (
                        <>
                          <td rowSpan={p.sizes.length}>
                            <div className="cat-thumb">
                              <img loading="lazy" src={catImgUrl(p)} alt={p.name} />
                            </div>
                          </td>
                          {/* Code only. The 🌐 Product Page button used to sit here, one per
                              design, which put a second call-to-action in a cell whose job is
                              to identify the row — and repeated it down the grid. It lives in
                              the detail panel now, which is where the rest of a design's
                              content editing already happens. */}
                          <td rowSpan={p.sizes.length}>
                            <span className="cat-code">{p.product_code || '—'}</span>
                          </td>
                          <td rowSpan={p.sizes.length}>{p.category}</td>
                        </>
                      )}

                      <td><span className="size-badge">{s.size}</span></td>

                      {idx === 0 && <td rowSpan={p.sizes.length} className="cat-name">{p.name}</td>}

                      <td className="cat-sku">{s.sku}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <PriceCell row={s.row} pending={pendingFor(s.sku, 'price')} onSave={savePrice} />
                      </td>
                      <td><StockBadge row={s.row} /></td>
                      <td className="col-num">{s.units}</td>
                      <td className="col-num">{'₱' + s.revenue.toLocaleString()}</td>
                      <td><StatusButton row={s.row} pending={pendingFor(s.sku, 'active')} onToggle={toggleActive} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- Grid view: one storefront-styled card per design — the REEFER
            site's card look (cream, hard black border, tag/type chips, FROM price,
            pushed description) carrying the ERP's per-size table, with a black
            "edit website page" bar where the site has ADD TO CART. */}
        <div className="catalog-grid" id="catalog-grid" style={{ display: subview === 'grid' ? 'grid' : 'none' }}>
          {subview === 'grid' && groupedProducts.map((p) => {
            const website = p.website || {};
            // Photo block: the pushed front photo wins (it's what the site
            // shows), else the per-SKU inventory photo, else the site's
            // drop-a-shot placeholder look.
            const photoFile = website.image_front || p.image;
            // Resolve through catImgUrl (which prefers the API's absolute image_url)
            // unless a DIFFERENT photo has been pushed to the site. IMAGE_BASE points at
            // /images/products/, a directory Reefer_Backend does not have — the request
            // 200s with the SPA's HTML and then fails to decode, which is a broken image
            // rather than an honest 404. The stored photos live under /storage/products/,
            // which is exactly what image_url gives.
            const photoSrc = (!website.image_front || website.image_front === p.image)
              ? catImgUrl(p)
              : IMAGE_BASE + website.image_front;
            // Tag badge (a queued edit previews immediately) + type chip, in the
            // same corners the site puts them.
            const pendingTag = p.product_code ? pendingFor(p.product_code, 'tag') : null;
            const effTag = pendingTag ? String(pendingTag.new_value || '') : (website.tag || '');

            const activeSizes = p.sizes.filter((s) => s.row.active !== false);
            const pricePool = (activeSizes.length ? activeSizes : p.sizes).map((s) => Number(s.row.price) || 0);
            const minPrice = pricePool.length ? Math.min.apply(null, pricePool) : 0;
            const totalStock = p.sizes.reduce((sum, s) => sum + (Number(s.row.available) || 0), 0);

            return (
              <div className="rfc-card" key={p.key}>
                <div
                  className="rfc-photo"
                  title={p.product_code ? 'Open the Website View for ' + p.name : undefined}
                  onClick={p.product_code ? () => openWebsiteView(p.product_code) : undefined}
                >
                  {photoFile
                    ? <img loading="lazy" src={photoSrc} alt={p.name} />
                    : <div className="rfc-drop">{'Drop the ' + p.name + ' shot'}</div>}
                  {effTag && <span className="rfc-tag">{effTag}</span>}
                  <span className="rfc-type">{String(website.type || wvGuessType(p.category)).toUpperCase()}</span>
                  {p.product_code && <span className="rfc-code">{p.product_code}</span>}
                </div>

                {/* Name / FROM price / stock line / pushed description. */}
                <div className="rfc-body">
                  <div className="rfc-title-row">
                    <div className="rfc-name">{p.name}</div>
                    <div className="rfc-price">
                      {([...new Set(pricePool)].length > 1 ? 'FROM ' : '') + '₱' + minPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className={'rfc-stock' + (totalStock === 0 ? ' out' : totalStock <= 6 ? ' low' : '')}>
                    {totalStock === 0 ? 'SOLD OUT' : totalStock + ' IN STOCK'}
                  </div>
                  {website.blurb ? (
                    <div className="rfc-blurb">
                      {website.blurb.length > 110 ? website.blurb.slice(0, 110) + '…' : website.blurb}
                    </div>
                  ) : (
                    <div className="rfc-blurb empty">No description pushed yet — add one in the Website View.</div>
                  )}
                </div>

                {/* The ERP's per-size numbers, restyled to sit inside the card. */}
                <div className="rfc-table-wrap">
                  <table className="rfc-table">
                    <thead>
                      <tr>
                        <th>Size · SKU</th><th>Price</th><th>Stock</th><th>Sold</th><th>Rev</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.sizes.map((s) => (
                        <tr key={s.sku} onClick={() => openDetailPanel(s.sku)}>
                          {/* Size badge with the SKU tucked under it — one column instead of
                              two keeps the whole table inside the card width. */}
                          <td>
                            <span className="size-badge">{wvShortSize(s.size)}</span>
                            <div className="rfc-sku-sub">{s.sku}</div>
                          </td>
                          <td onClick={(event) => event.stopPropagation()}>
                            <PriceCell row={s.row} pending={pendingFor(s.sku, 'price')} onSave={savePrice} />
                          </td>
                          <td><StockBadge row={s.row} /></td>
                          <td>{s.units}</td>
                          <td>{'₱' + s.revenue.toLocaleString()}</td>
                          <td><StatusButton row={s.row} pending={pendingFor(s.sku, 'active')} onToggle={toggleActive} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* The site's ADD TO CART slot: here it opens the Website View editor. */}
                {p.product_code && (
                  <button type="button" className="rfc-cta" onClick={() => openWebsiteView(p.product_code)}>
                    🌐 Edit product page
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div id="log-view" style={{ display: view === 'log' ? 'block' : 'none' }}>
        <p className="sub" style={{ marginTop: 0 }}>
          Price changes, Active/Inactive status flips, and website-content pushes made from this Catalog.
          Queued Push Product edits appear here once they&apos;re pushed. Quantity adjustments are tracked in
          Inventory.
        </p>
        <div className="toolbar" style={{ marginBottom: '4px' }}>
          <div className="search-box">
            <span>🔍</span>
            <input
              id="log-search-input"
              placeholder="Search SKU, product, reason, or user..."
              value={logSearch}
              onChange={(event) => setLogSearch(event.target.value)}
            />
          </div>
          <select id="log-field-filter" value={logField} onChange={(event) => setLogField(event.target.value)}>
            <option value="all">All changes</option>
            <option value="price">Price</option>
            <option value="active">Status</option>
            <option value="website">Website content</option>
          </select>
        </div>

        <div className="count-label">
          {logsLoaded ? filteredLogs.length + ' of ' + allLogs.length + ' entries' : ''}
        </div>

        <div className="table-scroll">
          <table>
            <colgroup>
              <col style={{ width: '15%' }} /><col style={{ width: '11%' }} /><col style={{ width: '24%' }} />
              <col style={{ width: '10%' }} /><col style={{ width: '14%' }} /><col style={{ width: '16%' }} /><col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr><th>Timestamp</th><th>SKU</th><th>Product</th><th>Change</th><th>Value</th><th>Reason</th><th>User</th></tr>
            </thead>
            <tbody id="log-body">
              {logError && (
                <tr><td colSpan="7" style={{ color: 'var(--red)' }}>{logError}</td></tr>
              )}
              {!logError && filteredLogs.map((log) => {
                const delta = Number(log.delta) || 0;
                const isPrice = log.field === 'price';
                const isContent = !!CONTENT_FIELD_META[log.field];
                const money = isPrice ? '₱' : '';
                const size = logSize(log.sku, allProducts);
                const deltaColor = delta > 0 ? 'var(--green)' : (delta < 0 ? 'var(--red)' : 'var(--muted)');
                const pillClass = isContent ? 'log-website' : 'log-' + log.field;
                const pillText = isContent ? 'web ' + CONTENT_FIELD_META[log.field].label.toLowerCase() : log.field;

                // Content values are free text (long, user-authored) — truncate
                // them so a pushed description can't blow up the table.
                const logValue = (v) => {
                  const s = String(v == null ? '' : v);
                  return s.length > 90 ? s.slice(0, 90) + '…' : s;
                };

                return (
                  <tr key={log.id}>
                    <td className="log-ts">{String(log.timestamp).replace('T', ' ')}</td>
                    <td>{log.sku}</td>
                    <td>
                      {log.product_name}
                      {size ? <> <span className="size-badge">{size}</span></> : null}
                    </td>
                    <td><span className={'log-field-pill ' + pillClass}>{pillText}</span></td>
                    <td>
                      <span style={{ color: 'var(--muted-dark)' }}>{money + logValue(log.old_value)}</span>
                      <span style={{ color: 'var(--muted)', margin: '0 5px' }}>→</span>
                      <strong>{money + logValue(log.new_value)}</strong>
                      {isPrice && (
                        <> <span className="log-delta" style={{ color: deltaColor }}>
                          {'(' + (delta > 0 ? '+' : '') + delta + ')'}
                        </span></>
                      )}
                    </td>
                    <td>
                      {log.reason || '—'}
                      {log.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{log.notes}</div>
                      )}
                    </td>
                    <td><span className="pill-muted">{log.user}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {logsLoaded && !logError && filteredLogs.length === 0 && (
          <div className="empty-state" style={{ marginTop: '12px' }}>
            {allLogs.length === 0 ? 'No catalog activity recorded yet.' : 'No entries match your filters.'}
          </div>
        )}
      </div>

      {/* ---- Right-side product detail panel (mirrors Inventory's) -------- */}
      <div className={'detail-panel' + (panelSku ? ' open' : '')} id="detail-panel">
        <div className="panel-header-row">
          <div className="panel-nav">
            <button
              type="button"
              className="panel-nav-btn"
              title="Previous (↑)"
              disabled={navIndex <= 0}
              onClick={() => navigatePanel(-1)}
            >
              ▲
            </button>
            <span className="panel-nav-pos">
              {navIndex === -1 ? '' : (navIndex + 1) + ' of ' + skuSequence.length}
            </span>
            <button
              type="button"
              className="panel-nav-btn"
              title="Next (↓)"
              disabled={navIndex === -1 || navIndex >= skuSequence.length - 1}
              onClick={() => navigatePanel(1)}
            >
              ▼
            </button>
          </div>
          <button type="button" className="close-btn" onClick={closeDetailPanel}>✕</button>
        </div>

        {panelRow && (
          <>
            <div className="panel-thumb">
              <img src={catImgUrl(panelRow)} alt={panelRow.name} />
            </div>
            <div className="sku-code">{panelRow.sku}</div>
            <div className="prod-name">
              {panelRow.name}
              {panelRow.size ? <span className="panel-size-badge">{panelRow.size}</span> : null}
            </div>
            <div className="prod-sub">
              {panelRow.category + (panelRow.size ? ' · Size ' + panelRow.size : '')}
            </div>

            <div className="stat-row">
              <div className="stat-box">
                <div className="stat-label">Price</div>
                <div className="stat-value" onClick={(event) => event.stopPropagation()}>
                  <PriceCell row={panelRow} pending={pendingFor(panelRow.sku, 'price')} onSave={savePrice} />
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Status</div>
                <div className="stat-value">
                  <StatusButton row={panelRow} pending={pendingFor(panelRow.sku, 'active')} onToggle={toggleActive} />
                </div>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-box">
                <div className="stat-label">Units Sold</div>
                <div className="stat-value">{(salesByProduct[panelRow.sku] || { units: 0 }).units}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Revenue</div>
                <div className="stat-value">
                  {'₱' + (salesByProduct[panelRow.sku] || { revenue: 0 }).revenue.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="stat-row">
              <div className="stat-box">
                <div className="stat-label">Stock Left</div>
                <div className="stat-value"><StockBadge row={panelRow} /></div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Order Allocated</div>
                <div className="stat-value">{Number(panelRow.order_allocated) || 0}</div>
              </div>
            </div>

            {/* Website View works per design — needs a product code to key content on. */}
            {panelRow.product_code && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', marginTop: '14px' }}
                onClick={() => openWebsiteView(panelRow.product_code)}
              >
                🌐 Product Page — preview &amp; edit content
              </button>
            )}
          </>
        )}
      </div>

      {/* ---- Website View: storefront-styled preview + content editor ----- */}
      {wvCode && (
        <WebsiteView
          code={wvCode}
          design={wvDesign}
          pendingFor={pendingFor}
          activeSlot={wvActiveSlot}
          onSelectSlot={setWvActiveSlot}
          editors={wvEditors}
          savingField={wvSavingField}
          onOpenEditor={openWvEditor}
          onChangeEditor={changeWvEditor}
          onQueueEditor={queueContentEdit}
          onCancelEditor={cancelWvEditor}
          onQueueAll={queueAllOpenEdits}
          queueAllBusy={wvQueueAllBusy}
          onReplacePhoto={beginPhotoUpload}
          onClose={() => { if (confirmDiscardEdits()) closeWebsiteView(); }}
          onOverlayClick={(event) => {
            if (event.target === event.currentTarget && confirmDiscardEdits()) closeWebsiteView();
          }}
        />
      )}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={onPhotoChosen}
      />

      {/* ---- Push Product: the queued-edit list (popup within the Catalog) - */}
      {pushOpen && (
        <div id="push-overlay" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-box push-modal-box">
            <div className="modal-title">🚀 Push Product — pending edits</div>
            <div className="modal-desc">
              Price and status edits from this Catalog, On Hand corrections from Inventory, and website
              content edits from the Website View all wait here.
              Everything below is applied automatically at <strong>12:00 AM (Asia/Manila)</strong>, or push it now.
              Re-editing the same field overwrites its pending row — last edit wins.
            </div>

            <div className="push-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th><th>Product</th><th>Field</th><th>Change</th>
                    <th>Edited By</th><th>Edited At</th><th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody id="push-body">
                  {pendingEdits.map((e) => {
                    const size = logSize(e.sku, allProducts);
                    return (
                      <tr key={e.id}>
                        <td className="cat-sku">
                          {e.sku}
                          {size ? <> <span className="size-badge">{size}</span></> : null}
                        </td>
                        <td className="cat-name">{e.product_name || ''}</td>
                        <td><span className={'push-field-pill ' + pushFieldClass(e.field)}>{PUSH_FIELD_LABELS[e.field] || e.field}</span></td>
                        <td>
                          <span style={{ color: 'var(--muted-dark)' }}>{formatPendingValue(e.field, e.old_value)}</span>
                          <span style={{ color: 'var(--muted)', margin: '0 5px' }}>→</span>
                          <strong>{formatPendingValue(e.field, e.new_value)}</strong>
                          {e.reason && (
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                              {e.reason + (e.notes ? ' — ' + e.notes : '')}
                            </div>
                          )}
                        </td>
                        <td><span className="pill-muted">{e.edited_by}</span></td>
                        <td className="log-ts">{String(e.edited_at)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button type="button" className="push-row-btn" onClick={() => forcePushOne(e)}>⚡ Push now</button>
                          <button
                            type="button"
                            className="push-row-btn danger"
                            style={{ marginLeft: '6px' }}
                            onClick={() => discardOne(e)}
                          >
                            ✕ Discard
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pendingEdits.length === 0 && (
                <div className="push-empty">No pending edits — everything is live.</div>
              )}
            </div>

            <div className="push-note">
              Order-driven stock movement (reservations, cancellations, shipments) and storefront syncs
              never queue here — those always write to Inventory immediately.
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary btn-flex"
                disabled={pendingEdits.length === 0 || pushAllBusy}
                onClick={forcePushAll}
              >
                ⚡ Force Push All
              </button>
              <button type="button" className="btn btn-outline btn-flex" onClick={() => setPushOpen(false)}>Close</button>
            </div>
            <div style={{ fontSize: '11.5px', marginTop: '8px', color: pushMessage.isError ? 'var(--red)' : 'var(--muted-dark)' }}>
              {pushMessage.text}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

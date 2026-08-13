// Canonical apparel size ordering: SMALL → MEDIUM → LARGE → XL → 2XL → 3XL.
//
// Straight port of js/size-order.js — same sequence, same aliases, same unknown
// handling. Only the UMD wrapper is gone (it existed so the browser could load
// it as a <script> and routes/inventory.js could require() it); ES module
// exports replace it.
//
// Shared by the Inventory gallery, the Product Catalog and the Excel export.
// Single source of truth instead of the four copies that used to live in each
// page and drift apart.
//
// Those copies were keyed only on single letters (S/M/L) while the inventory
// actually stores full words ("MEDIUM", "LARGE"). Full words missed the map and
// fell into the unknown bucket, so a design's sizes came out ordered
// XL, 2XL, LARGE, MEDIUM instead of MEDIUM, LARGE, XL, 2XL. Both spellings fold
// onto the same rank, so mixed data sorts correctly either way.

export const SIZE_SEQUENCE = ['XS', 'SMALL', 'MEDIUM', 'LARGE', 'XL', '2XL', '3XL', '4XL', '5XL'];

const ALIASES = {
  XS: 'XS', XSMALL: 'XS', 'EXTRA SMALL': 'XS',
  S: 'SMALL', SM: 'SMALL', SMALL: 'SMALL',
  M: 'MEDIUM', MED: 'MEDIUM', MEDIUM: 'MEDIUM',
  L: 'LARGE', LG: 'LARGE', LARGE: 'LARGE',
  XL: 'XL', XLARGE: 'XL', 'EXTRA LARGE': 'XL',
  '2XL': '2XL', XXL: '2XL', '2X': '2XL',
  '3XL': '3XL', XXXL: '3XL', '3X': '3XL',
  '4XL': '4XL', XXXXL: '4XL', '4X': '4XL',
  '5XL': '5XL', '5X': '5XL',
};

// Anything unrecognised or blank sorts after every known size, so an odd value
// stays visible at the bottom of a design instead of being silently shuffled
// into the middle of the real sizes.
const UNKNOWN_RANK = SIZE_SEQUENCE.length + 1;

function normalize(raw) {
  return String(raw == null ? '' : raw)
    .toUpperCase()
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sizeRank(raw) {
  const key = normalize(raw);
  if (!key || key === '—') return UNKNOWN_RANK;
  const canonical = ALIASES[key];
  return canonical ? SIZE_SEQUENCE.indexOf(canonical) : UNKNOWN_RANK;
}

export function compareSizes(a, b) {
  const ra = sizeRank(a);
  const rb = sizeRank(b);
  if (ra !== rb) return ra - rb;
  // Same rank (identical size, or two unrecognised values) — fall back to
  // alphabetical so the order is at least stable across reloads.
  return normalize(a).localeCompare(normalize(b));
}

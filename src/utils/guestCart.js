import { productApi } from "../api/productApi";

/**
 * The signed-out cart. Lives entirely in localStorage under the key and shape
 * SignIn.jsx already merges from — {'slug|size': qty} — because that merge is the
 * only thing that carries a guest's cart onto their account. Change either and the
 * merge silently posts nothing.
 */
export const GUEST_CART_KEY = "reefer-cart";

// POST /v1/cart/merge validates items max:50 and qty 1..99. Enforced on the way IN
// so a cart that fits in storage always fits through the merge.
const MAX_LINES = 50;
const MAX_QTY = 99;

// number_format() with no decimals, same as the server's ₱ strings.
const peso = (n) => "₱" + (Math.round(Number(n)) || 0).toLocaleString("en-PH");

/** The zero state, in the shape every consumer of the cart already expects. */
export const EMPTY_CART = {
  items: [],
  count: 0,
  subtotal: 0,
  subtotal_formatted: "₱0",
  selected_count: 0,
  selected_subtotal: 0,
  selected_subtotal_formatted: "₱0",
  all_selected: false,
};

/**
 * Rejections shaped like the axios interceptor's, so a caller cannot tell a guest
 * failure from a server one — ProductDetail reads err.errors, both tiles read
 * err.message, and neither should grow a special case.
 */
function reject(field, message) {
  throw { status: 422, message, errors: { [field]: [message] }, response: null };
}

function write(map) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(map));
  } catch {
    // Quota or private mode. The map is still returned, so the add works for this
    // page view — it just won't survive a reload.
  }
  return map;
}

/** The stored map, minus anything add() could not have written. */
export function read() {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "{}") || {};
  } catch {
    return {};
  }
  const map = {};
  for (const key of Object.keys(raw)) {
    const [slug, size] = key.split("|");
    const qty = Math.trunc(Number(raw[key]));
    if (!slug || !size || !(qty > 0)) continue;
    map[key] = Math.min(qty, MAX_QTY);
  }
  return map;
}

/**
 * Add a variant, or bump it if it is already there. `catalog` is the index from
 * loadCatalog(); the stock and availability checks mirror CartController's so a
 * guest reads the same sentence they would after signing in.
 */
export function add(slug, size, qty = 1, catalog = {}) {
  const product = catalog[slug];
  if (!product) reject("slug", "This product is no longer available.");

  const variant = (product.variants || []).find((v) => v.size === size);
  if (!variant) reject("size", `Size ${size} is not available for ${product.name}.`);

  const map = read();
  const key = `${slug}|${size}`;
  const next = Math.min((map[key] || 0) + Math.max(1, Math.trunc(qty) || 1), MAX_QTY);

  // Adding 2 to an existing 3 is checked as 5, not as 2 — same as the server.
  if (next > variant.stock) {
    reject("qty", variant.stock > 0 ? `Only ${variant.stock} left in that size.` : "That size is sold out.");
  }
  if (map[key] === undefined && Object.keys(map).length >= MAX_LINES) {
    reject("items", `That's ${MAX_LINES} different lines — check out or remove one first.`);
  }

  map[key] = next;
  return write(map);
}

/** qty 0 removes the line, which is what "−" on the last unit means. */
export function updateQty(key, qty, catalog = {}) {
  const map = read();
  if (map[key] === undefined) return map;

  const next = Math.min(Math.max(0, Math.trunc(Number(qty)) || 0), MAX_QTY);
  if (next === 0) {
    delete map[key];
    return write(map);
  }

  const [slug, size] = key.split("|");
  const variant = (catalog[slug]?.variants || []).find((v) => v.size === size);
  if (variant && next > variant.stock) {
    reject("qty", variant.stock > 0 ? `Only ${variant.stock} left in that size.` : "That size is sold out.");
  }

  map[key] = next;
  return write(map);
}

export function remove(key) {
  const map = read();
  delete map[key];
  return write(map);
}

/**
 * Drop lines the catalog no longer sells — pulled products, retired sizes.
 *
 * Not merely cosmetic: POST /v1/cart/merge rejects the WHOLE batch if one slug or
 * size no longer resolves, so a single dead line left sitting here would strand the
 * entire cart at sign-in. Storage and the rendered cart have to agree on what is
 * still real.
 */
export function prune(catalog = {}) {
  const map = read();
  // An empty index means the fetch went wrong, not that the shop closed — and
  // deleting a cart on that reading is unrecoverable. Treat it as no information.
  if (!Object.keys(catalog).length) return map;

  let dropped = false;

  for (const key of Object.keys(map)) {
    const [slug, size] = key.split("|");
    if ((catalog[slug]?.variants || []).some((v) => v.size === size)) continue;
    delete map[key];
    dropped = true;
  }

  return dropped ? write(map) : map;
}

export function clear() {
  return write({});
}

let catalogPromise = null;

async function fetchCatalog() {
  const index = {};
  // One page covers today's catalog, but a line whose product sat on page 2 would
  // vanish from the cart rather than merely be mispriced — so follow the pages.
  for (let page = 1; page <= 5; page++) {
    const res = await productApi.list({ per_page: 60, page });
    for (const product of res.data || []) index[product.slug] = product;
    if (!res.meta || res.meta.current_page >= res.meta.last_page) break;
  }
  return index;
}

/**
 * slug → product. Names, prices and stock are deliberately NOT in localStorage —
 * storing a price client-side is storing a price anyone can edit — so they are
 * joined back on from the catalog. Display only: checkout re-prices everything
 * from the server anyway.
 *
 * Memoised for the session (the qty stepper must not refetch per tap). A failure
 * is not cached, so the next call retries.
 */
export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetchCatalog().catch((err) => {
      catalogPromise = null;
      throw err;
    });
  }
  return catalogPromise;
}

/** The stored map as the exact object CartContext exposes for a server cart. */
export function toCartShape(map, catalog = {}) {
  const items = [];

  for (const key of Object.keys(map)) {
    const [slug, size] = key.split("|");
    const product = catalog[slug];
    // Pulled from the catalog while it sat here. CartResource drops these lines
    // from a real cart for the same reason: better gone than priced at ₱0.
    if (!product) continue;

    const qty = map[key];
    const unit = Number(product.price) || 0;
    const variant = (product.variants || []).find((v) => v.size === size);
    const stock = variant ? Number(variant.stock) || 0 : 0;

    items.push({
      // No server id until the merge writes one. The storage key is stable and
      // unique, which is all React keys and the per-line handlers ever needed.
      id: key,
      selected: true,
      key,
      slug,
      size,
      name: product.name,
      qty,
      unit_price: unit,
      unit_price_formatted: peso(unit),
      line_total: unit * qty,
      line_total_formatted: peso(unit * qty),
      image: product.image || null,
      stock,
      in_stock: stock > 0,
      exceeds_stock: qty > stock,
    });
  }

  const count = items.reduce((n, i) => n + i.qty, 0);
  const subtotal = items.reduce((n, i) => n + i.line_total, 0);

  return {
    items,
    count,
    subtotal,
    subtotal_formatted: peso(subtotal),
    // Selection is save-for-later, and there is no account to save to yet, so
    // everything a guest holds is up for checkout.
    selected_count: count,
    selected_subtotal: subtotal,
    selected_subtotal_formatted: peso(subtotal),
    all_selected: items.length > 0,
  };
}

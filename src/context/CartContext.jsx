import { createContext, useState, useEffect, useCallback } from "react";
import { cartApi } from "../api/cartApi";
import * as guestCart from "../utils/guestCart";
import { useAuth } from "../hooks/useAuth";

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(null);

// Shared with the guest cart rather than declared twice: the two have to agree on
// the zero state field-for-field or a consumer would need to know which it holds.
const EMPTY = guestCart.EMPTY_CART;

// An add interrupted by the sign-in wall. Short-lived on purpose: resuming should
// feel like finishing what you just started, not an item appearing out of a
// session you forgot about.
const PENDING_KEY = "reefer-pending-add";
const PENDING_TTL_MS = 10 * 60 * 1000;

/** Read the stashed add and clear it in the same breath — it must never replay twice. */
function takePendingAdd() {
  let raw = null;
  try {
    raw = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch {
    return null; // private mode / storage disabled
  }
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw);
    const slug = pending?.slug || pending?.id;
    if (!slug || !pending.at || Date.now() - pending.at > PENDING_TTL_MS) return null;
    return { slug, size: pending.size || null, qty: pending.qty || 1 };
  } catch {
    return null;
  }
}

/**
 * The signed-out branch's one round trip: catalog first, then apply, prune, shape.
 *
 * Catalog BEFORE the write, deliberately. If it can't be reached the mutation
 * fails clean instead of leaving a line in localStorage the shopper was never
 * shown — which is exactly how a failed POST /cart/items behaves.
 */
async function guestShape(apply = () => {}) {
  const catalog = await guestCart.loadCatalog();
  apply(catalog);
  return guestCart.toCartShape(guestCart.prune(catalog), catalog);
}

// The cart, from whichever side of the sign-in wall the visitor is on. Signed in
// the server owns it; signed out localStorage does, in the same shape — so no
// consumer below this file knows the difference.
export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const authed = !!user;
  const [cart, setCart] = useState(EMPTY);
  // Starts true: a stored token is verified before we know which cart to load, and
  // flashing an empty one over a full one reads as "your cart was wiped".
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    // The /me round trip is still out. Committing to either branch now is a coin
    // flip, and guessing "guest" strands the load in localStorage.
    if (authLoading) return;

    if (!authed) {
      // Nothing stored — no reason to pull the catalog just to render "nothing here".
      if (!Object.keys(guestCart.read()).length) {
        setCart(EMPTY);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        setCart(await guestShape());
        setError(null);
      } catch (err) {
        setError(err?.message || "Could not load your cart. Refresh to try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      let fresh = await cartApi.get();
      // The sign-in wall interrupted an add — finish it now instead of making the
      // shopper hunt the product down again. Done here rather than in its own
      // effect so the reply can't be overwritten by a refresh landing after it.
      const pending = takePendingAdd();
      if (pending) {
        try {
          fresh = await cartApi.addItem(pending.slug, pending.size, pending.qty);
        } catch {
          // Sold out, size gone — the cart we already have is still correct.
        }
      }
      setCart(fresh);
      setError(null);
    } catch (err) {
      // A dead token means "signed out", not "empty cart". Anything else is a
      // failure the shopper has to see rather than a cart that looks emptied.
      if (err?.status === 401) setCart(EMPTY);
      else setError(err?.message || "Could not load your cart. Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, [authed, authLoading]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Every mutation reports failure through `error` so a page can show it, and
   * still rethrows so a caller mid-flow (add-to-cart on the PDP) can stop.
   * The axios interceptor rejects with a plain object, so read err.message.
   */
  const mutate = async (call, fallback) => {
    setError(null);
    try {
      setCart(await call());
    } catch (err) {
      setError(err?.message || fallback);
      throw err;
    }
  };

  // The only place the two carts differ. Both halves resolve to the same shape, so
  // the methods below — and every caller of them — are branch-free. `id` is the
  // server's cart-item id when signed in and the 'slug|size' storage key when not;
  // either way it is whatever the line's own `id` field said.
  const store = authed
    ? {
        add: (slug, size, qty) => cartApi.addItem(slug, size, qty),
        updateQty: (id, qty) => cartApi.updateItem(id, qty),
        remove: (id) => cartApi.removeItem(id),
        clear: () => cartApi.clear(),
        selectItem: (id, selected) => cartApi.selectItem(id, selected),
        selectAll: (selected) => cartApi.selectAll(selected),
      }
    : {
        add: (slug, size, qty) => guestShape((c) => guestCart.add(slug, size, qty, c)),
        updateQty: (key, qty) => guestShape((c) => guestCart.updateQty(key, qty, c)),
        remove: (key) => guestShape(() => guestCart.remove(key)),
        clear: () => guestShape(() => guestCart.clear()),
        // Unticking is save-for-later and there is no account to save to yet, so a
        // guest's lines are all selected. Still round-trips the shape rather than
        // returning nothing, so the caller's contract holds.
        selectItem: () => guestShape(),
        selectAll: () => guestShape(),
      };

  const add = (slug, size, qty = 1) => mutate(() => store.add(slug, size, qty), "Could not add that item.");
  const updateQty = (id, qty) => mutate(() => store.updateQty(id, qty), "Could not update that item.");
  const remove = (id) => mutate(() => store.remove(id), "Could not remove that item.");
  const clear = () => mutate(() => store.clear(), "Could not empty your cart.");
  const selectItem = (id, selected) => mutate(() => store.selectItem(id, selected), "Could not update that item.");
  const selectAll = (selected) => mutate(() => store.selectAll(selected), "Could not update your cart.");

  /** Stash an add that the sign-in wall is about to interrupt; refresh replays it. */
  const rememberAdd = (slug, size, qty = 1) => {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ slug, size, qty, at: Date.now() }));
    } catch {
      // Quota or private mode — a lost pending add is not worth throwing over.
    }
  };

  const clearError = () => setError(null);

  return (
    <CartContext.Provider
      value={{
        ...cart,
        loading,
        authed,
        // Exposed so an add-to-cart button can hold off while a stored token is
        // still being verified, instead of writing a signed-in shopper's pick into
        // the guest cart where only the next sign-in would find it.
        authLoading,
        error,
        clearError,
        add,
        updateQty,
        remove,
        clear,
        selectItem,
        selectAll,
        rememberAdd,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

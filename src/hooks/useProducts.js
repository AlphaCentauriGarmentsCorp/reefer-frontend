import { useEffect, useRef, useState } from "react";
import { productApi } from "../api/productApi";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Fetch products (with optional filter/paging params: audience, type, size, tag,
 * search, sort, per_page, page). Owns loading/error state.
 *
 * `meta` carries the paginator (current_page / last_page / total) so a caller can
 * page or show a total without re-reading the raw response.
 *
 * `searching` is true while a freshly typed `search` is still waiting out the
 * debounce, so a caller can say so instead of showing the previous term's hits
 * as if they were final.
 */
export function useProducts(params = {}, { debounceMs = SEARCH_DEBOUNCE_MS } = {}) {
  const { search = "", ...filters } = params;
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState({ meta: null, links: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Only the free-text term is debounced — a chip or checkbox is one deliberate
  // click and should re-query at once. Seeded from `search` so a shared
  // ?search= link still fetches its results on the first render.
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  const request = { ...filters, ...(debounced && { search: debounced }) };
  const key = JSON.stringify(request);

  // Responses can land out of order — a broad term's slow query can resolve after
  // the narrower one the shopper has since typed. Only the newest request may
  // write state; the cleanup bumps the counter so an unmount invalidates too.
  const reqId = useRef(0);

  useEffect(() => {
    const mine = ++reqId.current;
    const current = () => mine === reqId.current;
    setLoading(true);
    setError(null);
    productApi
      .list(request)
      .then((res) => {
        if (!current()) return;
        setProducts(res.data ?? []);
        setPage({ meta: res.meta ?? null, links: res.links ?? null });
      })
      .catch((err) => current() && setError(err))
      .finally(() => current() && setLoading(false));
    return () => {
      reqId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    products,
    meta: page.meta,
    links: page.links,
    loading,
    error,
    searching: search !== debounced,
  };
}

/** Fetch a single product by slug. `notFound` is true on a 404. */
export function useProduct(slug) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    setError(null);
    productApi
      .get(slug)
      .then((res) => alive && setProduct(res.data ?? null))
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  return { product, loading, error, notFound: error?.status === 404 };
}

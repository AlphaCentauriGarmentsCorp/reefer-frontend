import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BRAND = "REEFER MNL";

/** "Shop everything" -> "Shop everything — REEFER MNL". */
// eslint-disable-next-line react-refresh/only-export-components
export const withBrand = (label) => `${label} — ${BRAND}`;

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Per-route <title> + description. The server stamps these into the shell for the
 * first hit (that's what crawlers read); nothing reloads after that, so without
 * this every tab title and history entry would keep whatever landed first.
 *
 * Deliberately restores nothing on unmount — the route arriving next sets its own,
 * and a restore would just flash the old title in between.
 */
export default function Seo({ title, description }) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (title) {
      document.title = title;
      setMeta("property", "og:title", title);
    }
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }
    setMeta("property", "og:url", window.location.href);
  }, [title, description, pathname, search]);

  return null;
}

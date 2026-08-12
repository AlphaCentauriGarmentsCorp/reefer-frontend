import { useCallback, useEffect, useRef, useState } from "react";
import { configApi } from "../api/configApi";

const GSI_SRC = "https://accounts.google.com/gsi/client";
const LOAD_TIMEOUT_MS = 10000;

// Google's widget only takes a pixel width and refuses anything outside this band.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

// Module scope, not component scope: React StrictMode runs every effect twice in
// dev and the page can be revisited, but the GIS script must be injected exactly
// once — a second copy re-registers window.google and orphans the first.
let scriptPromise = null;
let configPromise = null;

function loadConfig() {
  if (!configPromise) {
    configPromise = configApi.get().catch((err) => {
      configPromise = null; // one bad response must not kill the button for the whole session
      throw err;
    });
  }
  return configPromise;
}

function loadGsi() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
        return;
      }

      const existing = document.querySelector("script[data-reefer-gsi]");
      const script = existing || document.createElement("script");
      const timer = setTimeout(() => fail(new Error("Google sign-in took too long to load")), LOAD_TIMEOUT_MS);

      function cleanup() {
        clearTimeout(timer);
        script.removeEventListener("load", settle);
        script.removeEventListener("error", onError);
      }
      function settle() {
        cleanup();
        if (window.google?.accounts?.id) resolve(window.google.accounts.id);
        else fail(new Error("Google sign-in is unavailable"));
      }
      function onError() {
        fail(new Error("Google sign-in could not be loaded"));
      }
      function fail(err) {
        cleanup();
        // A dead <script> never fires again, so leaving it would make every retry
        // attach listeners to a tag that can no longer resolve.
        script.remove();
        reject(err);
      }

      script.addEventListener("load", settle);
      script.addEventListener("error", onError);
      if (!existing) {
        script.src = GSI_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.reeferGsi = "1";
        document.head.appendChild(script);
      }
    });
    scriptPromise.catch(() => {
      scriptPromise = null;
    });
  }
  return scriptPromise;
}

/**
 * "Continue with Google" via Google Identity Services, ID-token flow.
 *
 * Renders Google's own button into `containerRef` rather than driving a button of
 * ours through google.accounts.id.prompt(): prompt() is One Tap, which silently
 * shows nothing when the visitor has no Google session or has dismissed it before
 * (it enters a cooldown), and under FedCM there is no longer a reliable way to
 * detect that it didn't appear. A sign-in button that sometimes does nothing at
 * all is a worse failure than one we cannot restyle, so the page frames Google's
 * button in Reefer chrome instead of redrawing it.
 *
 * `onCredential` receives the raw ID token string; nothing else about the visitor
 * is trustworthy on this side, so nothing else is handed over.
 *
 * - notConfigured: the deployment has no client id. Render nothing.
 * - configured:    a client id exists, so reserving space for the button is safe.
 * - ready:         GIS is loaded and initialized; the button is being drawn.
 * - error:         config or script load failed. Render nothing; the password form
 *                  still works and a broken box would only be noise.
 */
export function useGoogleSignIn({ onCredential, onError } = {}) {
  // A callback ref rather than a ref object: the host element is a dependency of
  // the draw below, and a ref object would not re-run it if the container ever
  // unmounts and comes back.
  const [host, setHost] = useState(null);
  const containerRef = useCallback((node) => setHost(node), []);

  const [clientId, setClientId] = useState(null);
  const [ready, setReady] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState(null);

  // GIS keeps whatever callback initialize() was given, so it must not close over
  // a stale render. Same trick the sign-in page uses for its finish handler.
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const reportError = useRef(onError);
  reportError.current = onError;

  useEffect(() => {
    let alive = true;

    loadConfig()
      .then((cfg) => {
        if (!alive) return undefined;
        const id = cfg?.google_client_id || null;
        if (!id) {
          setNotConfigured(true);
          return undefined;
        }
        setClientId(id);
        return loadGsi().then((gsi) => {
          if (!alive) return;
          gsi.initialize({
            client_id: id,
            callback: (res) => {
              if (res?.credential) handler.current?.(res.credential);
            },
            auto_select: false, // signing in is a deliberate act, never something that happens on load
            cancel_on_tap_outside: true,
            ux_mode: "popup",
            // The chooser lives in Google's popup, so a blocked or abandoned one
            // is the only way this flow can end without a callback. Without this
            // the page would just sit there looking like it was still working.
            error_callback: (err) => {
              if (err?.type === "popup_closed") return; // a plain cancel, not a failure
              reportError.current?.(
                err?.type === "popup_failed_to_open"
                  ? "Your browser blocked the Google window. Allow pop-ups for this site, or use your email and password."
                  : "Google sign-in couldn't start. Try again, or use your email and password."
              );
            },
          });
          setReady(true);
        });
      })
      .catch((err) => {
        if (alive) setError(err?.message || "Google sign-in is unavailable");
      });

    return () => {
      alive = false;
      // Closes a chooser still open when the page unmounts mid-flow, so a late
      // credential cannot arrive for a screen that no longer exists.
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* GIS never loaded */
      }
    };
  }, []);

  useEffect(() => {
    if (!ready || !host) return undefined;

    const draw = () => {
      const width = Math.round(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, host.clientWidth || MAX_WIDTH)));
      host.replaceChildren(); // renderButton appends, so a redraw would stack copies
      window.google.accounts.id.renderButton(host, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width,
      });
    };

    try {
      draw();
    } catch (err) {
      setError(err?.message || "Google sign-in is unavailable");
      return undefined;
    }

    // The widget is drawn at a fixed pixel width, so it has to be redrawn when the
    // card reflows or it stops lining up with the form beneath it. Width only —
    // reacting to the height it sets itself would loop.
    let frame = 0;
    let last = host.clientWidth;
    const observer = new ResizeObserver(() => {
      const next = host.clientWidth;
      if (Math.abs(next - last) < 2) return;
      last = next;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    });
    observer.observe(host);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.replaceChildren();
    };
  }, [ready, host]);

  return { ready, configured: clientId !== null, notConfigured, error, containerRef };
}

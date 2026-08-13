// Port of js/sync-status.js.
//
// Compact live-sync indicator — replaces the old full-width green
// "Connected — live data…" banner on the main screens. The wide banner sat
// above the fold and competed with the Critical Alerts below it; this is a
// small blue dot + "last synced Xs ago" line instead, with a red dot +
// "Reconnecting…" (and an automatic retry) when the feed drops.
//
// The original took a DOM node and wrote innerHTML into it. Same state machine,
// same wording, same 5s tick and same 10s retry — expressed as a hook, with the
// markup living in <SyncLine> (src/components/SyncLine.jsx).
//
// Usage:
//   const sync = useSyncStatus({ retry: loadData });
//   ...
//   <SyncLine sync={sync} />
//   sync.ok("42 orders loaded");   // on success
//   sync.error(err.message);       // on failure — retries opts.retry in 10s

import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 5000;
const RETRY_MS = 10000;

function agoText(lastOk) {
  const s = Math.max(0, Math.round((Date.now() - lastOk) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  return Math.floor(s / 60) + 'm ago';
}

export function useSyncStatus(options) {
  const opts = options || {};

  // The retry callback is usually a component-scoped loader that changes
  // identity on every render; a ref keeps the scheduled retry pointed at the
  // current one without restarting the timer each time.
  const retryRef = useRef(opts.retry);
  useEffect(() => {
    retryRef.current = opts.retry;
  }, [opts.retry]);

  const [state, setState] = useState('loading'); // 'loading' | 'ok' | 'err'
  const [detail, setDetail] = useState('');
  const [message, setMessage] = useState('');
  const [lastOk, setLastOk] = useState(null);

  // Re-render every 5s while connected so "last synced Xs ago" keeps counting.
  const [, setTick] = useState(0);
  const retryTimer = useRef(null);

  useEffect(() => {
    if (state !== 'ok') return undefined;
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => () => clearTimeout(retryTimer.current), []);

  const ok = useCallback((detailText) => {
    clearTimeout(retryTimer.current);
    setState('ok');
    setDetail(detailText || '');
    setLastOk(Date.now());
  }, []);

  const error = useCallback((errorMessage) => {
    setState('err');
    setMessage(errorMessage || '');
    clearTimeout(retryTimer.current);
    if (retryRef.current) {
      retryTimer.current = setTimeout(() => {
        if (retryRef.current) retryRef.current();
      }, RETRY_MS);
    }
  }, []);

  let text;
  if (state === 'ok') {
    text = 'Live' + (detail ? ' · ' + detail : '') + ' · last synced ' + agoText(lastOk);
  } else if (state === 'err') {
    text = 'Reconnecting…' + (message ? ' (' + message + ')' : '');
  } else {
    text = 'Connecting…';
  }

  return { state, isError: state === 'err', text, ok, error };
}

export default useSyncStatus;

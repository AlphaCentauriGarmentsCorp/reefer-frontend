// Port of public/scan.html — the Scan Station.
//
// A tablet page for the warehouse floor: point the camera at a waybill's QR
// code, or fire a handheld scanner / type an Order ID into the input and press
// Enter. Either way one scan advances that order one step in its lifecycle.
//
// Endpoints (unchanged): GET /api/orders, PUT /api/orders/{orderId}.
//
// Two things about this page differ from the rest of the port and are called
// out in the report:
//   1. scan.html linked no theme.css and had no sidebar — see Scan.css.
//   2. jsQR came from a CDN <script> in <head>. There is no npm dependency for
//      it in this project yet and package.json is shared, so the same CDN build
//      is loaded on demand below; loadJsQr() is the direct stand-in for that
//      tag, and it keeps the original's "library failed to load" branch live.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import client from '../api/client';
import './Scan.css';

const NEXT_STATUS = {
  in_process: 'to_pickup',
  to_pickup: 'shipped',
  shipped: 'completed',
};

const STATUS_LABELS = {
  new: 'New',
  in_process: 'In Process',
  to_pickup: 'To Pickup',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Neutral wording on purpose: this station doesn't know which courier an order
// actually has, and naming one it doesn't (the old hardcoded J&T) put words in
// the record that the orders page then contradicted.
const COURIER_NOTE = {
  to_pickup: ' — flagged for courier pickup',
  shipped: ' — handed to the courier',
  completed: ' — delivered',
};

// The exact build scan.html pulled in with
// <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>.
const JSQR_SRC = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

// Module-level so a second visit to /scan reuses the already-loaded library
// instead of appending another <script>.
let jsQrPromise = null;

function loadJsQr() {
  if (typeof window.jsQR === 'function') return Promise.resolve(window.jsQR);
  if (jsQrPromise) return jsQrPromise;

  jsQrPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSQR_SRC;
    script.async = true;
    script.onload = () => resolve(window.jsQR);
    script.onerror = () => {
      // Let a later Start Camera press retry rather than caching the failure.
      jsQrPromise = null;
      script.remove();
      reject(new Error('jsQR failed to load'));
    };
    document.head.appendChild(script);
  });

  return jsQrPromise;
}

export default function Scan() {
  const [scanValue, setScanValue] = useState('');
  // The old page drove one <div id="feedback"> by assigning className and
  // textContent; the same two values as state.
  const [feedback, setFeedback] = useState({ className: 'fb-idle', text: 'Ready.' });

  const [cameraOn, setCameraOn] = useState(false);
  const [camStatus, setCamStatus] = useState({ text: '', isError: false });
  const [flash, setFlash] = useState(null);

  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const streamRef = useRef(null);
  const scanningRef = useRef(false);
  const rafRef = useRef(null);
  // Edge-triggered: only fire once per code, and only fire again once the code
  // has left the frame. Simpler and more correct than a time-based cooldown — a
  // handheld QR scanner never "double reads" a label just because it's held in
  // place a moment too long, and the camera shouldn't either.
  const lastCodeRef = useRef(null);

  const flashFrameRef = useRef(null);
  const flashTimerRef = useRef(null);

  // showSuccess/showError also return the class they set. The original read it
  // straight back off the DOM (`feedback.className.indexOf("fb-success")`) to
  // decide the camera flash colour; React state isn't readable that soon after
  // setting it, so the value is returned up the call chain instead.
  const showSuccess = useCallback((message) => {
    setFeedback({ className: 'fb-success', text: '✓ ' + message });
    if (inputRef.current) inputRef.current.focus();
    return 'fb-success';
  }, []);

  const showError = useCallback((message) => {
    setFeedback({ className: 'fb-error', text: '✕ ' + message });
    if (inputRef.current) inputRef.current.focus();
    return 'fb-error';
  }, []);

  const processScan = useCallback(
    async (orderId) => {
      setFeedback({ className: '', text: 'Looking up ' + orderId + '...' });

      try {
        const response = await client.get('/orders');
        const orders = Array.isArray(response.data) ? response.data : [];
        const order = orders.find((o) => o.order_id === orderId);

        if (!order) {
          return showError('Order not found: ' + orderId);
        }

        const nextStatus = NEXT_STATUS[order.status];

        if (!nextStatus) {
          if (order.status === 'new') {
            return showError(orderId + " hasn't been printed yet. Print its waybill first.");
          }
          return showError(
            orderId +
              ' is already ' +
              (STATUS_LABELS[order.status] || order.status) +
              ' — nothing to advance.',
          );
        }

        try {
          await client.put('/orders/' + orderId, { status: nextStatus });
        } catch (err) {
          // The original checked `putResponse.ok` and threw this exact generic
          // message rather than surfacing the API's own error text; a request
          // that never reached the server (status 0) still reports its own
          // message, as the old fetch rejection did.
          throw new Error(
            err.status ? 'Server responded with status ' + err.status : err.message,
          );
        }

        return showSuccess(
          orderId + ' → ' + STATUS_LABELS[nextStatus] + (COURIER_NOTE[nextStatus] || ''),
        );
      } catch (err) {
        return showError('Scan failed: ' + err.message);
      }
    },
    [showError, showSuccess],
  );

  function handleKeyDown(event) {
    if (event.key !== 'Enter') return;

    // Read then clear unconditionally, exactly as the original did — a
    // hardware scanner types the code and sends Enter, so the field has to be
    // empty again before the next label.
    const orderId = scanValue.trim();
    setScanValue('');
    if (!orderId) return;

    processScan(orderId);
  }

  // ---- Camera-based QR scanning ----------------------------------------
  // Waybill QR codes just encode the plain order_id text (see the Orders page,
  // `new QRCode(container, { text: row.order_id, ... })`), so decoding one is
  // exactly the same as typing that order_id into the input above.

  const showCamError = useCallback((message) => {
    setCamStatus({ text: message, isError: true });
  }, []);

  const flashVideo = useCallback((kind) => {
    if (flashFrameRef.current) cancelAnimationFrame(flashFrameRef.current);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);

    // Drop the class, let the browser paint once, then re-add it. This is the
    // `void videoWrap.offsetWidth` reflow from the original: without the gap,
    // reapplying the same class back-to-back never restarts the transition.
    setFlash(null);
    flashFrameRef.current = requestAnimationFrame(() => {
      flashFrameRef.current = null;
      setFlash(kind === 'ok' ? 'flash-ok' : 'flash-err');
      flashTimerRef.current = setTimeout(() => {
        flashTimerRef.current = null;
        setFlash(null);
      }, 700);
    });
  }, []);

  const handleCameraDetection = useCallback(
    async (text) => {
      const result = await processScan(text);
      flashVideo(result === 'fb-success' ? 'ok' : 'err');
    },
    [flashVideo, processScan],
  );

  const tick = useCallback(() => {
    if (!scanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext('2d', { willReadFrequently: true });
      }
      const ctx = ctxRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        const text = code.data.trim();
        if (text && text !== lastCodeRef.current) {
          lastCodeRef.current = text;
          handleCameraDetection(text);
        }
      } else {
        lastCodeRef.current = null; // QR left the frame — arm for the next read
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [handleCameraDetection]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    setCameraOn(false);
    setCamStatus({ text: '', isError: false });
  }, []);

  const startCamera = useCallback(async () => {
    // Stands in for the CDN <script> in scan.html's <head>: if it never loads,
    // window.jsQR is undefined and the same message appears.
    try {
      await loadJsQr();
    } catch {
      // Reported by the guard immediately below, same as the original.
    }

    if (typeof window.jsQR !== 'function') {
      showCamError('QR scanning library failed to load (offline?). Use the input field below instead.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCamError(
        "Camera isn't available here — most browsers only allow camera access over HTTPS or on localhost, not over a plain http://<LAN-IP> address. Use the input field below instead.",
      );
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch (err) {
      showCamError(
        'Camera access failed: ' + (err.message || err.name || 'unknown error') + '. Use the input field below instead.',
      );
      return;
    }

    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) {
      // Left the page between pressing the button and the permission prompt
      // resolving — don't hold the camera open. (The static page had no way to
      // unmount mid-request, so this case is new to the SPA.)
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }

    video.srcObject = stream;
    await video.play();

    setCameraOn(true);
    setCamStatus({ text: "Point the camera at the waybill's QR code.", isError: false });

    lastCodeRef.current = null;
    scanningRef.current = true;
    rafRef.current = requestAnimationFrame(tick);
  }, [showCamError, tick]);

  // `input.focus()` on the last line of the old inline script, plus the eager
  // <script src> for jsQR so the first Start Camera press isn't a cold start.
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    loadJsQr().catch(() => {});
  }, []);

  // Release the camera if the staffer navigates away without pressing Stop.
  // scan.html hung this on `beforeunload`; in an SPA leaving the page is an
  // unmount, so the cleanup goes here (a real tab close unmounts nothing, but
  // the browser tears the stream down itself in that case).
  useEffect(() => {
    return () => {
      stopCamera();
      if (flashFrameRef.current) cancelAnimationFrame(flashFrameRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [stopCamera]);

  return (
    <div className="scan-station">
      <div className="card">
        <h1>📷 Scan Station</h1>
        <p className="sub">
          Scan an order&apos;s waybill QR with the camera or a handheld scanner (or type the Order
          ID) and press Enter.
          <br />
          Each scan advances the order one step in its lifecycle.
        </p>

        {!cameraOn && (
          <button id="start-cam-btn" type="button" className="cam-btn" onClick={startCamera}>
            📷 Start Camera
          </button>
        )}

        {/* Always mounted, shown by inline style like the original: the stream
            is attached and played before the wrapper is revealed, so the
            <video> has to exist first. */}
        <div
          id="video-wrap"
          className={'video-wrap' + (flash ? ' ' + flash : '')}
          style={{ display: cameraOn ? 'block' : 'none' }}
        >
          <video id="cam-video" ref={videoRef} playsInline muted autoPlay />
          <div className="scan-reticle" />
        </div>

        <div id="cam-status" className={'cam-status' + (camStatus.isError ? ' cam-error' : '')}>
          {camStatus.text}
        </div>

        {cameraOn && (
          <button id="stop-cam-btn" type="button" className="cam-btn stop" onClick={stopCamera}>
            ⏹ Stop Camera
          </button>
        )}

        <div className="divider">or type manually</div>

        {/* autoFocus mirrors the original markup's `autofocus`; the mount
            effect above repeats it the way the old script's trailing
            input.focus() did. A scan station is useless if the staffer has to
            tap the field before the scanner can type into it. */}
        <input
          id="scan-input"
          ref={inputRef}
          placeholder="Waiting for scan..."
          autoFocus
          value={scanValue}
          onChange={(event) => setScanValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div id="feedback" className={feedback.className}>
          {feedback.text}
        </div>

        <Link className="back-link" to="/stocks/orders">
          ← Back to Orders Queue
        </Link>
      </div>

      <canvas id="cam-canvas" ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

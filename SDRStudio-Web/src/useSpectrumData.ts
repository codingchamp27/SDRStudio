/**
 * useSpectrumData.ts – Phase 7 (fixed)
 *
 * Zero re-render architecture: writes directly into binsRef.
 * Improvements over v1:
 *  - hasDevice flag: skips all API calls when no device set is configured
 *  - DEMO = API connected (device may or may not be running), OFFLINE = API unreachable
 *  - Mock noise floor at -90 dBFS to be visible in default 0 / -100 view range
 *  - WS connection only attempted when hasDevice is true
 */

import { useEffect, useRef, type MutableRefObject } from 'react';

export type DataSource = 'LIVE' | 'DEMO' | 'OFFLINE';

export interface SpectrumFrame {
  bins: Float32Array;
  fftSize: number;
  centerFreqHz: number;
  dataSource: DataSource;
}

interface UseSpectrumDataOptions {
  binsRef: MutableRefObject<Float32Array | null>;
  onDataSource: (src: DataSource) => void;
  deviceSetIndex: number;
  /** True when at least one device set exists in the backend */
  hasDevice: boolean;
  /** True when the primary Rx device is running (DSP engine started) */
  isRunning: boolean;
  /** True when the REST API is reachable */
  isApiConnected: boolean;
  wsPort?: number;
}

// ─── Mock pump ────────────────────────────────────────────────────────────────
const MOCK_SIZE = 1024;

function fillMockBins(buf: Float32Array, t: number, hasSig: boolean): void {
  // Always start at a visible floor (-90 dBFS) — within the default 0 / -100 display range
  const floor = hasSig ? -88 : -95;
  for (let i = 0; i < MOCK_SIZE; i++) {
    let pwr = floor + (Math.random() - 0.5) * 6;
    if (hasSig) {
      // Moving carrier
      const p1 = (Math.sin(t * 0.25) * 0.30 + 0.50) * MOCK_SIZE;
      const d1 = Math.abs(i - p1);
      if (d1 < 20) pwr += (20 - d1) * 2.5;
      // DC spike
      const d2 = Math.abs(i - MOCK_SIZE / 2);
      if (d2 < 6) pwr += (6 - d2) * 5;
      // Drifting weak signal
      const p3 = (Math.cos(t * 0.09) * 0.20 + 0.72) * MOCK_SIZE;
      const d3 = Math.abs(i - p3);
      if (d3 < 30) pwr += (30 - d3) * 0.7;
    }
    buf[i] = Math.min(0, pwr);
  }
}

// ─── Binary frame parser ─────────────────────────────────────────────────────
function parseFrame(data: ArrayBuffer): Float32Array | null {
  try {
    if (data.byteLength < 16) return null;
    const view    = new DataView(data);
    const fftSize = view.getUint32(4, true);
    if (data.byteLength < 16 + fftSize * 4) return null;
    return new Float32Array(new Float32Array(data, 16, fftSize)); // copy
  } catch { return null; }
}

// Global lock to prevent SDRangel from crashing when multiple WebSockets are requested
let activeWsIndex = -1;

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSpectrumData({
  binsRef, onDataSource,
  deviceSetIndex, hasDevice, isRunning, isApiConnected,
  wsPort = 8887,
}: UseSpectrumDataOptions) {
  const wsRef   = useRef<WebSocket | null>(null);
  const rafRef  = useRef<number | null>(null);
  const tRef    = useRef(0);
  const onDSRef = useRef(onDataSource);
  onDSRef.current = onDataSource;

  const mockBuf = useRef(new Float32Array(MOCK_SIZE));

  const stopAll = () => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.onerror = null; wsRef.current.close(); wsRef.current = null; }
  };

  const startMock = (withSignals: boolean, src: DataSource) => {
    if (rafRef.current !== null) return;
    onDSRef.current(src);
    const tick = () => {
      tRef.current += 0.04;
      fillMockBins(mockBuf.current, tRef.current, withSignals);
      binsRef.current = mockBuf.current;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    let cancelled = false;

    if (!isApiConnected) {
      if (activeWsIndex === deviceSetIndex) activeWsIndex = -1;
      startMock(false, 'OFFLINE');
      return () => { cancelled = true; stopAll(); };
    }

    if (!hasDevice) {
      if (activeWsIndex === deviceSetIndex) activeWsIndex = -1;
      startMock(true, 'DEMO');
      return () => { cancelled = true; stopAll(); };
    }

    if (!isRunning) {
      if (activeWsIndex === deviceSetIndex) activeWsIndex = -1;
      startMock(true, 'DEMO');
      return () => { cancelled = true; stopAll(); };
    }

    // SDRangel natively crashes if you attempt to launch WSSpectrum on multiple devices simultaneously.
    // We enforce a strict frontend lock: only one device can bind to the WS server at any given time.
    if (activeWsIndex !== -1 && activeWsIndex !== deviceSetIndex) {
      startMock(true, 'DEMO'); // Safely fall back to mock
      return () => { cancelled = true; stopAll(); };
    }

    // Claim the spectrum server lock
    activeWsIndex = deviceSetIndex;

    const init = async () => {
      // Do not manually call setSpectrumServer via the REST API.
      // SDRangel's WSSpectrum endpoint is extremely unstable and crashes with a Segfault 
      // when you try to dynamically open/configure it via REST while the device is booting up.
      // We rely on SDRangel implicitly creating the spectrum pipeline on port 8887,
      // and we just passively try to attach a WebSocket to it!

      if (cancelled) return;

      // Wait 1.5 seconds before connecting to avoid SDRangel thread-safety Segfaults 
      // on concurrent WebSocket attach during DSP startup.
      await new Promise(r => setTimeout(r, 1500));
      if (cancelled) return;

      let retries = 6;

      const connectWS = () => {
        if (cancelled) return;
        let ws: WebSocket;
        try { ws = new WebSocket(`ws://127.0.0.1:${wsPort}`); }
        catch { startMock(true, 'DEMO'); return; }

        wsRef.current = ws;
        ws.binaryType = 'arraybuffer';

        const timeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.onclose = null; ws.close();
            if (retries > 0) { retries--; connectWS(); }
            else if (!cancelled) startMock(true, 'DEMO');
          }
        }, 800);

        ws.onopen = () => {
          clearTimeout(timeout);
          if (!cancelled) {
            stopAll();
            wsRef.current = ws;
            onDSRef.current('LIVE');
          }
        };

        ws.onmessage = (evt) => {
          if (cancelled || !(evt.data instanceof ArrayBuffer)) return;
          const bins = parseFrame(evt.data);
          if (bins) binsRef.current = bins;
        };

        ws.onerror  = () => clearTimeout(timeout);
        ws.onclose  = () => { 
          clearTimeout(timeout); 
          if (retries > 0 && !cancelled) {
            retries--;
            setTimeout(connectWS, 400);
          } else if (!cancelled) {
            startMock(true, 'DEMO'); 
          }
        };
      };

      connectWS();
    };

    // Start with DEMO immediately, then attempt WS upgrade
    startMock(true, 'DEMO');
    init();

    return () => { 
      cancelled = true; 
      stopAll(); 
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceSetIndex, hasDevice, isRunning, isApiConnected, wsPort]);
}

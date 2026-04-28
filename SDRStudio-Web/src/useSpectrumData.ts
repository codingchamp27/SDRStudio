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

import { SdrService } from './api';
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
// WSSpectrum::buildPayload sends this layout:
//   [0]  uint64_t centerFrequency  (8 bytes)
//   [8]  int64_t  fftTimeMs        (8 bytes)
//   [16] uint64_t timestampMs      (8 bytes)
//   [24] int      fftSize          (4 bytes)
//   [28] int      bandwidth        (4 bytes)
//   [32] int      indicators       (4 bytes)  bit0=linear, bit1=ssb, bit2=usb
//   [36] float[]  spectrum         (fftSize * 4 bytes)
const FRAME_HEADER_BYTES = 36;

function parseFrame(data: ArrayBuffer): Float32Array | null {
  try {
    if (data.byteLength < FRAME_HEADER_BYTES) return null;
    const view    = new DataView(data);
    const fftSize = view.getInt32(24, true);   // offset 24, little-endian
    if (fftSize <= 0 || data.byteLength < FRAME_HEADER_BYTES + fftSize * 4) return null;
    const indicators = view.getInt32(32, true); // bit 0: linear (1) or dB-scaled power (0)
    const isLinear = (indicators & 1) !== 0;

    const rawSpectrum = new Float32Array(data, FRAME_HEADER_BYTES, fftSize);
    const bins = new Float32Array(fftSize);

    // SDRangel sends linear power values unless isLinear flag is set.
    // We always want dB for display. Convert: dB = 10 * log10(linear)
    for (let i = 0; i < fftSize; i++) {
      if (isLinear) {
        bins[i] = rawSpectrum[i]; // already in proper display units
      } else {
        // backend sends 10*log2(power)*log10(2) ≈ 3.0103*log2(power)
        // but the actual value is already pre-scaled to dB by the C++ code
        bins[i] = rawSpectrum[i];
      }
    }
    return bins;
  } catch { return null; }
}


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
      startMock(false, 'OFFLINE');
      return () => { cancelled = true; stopAll(); };
    }

    if (!hasDevice) {
      startMock(true, 'DEMO');
      return () => { cancelled = true; stopAll(); };
    }

    if (!isRunning) {
      startMock(true, 'DEMO');
      return () => { cancelled = true; stopAll(); };
    }

    const init = async () => {
      if (cancelled) return;

      // Wait 1.5 seconds before connecting to avoid SDRangel thread-safety Segfaults 
      // on concurrent WebSocket attach during DSP startup.
      await new Promise(r => setTimeout(r, 1500));
      if (cancelled) return;

      // Ensure that we explicitly request SDRangel to stand up its WS spectrum server for THIS device context.
      // We pass the unique `wsPort` mapped in App.tsx (8887 + DS Index) so that multiple devices don't collide and crash the backend!
      try {
        await SdrService.setSpectrumServer(deviceSetIndex, true, wsPort);
      } catch (e) {
        // Silently continue and attempt to connect regardless
      }

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

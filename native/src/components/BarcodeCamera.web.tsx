import { createElement, useEffect, useRef } from "react";

/**
 * Browser: expo-camera reads only QR codes on the web, so barcodes are read here.
 * - The camera is asked for in high resolution with continuous focus (a phone's default 640×480
 *   is too blurry for the thin bars of an EAN-13).
 * - Where the browser reads barcodes itself (Chrome on Android) — its BarcodeDetector: fast and sure.
 * - Elsewhere (Safari on iPhone…) — ZXing, loaded the first time, on the middle of the picture
 *   (where the frame is drawn) a few times a second, trying hard.
 * `onCode` missing = paused (a code is being looked up).
 */
const ZXING_URL = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];

type ZX = {
  MultiFormatReader: new () => { setHints: (h: Map<number, unknown>) => void; decodeWithState: (b: unknown) => { getText: () => string }; reset: () => void };
  HTMLCanvasElementLuminanceSource: new (c: HTMLCanvasElement) => unknown;
  BinaryBitmap: new (b: unknown) => unknown;
  HybridBinarizer: new (s: unknown) => unknown;
  DecodeHintType: Record<string, number>;
  BarcodeFormat: Record<string, number>;
};
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

let loading: Promise<ZX> | null = null;
function loadZxing(): Promise<ZX> {
  const w = window as unknown as { ZXing?: ZX };
  if (w.ZXing) return Promise.resolve(w.ZXing);
  if (!loading) {
    loading = new Promise<ZX>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = ZXING_URL;
      s.async = true;
      s.onload = () => (w.ZXing ? resolve(w.ZXing) : reject(new Error("no ZXing")));
      s.onerror = () => {
        loading = null;
        reject(new Error("load failed"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** the browser's own barcode reader, when it knows EAN-13 */
async function nativeDetector(): Promise<Detector | null> {
  const BD = (window as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (!BD) return null;
  try {
    const have = (await BD.getSupportedFormats?.()) ?? [];
    if (!have.includes("ean_13")) return null;
    return new BD({ formats: FORMATS.filter((f) => have.includes(f)) });
  } catch {
    return null;
  }
}

/** ZXing over the middle band of the frame (where the code is aimed), trying harder */
function zxingReader(ZXing: ZX) {
  const reader = new ZXing.MultiFormatReader();
  const hints = new Map<number, unknown>();
  const F = ZXing.BarcodeFormat;
  hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE]);
  hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return (v: HTMLVideoElement): string | null => {
    const vw = v.videoWidth;
    const vh = v.videoHeight;
    if (!vw || !vh || !ctx) return null;
    // the band in the middle: 90% of the width, 45% of the height (portrait phones: the frame is there)
    const sw = Math.round(vw * 0.9);
    const sh = Math.round(vh * 0.45);
    const sx = Math.round((vw - sw) / 2);
    const sy = Math.round((vh - sh) / 2);
    const scale = Math.min(1, 1280 / sw);
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    try {
      const bmp = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.HTMLCanvasElementLuminanceSource(canvas)));
      return reader.decodeWithState(bmp).getText();
    } catch {
      return null; // nothing in this frame
    } finally {
      reader.reset();
    }
  };
}

export function BarcodeCamera({ onCode, onError }: { torch: boolean; onCode?: (code: string) => void; onError?: (text: string) => void }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  const err = useRef(onError);
  err.current = onError;

  useEffect(() => {
    let closed = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no camera api"), { name: window.isSecureContext ? "NotFoundError" : "Insecure" });
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (closed) return;
        // continuous focus where the camera can (Android Chrome); Safari focuses by itself
        const track = stream.getVideoTracks()[0];
        try {
          const caps = (track.getCapabilities?.() ?? {}) as { focusMode?: string[] };
          if (caps.focusMode?.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
        } catch {
          /* not supported */
        }
        for (let i = 0; i < 20 && !video.current; i++) await new Promise((r) => setTimeout(r, 50));
        const v = video.current;
        if (closed || !v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});

        const detector = await nativeDetector();
        let read: ((v: HTMLVideoElement) => Promise<string | null>) | null = null;
        if (detector) {
          read = async (el) => {
            const found = await detector.detect(el);
            return found[0]?.rawValue ?? null;
          };
        } else {
          const z = zxingReader(await loadZxing());
          read = async (el) => z(el);
        }
        const tick = async () => {
          if (closed) return;
          const v2 = video.current;
          if (v2 && cb.current && v2.readyState >= 2) {
            try {
              const code = (await read!(v2))?.trim();
              if (code && !closed) cb.current?.(code);
            } catch {
              // the browser's reader failed on this phone: ZXing from now on
              if (detector) {
                const z = zxingReader(await loadZxing());
                read = async (el) => z(el);
              }
            }
          }
          timer = setTimeout(tick, detector ? 120 : 100);
        };
        tick();
      } catch (e) {
        if (closed) return;
        const name = (e as { name?: string })?.name;
        err.current?.(
          name === "NotAllowedError"
            ? "Доступ к камере запрещён. Разрешите камеру для сайта в настройках браузера"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "Камера не найдена. Введите штрихкод в поиск"
              : name === "Insecure"
                ? "Камера работает только на защищённом сайте (https)"
                : "Не удалось запустить камеру. Введите штрихкод в поиск"
        );
      }
    })();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return createElement("video", {
    ref: (el: HTMLVideoElement | null) => {
      video.current = el;
    },
    playsInline: true,
    muted: true,
    autoPlay: true,
    style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  });
}

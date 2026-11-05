import { createElement, useEffect, useRef } from "react";

/**
 * Browser: expo-camera reads only QR codes on the web, so EAN-13/8, UPC, Code128… are read with ZXing
 * (as in Team's web scanner), loaded the first time the scanner is opened. The camera keeps running;
 * `onCode` missing = paused (a code is being looked up).
 */
const ZXING_URL = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";

type Reader = {
  decodeFromConstraints: (c: MediaStreamConstraints, v: HTMLVideoElement, cb: (r: { getText: () => string } | null) => void) => Promise<void>;
  reset: () => void;
};
type ZX = { BrowserMultiFormatReader: new () => Reader };

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

export function BarcodeCamera({ onCode, onError }: { torch: boolean; onCode?: (code: string) => void; onError?: (text: string) => void }) {
  const video = useRef<HTMLVideoElement | null>(null);
  const cb = useRef(onCode);
  cb.current = onCode;
  const err = useRef(onError);
  err.current = onError;

  useEffect(() => {
    let closed = false;
    let reader: Reader | null = null;
    (async () => {
      try {
        const ZXing = await loadZxing();
        for (let i = 0; i < 20 && !video.current; i++) await new Promise((r) => setTimeout(r, 50));
        if (closed || !video.current) return;
        reader = new ZXing.BrowserMultiFormatReader();
        await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, video.current, (r) => {
          const code = r?.getText()?.trim();
          if (code && !closed) cb.current?.(code);
        });
      } catch (e) {
        if (closed) return;
        const name = (e as { name?: string })?.name;
        err.current?.(
          name === "NotAllowedError"
            ? "Доступ к камере запрещён. Разрешите камеру для сайта в настройках браузера"
            : name === "NotFoundError"
              ? "Камера не найдена. Введите штрихкод в поиск"
              : !window.isSecureContext
                ? "Камера работает только на защищённом сайте (https)"
                : "Не удалось запустить камеру. Введите штрихкод в поиск"
        );
      }
    })();
    return () => {
      closed = true;
      try {
        reader?.reset();
      } catch {
        /* already stopped */
      }
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

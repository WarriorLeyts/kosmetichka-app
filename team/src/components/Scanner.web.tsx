import { createElement, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Barcode scanner in the browser (the admin site in a phone's browser): expo-camera reads only QR codes
 * on the web, so EAN-13/8, UPC, Code128… are read with ZXing (as the site's own admin scanner), loaded
 * the first time the scanner is opened. Same props as the phone version (Scanner.tsx).
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

export function Scanner({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const insets = useSafeAreaInsets();
  const video = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let closed = false;
    let done = false;
    let reader: Reader | null = null;
    setError("");
    (async () => {
      try {
        const ZXing = await loadZxing();
        // the <video> appears with the modal — wait a frame for it
        for (let i = 0; i < 20 && !video.current; i++) await new Promise((r) => setTimeout(r, 50));
        if (closed || !video.current) return;
        reader = new ZXing.BrowserMultiFormatReader();
        await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, video.current, (r) => {
          const code = r?.getText()?.trim();
          if (!code || done || closed) return;
          done = true;
          reader?.reset();
          onCode(code);
        });
      } catch (e) {
        if (closed) return;
        const name = (e as { name?: string })?.name;
        setError(
          name === "NotAllowedError"
            ? "Доступ к камере запрещён. Разрешите камеру для сайта в настройках браузера"
            : name === "NotFoundError"
              ? "Камера не найдена. На компьютере введите штрихкод в поиск или считайте его сканером"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {error ? (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={48} color="#fff" />
            <Text style={styles.text}>{error}</Text>
          </View>
        ) : (
          createElement("video", {
            ref: (el: HTMLVideoElement | null) => {
              video.current = el;
            },
            playsInline: true,
            muted: true,
            autoPlay: true,
            style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
          })
        )}
        {!error ? <View style={[styles.frame, { pointerEvents: "none" }]} /> : null}
        <Pressable onPress={onClose} style={[styles.close, { top: insets.top + 12 }]} accessibilityLabel="Закрыть">
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        {!error ? <Text style={[styles.hint, { bottom: insets.bottom + 40 }]}>Наведите камеру на штрихкод</Text> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  text: { color: "#fff", fontSize: 17, textAlign: "center", maxWidth: 420 },
  frame: { position: "absolute", left: "12%", right: "12%", top: "38%", height: 150, borderRadius: 18, borderWidth: 3, borderColor: "#fff" },
  close: { position: "absolute", right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  hint: { position: "absolute", alignSelf: "center", color: "#fff", fontWeight: "700", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: "hidden" },
});

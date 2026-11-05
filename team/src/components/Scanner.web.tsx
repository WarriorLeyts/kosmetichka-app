import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarcodeCamera } from "./BarcodeCamera.web";

/**
 * Barcode scanner in the browser (the admin site in a phone's browser): the camera in high resolution,
 * read by the browser itself where it can (Android Chrome) or by ZXing (BarcodeCamera.web.tsx — the
 * same as the customer site). Same props as the phone version (Scanner.tsx).
 */
export function Scanner({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState("");
  // a ref, not state: the camera reports the same code several frames in a row
  const done = useRef(false);
  useEffect(() => {
    if (open) {
      done.current = false;
      setError("");
    }
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
          open ? (
            <BarcodeCamera
              torch={false}
              onError={setError}
              onCode={(code) => {
                if (done.current) return;
                done.current = true;
                onCode(code);
              }}
            />
          ) : null
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

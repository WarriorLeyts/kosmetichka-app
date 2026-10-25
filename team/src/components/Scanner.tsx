import { useEffect, useRef } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** full-screen barcode scanner (EAN-13/8, Code128, QR…) */
export function Scanner({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (code: string) => void }) {
  const insets = useSafeAreaInsets();
  const [perm, request] = useCameraPermissions();
  // a ref, not state: the camera reports the same code several times before a re-render
  const done = useRef(false);
  useEffect(() => {
    if (open) done.current = false;
  }, [open]);
  const denied = perm && !perm.granted && !perm.canAskAgain;
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {perm?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] }}
            onBarcodeScanned={
              open
                ? (r) => {
                    const code = typeof r.data === "string" ? r.data.trim() : "";
                    if (done.current || !code) return;
                    done.current = true;
                    onCode(code);
                  }
                : undefined
            }
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.text}>
              {denied ? "Доступ к камере запрещён. Разрешите его в настройках телефона, чтобы сканировать штрихкоды" : "Нужен доступ к камере, чтобы сканировать штрихкоды"}
            </Text>
            <Pressable onPress={() => (denied ? Linking.openSettings().catch(() => {}) : request())} style={styles.btn}>
              <Text style={styles.btnText}>{denied ? "Открыть настройки" : "Разрешить"}</Text>
            </Pressable>
          </View>
        )}
        <View style={[styles.frame, { pointerEvents: "none" }]} />
        <Pressable onPress={onClose} style={[styles.close, { top: insets.top + 12 }]} accessibilityLabel="Закрыть">
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text style={[styles.hint, { bottom: insets.bottom + 40 }]}>Наведите камеру на штрихкод</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  text: { color: "#fff", fontSize: 17, textAlign: "center" },
  btn: { backgroundColor: "#8b3dff", borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  frame: { position: "absolute", left: "12%", right: "12%", top: "38%", height: 160, borderRadius: 18, borderWidth: 3, borderColor: "rgba(255,255,255,0.9)" },
  close: { position: "absolute", left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  hint: { position: "absolute", left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 16, fontWeight: "600" },
});

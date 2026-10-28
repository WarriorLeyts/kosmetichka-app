import { useRef, useState } from "react";
import { themed } from "@/theme";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Linking } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api } from "@/api";
import { catalogStoreByName } from "@/store/catalog";
import { Button } from "@/components/ui";

export default function Scanner() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const handled = useRef(false);
  // ?store=pick: scanning on «Добавить товар» searches there, the product is added from its card
  const { store } = useLocalSearchParams<{ store?: string }>();
  const pick = store === "pick";

  const onCode = async (code: string) => {
    if (handled.current) return;
    handled.current = true;
    setBusy(true);
    try {
      const r = await api.catalog({ page: 1, search: code });
      if (r.products.length > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (r.products.length === 1 && !pick) {
        router.replace(`/product/${r.products[0].id}`);
        return;
      }
      if (r.products.length === 0) {
        setMessage(`Товар со штрихкодом ${code} не найден`);
        setBusy(false);
        setTimeout(() => {
          handled.current = false;
          setMessage("");
        }, 2500);
        return;
      }
      const cat = catalogStoreByName(store);
      cat.getState().reset();
      cat.getState().set({ search: code });
      router.back();
      if (!pick) router.navigate("/catalog");
    } catch {
      setMessage("Нет связи с сервером");
      setBusy(false);
      // wait before scanning again, otherwise the same code fires every frame
      setTimeout(() => {
        handled.current = false;
        setMessage("");
      }, 2500);
    }
  };

  if (!permission) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  if (!permission.granted) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="camera-outline" size={56} color="#fff" />
        <Text style={styles.title}>Нужен доступ к камере</Text>
        <Text style={styles.text}>Чтобы найти товар по штрихкоду на упаковке</Text>
        <Button
          title={permission.canAskAgain ? "Разрешить" : "Открыть настройки"}
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          style={{ minWidth: 220, marginTop: 20 }}
        />
        <Pressable onPress={() => router.back()} style={{ padding: 16 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Закрыть</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] }}
        onBarcodeScanned={busy ? undefined : ({ data }) => onCode(String(data))}
      />
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.round} hitSlop={10}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Pressable onPress={() => setTorch(!torch)} style={styles.round} hitSlop={10}>
          <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color="#fff" />
        </Pressable>
      </View>
      <View style={[styles.frameWrap, { pointerEvents: "none" }]}>
        <View style={styles.frame} />
        <Text style={styles.hint}>{message || "Наведите камеру на штрихкод товара"}</Text>
        {busy && <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />}
      </View>
    </View>
  );
}

const styles = themed(() => ({
  center: { flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 16 },
  text: { color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 6 },
  top: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  frameWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  frame: { width: 280, height: 170, borderRadius: 20, borderWidth: 3, borderColor: "#fff" },
  hint: { color: "#fff", fontWeight: "700", marginTop: 18, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: "hidden" },
}));

import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, themed, useTheme } from "../theme";
import { useCatalog, type Quick } from "../store/catalog";
import { LOGO } from "./PageTitle";
import { tap } from "./ui";

const WIDTH = Math.min(310, Dimensions.get("window").width * 0.82);
type IconName = keyof typeof Ionicons.glyphMap;

/** Left side menu from the mockup («Боковое меню»). */
export function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(-WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(open);
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(x, { toValue: -WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = (fn: () => void) => {
    tap();
    onClose();
    setTimeout(fn, 180);
  };
  const catalog = (quick: Quick[] = []) =>
    go(() => {
      useCatalog.getState().reset();
      if (quick.length) useCatalog.getState().set({ quick });
      router.navigate("/catalog");
    });

  const groups: { icon: IconName; label: string; onPress: () => void }[][] = [
    [
      { icon: "grid-outline", label: "Каталог", onPress: () => catalog() },
      { icon: "pricetag-outline", label: "Акции", onPress: () => catalog(["sale"]) },
      { icon: "sparkles-outline", label: "Новинки", onPress: () => catalog(["new"]) },
      { icon: "gift-outline", label: "Подарочные наборы", onPress: () => catalog(["gift"]) },
      { icon: "barcode-outline", label: "Сканер штрихкода", onPress: () => go(() => router.push("/scanner")) },
    ],
    [
      { icon: "storefront-outline", label: "Наши магазины", onPress: () => go(() => router.push("/stores")) },
      { icon: "information-circle-outline", label: "О компании и контакты", onPress: () => go(() => router.push("/info")) },
    ],
    [
      { icon: "heart-outline", label: "Избранное", onPress: () => go(() => router.push("/favorites")) },
      { icon: "notifications-outline", label: "Лист ожидания", onPress: () => go(() => router.push("/waitlist")) },
      {
        icon: mode === "dark" ? "sunny-outline" : "moon-outline",
        label: mode === "dark" ? "Светлая тема" : "Тёмная тема",
        onPress: () => {
          tap();
          onClose();
          setTimeout(toggleTheme, 260);
        },
      },
    ],
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.drawer, { width: WIDTH, transform: [{ translateX: x }], paddingTop: insets.top + 14 }]}>
        <View style={styles.head}>
          <Image source={LOGO} style={{ width: 38, height: 38 }} contentFit="contain" />
          <Text style={styles.brand}>КОСМЕТИЧКА</Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ marginLeft: "auto" }}>
            <Ionicons name="close" size={24} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          {groups.map((g, gi) => (
            <View key={gi} style={[styles.group, gi > 0 && styles.groupSep]}>
              {g.map((it) => (
                <Pressable key={it.label} onPress={it.onPress} style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.soft }]}>
                  <Ionicons name={it.icon} size={20} color={colors.text} />
                  <Text style={styles.itemText}>{it.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = themed(() => ({
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingBottom: 16 },
  brand: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, letterSpacing: 1 },
  group: { paddingVertical: 8, paddingHorizontal: 8 },
  groupSep: { borderTopWidth: 1, borderTopColor: colors.border },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 },
  itemText: { fontSize: 15, color: colors.text },
}));

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, FlatList, LayoutAnimation, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl } from "@/api";
import { stockLabel } from "@/format";
import { useWaitlistStore } from "@/store/waitlist";
import { ErrorView, tap } from "@/components/ui";
import { TitleBar } from "@/components/iosui/TitleBar";
import { VIOLET_PINK } from "@/components/TabBar";
import { useIOS } from "@/ios";
import { useReduceMotion } from "@/useReduceMotion";
import type { Product } from "@/types";

type Row = Product & { notified: boolean };

const VIOLET = "#8b3dff";

/** One waitlist card: fades in, fades out on delete. */
function WaitCard({ item, index, onRemoved }: { item: Row; index: number; onRemoved: (id: number) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const reduce = useReduceMotion();
  const removeFromList = useWaitlistStore((s) => s.remove);
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: reduce ? 0 : 220, delay: reduce ? 0 : Math.min(index, 8) * 40, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async () => {
    if (busy) return;
    tap();
    setBusy(true);
    try {
      await removeFromList(item.id);
      Animated.timing(v, { toValue: 0, duration: reduce ? 0 : 200, useNativeDriver: true }).start(() => onRemoved(item.id));
    } catch (e) {
      setBusy(false);
      Alert.alert("Не удалось удалить", e instanceof Error ? e.message : "Попробуйте ещё раз");
    }
  };

  const s = stockLabel(item.stock);
  const back = s.tone !== "out"; // real status: product is in stock again
  const img = imageUrl(item.images?.[0]?.path);

  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}>
      <Pressable
        onPress={() => router.push(`/product/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        style={({ pressed }) => [styles.card, { backgroundColor: c.cell }, !dark && styles.shadow, pressed && { transform: [{ scale: 0.985 }] }]}
      >
        <View style={[styles.photo, { backgroundColor: dark ? "#fff" : "#F7F1FA" }]}>
          {img ? <Image source={{ uri: img }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={26} color="#AEAEB2" />}
        </View>
        <View style={{ flex: 1, gap: 4, paddingRight: 30 }}>
          {item.brand?.name ? (
            <Text style={styles.brand} numberOfLines={1}>
              {item.brand.name.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.name, { color: c.label }]}>{item.name}</Text>
          {back ? (
            <View style={[styles.pill, { backgroundColor: "rgba(52,199,89,0.12)" }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#1f8a3b" />
              <Text style={[styles.pillText, { color: "#1f8a3b" }]}>Снова в наличии</Text>
            </View>
          ) : (
            <View style={[styles.pill, { backgroundColor: dark ? "rgba(185,60,220,0.2)" : "#F8E8F8" }]}>
              <Ionicons name="time-outline" size={18} color="#9b1fb8" />
              <Text style={[styles.pillText, { color: "#9b1fb8" }]}>Ждём поступления</Text>
            </View>
          )}
        </View>
        <Pressable onPress={remove} hitSlop={10} accessibilityRole="button" accessibilityLabel="Удалить из листа ожидания" style={styles.trash}>
          {busy ? <ActivityIndicator size="small" color={c.secondary} /> : <Ionicons name="trash-outline" size={22} color={c.secondary} />}
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

/** «Лист ожидания» — iOS cards; real data from the server list. */
export default function Waitlist() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [items, setItems] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await api.wishlist();
      setItems(r.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const removed = (id: number) => {
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
    setItems((prev) => (prev ?? []).filter((x) => x.id !== id));
  };

  const bg = dark ? "#000" : "#F7F5FB";
  const header = (
    <View style={styles.wrap}>
      <TitleBar title="Лист ожидания" />
    </View>
  );

  if (error || !items) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top, paddingHorizontal: 16 }}>
        <Stack.Screen options={{ headerShown: false }} />
        {header}
        {error ? <ErrorView message={error} onRetry={load} /> : <ActivityIndicator style={{ flex: 1 }} color={VIOLET} />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={VIOLET}
            colors={[VIOLET]}
          />
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={[styles.wrap, styles.empty, { backgroundColor: c.cell }, !dark && styles.shadow]}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={34} color={VIOLET} />
            </View>
            <Text style={[styles.emptyTitle, { color: c.label }]}>Лист ожидания пуст</Text>
            <Text style={[styles.emptyText, { color: c.secondary }]}>
              Сюда попадают товары, которых нет в наличии, — добавить их можно кнопкой «Сообщить о поступлении» в карточке товара
            </Text>
            <Pressable onPress={() => router.navigate("/catalog")} accessibilityRole="button" style={{ alignSelf: "stretch", marginTop: 18 }}>
              <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                <Text style={styles.ctaText}>Перейти в каталог</Text>
              </LinearGradient>
            </Pressable>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.wrap}>
            <WaitCard item={item} index={index} onRemoved={removed} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 640, alignSelf: "center" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  card: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 22, padding: 12 },
  photo: { width: 96, height: 112, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  brand: { color: VIOLET, fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },
  name: { fontSize: 16, lineHeight: 21, fontWeight: "500" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  pillText: { fontSize: 14, fontWeight: "500" },
  trash: { position: "absolute", top: 10, right: 10, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  empty: { borderRadius: 22, padding: 28, alignItems: "center", marginTop: 4 },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: "rgba(139,61,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 19, fontWeight: "700" },
  emptyText: { fontSize: 15, textAlign: "center", marginTop: 6, lineHeight: 21 },
  cta: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});

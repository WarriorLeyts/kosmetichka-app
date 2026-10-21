import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, imageUrl } from "@/api";
import { colors, radius } from "@/theme";
import { stockLabel } from "@/format";
import { useWaitlistStore } from "@/store/waitlist";
import { Empty, ErrorView, Loading } from "@/components/ui";
import type { Product } from "@/types";

type Row = Product & { notified: boolean };

export default function Waitlist() {
  const toggle = useWaitlistStore((s) => s.toggle);
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

  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!items) return <Loading />;
  if (items.length === 0)
    return (
      <Empty
        icon="notifications-outline"
        title="Лист ожидания пуст"
        text="На товарах, которых нет в наличии, нажмите «Сообщить о поступлении» — мы напомним, когда они появятся"
        action="В каталог"
        onAction={() => router.navigate("/catalog")}
      />
    );

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={{ padding: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.violet} />}
      renderItem={({ item }) => {
        const s = stockLabel(item.stock);
        const back = s.tone !== "out";
        const img = imageUrl(item.images?.[0]?.path);
        return (
          <Pressable onPress={() => router.push(`/product/${item.id}`)} style={[styles.row, back && { borderColor: "#a7f3d0" }]}>
            {img ? <Image source={{ uri: img }} style={styles.img} contentFit="contain" /> : <View style={styles.img} />}
            <View style={{ flex: 1 }}>
              {item.brand?.name ? <Text style={styles.brand}>{item.brand.name}</Text> : null}
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.status, { color: back ? colors.success : colors.muted }]}>
                {back ? "✓ Снова в наличии!" : "Ждём поступления"}
              </Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={async () => {
                await toggle(item.id).catch(() => {});
                setItems((prev) => (prev ?? []).filter((x) => x.id !== item.id));
              }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.faint} />
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: radius.lg, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  img: { width: 60, height: 60, borderRadius: 10, backgroundColor: colors.soft },
  brand: { color: colors.violet, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  name: { fontWeight: "700", color: colors.text, fontSize: 14 },
  status: { fontSize: 12, fontWeight: "800", marginTop: 4 },
});

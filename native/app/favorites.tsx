import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, FlatList, LayoutAnimation, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { CatalogCard } from "@/components/CatalogCard";
import { TitleBar } from "@/components/iosui/TitleBar";
import { VIOLET_PINK } from "@/components/TabBar";
import { useIOS } from "@/ios";
import { useReduceMotion } from "@/useReduceMotion";
import { useAddToCart } from "@/useAddToCart";
import type { Product } from "@/types";

/** Card wrapper that fades out before the product leaves the list. */
const Removable = memo(function Removable({ leaving, onGone, children }: { leaving: boolean; onGone: () => void; children: ReactNode }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!leaving) return;
    if (reduce) {
      onGone();
      return;
    }
    Animated.timing(v, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onGone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);
  return <Animated.View style={{ flex: 1, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>{children}</Animated.View>;
});

/** «Избранное» — the same CatalogCard as in the catalog, two columns. */
export default function Favorites() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const items = useFavorites((s) => s.items);
  const toggle = useFavorites((s) => s.toggle);
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const addToCart = useAddToCart();
  const active = effectivePriceType(cart, customer);
  const [leaving, setLeaving] = useState<Set<number>>(new Set());

  const startLeaving = useCallback((p: Product) => setLeaving((s) => new Set(s).add(p.id)), []);
  const remove = (p: Product) => {
    if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.create(240, "easeInEaseOut", "opacity"));
    toggle(p); // removes from favourites (synced with the catalog)
    setLeaving((s) => {
      const n = new Set(s);
      n.delete(p.id);
      return n;
    });
  };

  const bg = dark ? "#000" : "#F7F5FB";

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        key={columns}
        data={items}
        numColumns={columns}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 11, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 5 }}>
            <TitleBar title="Избранное" />
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: c.cell }, !dark && styles.shadow]}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={34} color="#e82c87" />
            </View>
            <Text style={[styles.emptyTitle, { color: c.label }]}>В избранном пусто</Text>
            <Text style={[styles.emptyText, { color: c.secondary }]}>Нажимайте на сердечко у товаров, чтобы вернуться к ним позже</Text>
            <Pressable onPress={() => router.navigate("/catalog")} accessibilityRole="button" style={{ alignSelf: "stretch", marginTop: 18 }}>
              <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                <Text style={styles.ctaText}>Перейти в каталог</Text>
              </LinearGradient>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 / columns }}>
            <Removable leaving={leaving.has(item.id)} onGone={() => remove(item)}>
              <CatalogCard
                product={item}
                customer={customer}
                activePrice={active}
                inCart={cart.find((x) => x.cartKey === String(item.id))?.quantity ?? 0}
                isFavorite
                onAdd={addToCart}
                onFavorite={startLeaving}
              />
            </Removable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  empty: { margin: 5, marginTop: 10, borderRadius: 22, padding: 28, alignItems: "center" },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: "rgba(232,44,135,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 19, fontWeight: "700" },
  emptyText: { fontSize: 15, textAlign: "center", marginTop: 6, lineHeight: 21 },
  cta: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});

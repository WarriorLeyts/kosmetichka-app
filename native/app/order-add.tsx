import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl } from "@/api";
import { money, stockLabel } from "@/format";
import { priceFor, resolveCustomerPriceType } from "@/pricing";
import { useAuth } from "@/store/auth";
import { NO_LINES, useOrderEdit, type AddedLine } from "@/store/orderEdit";
import { TitleBar } from "@/components/iosui/TitleBar";
import { Sheet } from "@/components/iosui/Sheet";
import { ErrorView, tap } from "@/components/ui";
import { useIOS } from "@/ios";
import type { Product, Variant } from "@/types";

const VIOLET = "#8b3dff";

/**
 * «Добавить товары» to an order the customer is changing: search the catalogue, «+» puts the product
 * (or one of its variants) into the order's draft; the order screen shows them and saves everything.
 * mode=chat («Добавить товар» in the order chat): the picked products go to the manager as cards in the
 * chat — he adds them to the order with one tap.
 */
export default function OrderAddScreen() {
  const { order, mode } = useLocalSearchParams<{ order: string; mode?: string }>();
  const chat = mode === "chat";
  const orderId = /^[0-9]+$/.test(String(order ?? "")) ? Number(order) : NaN;
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const customer = useAuth((s) => s.customer);
  const priceType = resolveCustomerPriceType(customer);
  const draft = useOrderEdit((s) => (s.orderId === orderId ? s.added : NO_LINES));
  const addToDraft = useOrderEdit((s) => s.add);
  // chat mode: a separate list, the order's edit draft is not touched
  const [picked, setPicked] = useState<AddedLine[]>([]);
  const [sending, setSending] = useState(false);
  const added = chat ? picked : draft;
  const addLine = (oid: number, product: Product, quantity: number, variant?: { name: string; imageUrl: string } | null) => {
    if (!chat) return addToDraft(oid, product, quantity, variant);
    const key = `${product.id}:${variant?.name ?? ""}`;
    setPicked((list) =>
      list.some((l) => l.key === key)
        ? list.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l))
        : [...list, { key, product, quantity, variantName: variant?.name ?? null, variantImageUrl: variant?.imageUrl ?? null }]
    );
  };

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [variantFor, setVariantFor] = useState<{ product: Product; variants: Variant[] } | null>(null);
  const [checking, setChecking] = useState<number | null>(null);
  const seq = useRef(0);
  const variantCache = useRef(new Map<number, Variant[]>());

  const load = useCallback(async (search: string, p: number) => {
    const my = ++seq.current;
    setLoading(true);
    setError("");
    try {
      const r = await api.catalog({ page: p, search: search.trim() || undefined, onlyStock: true });
      if (my !== seq.current) return;
      setItems((prev) => (p === 1 ? r.products : [...prev, ...r.products]));
      setPage(p);
      setHasMore(!!r.hasMore);
    } catch (e) {
      if (my === seq.current) setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, []);

  // search as you type (debounced)
  useEffect(() => {
    const t = setTimeout(() => load(q, 1), q ? 400 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  const countOf = (productId: number) => added.filter((l) => l.product.id === productId).reduce((s, l) => s + l.quantity, 0);

  const onAdd = async (p: Product) => {
    tap();
    const step = Math.max(1, p.minOrderQty ?? 1);
    let variants = variantCache.current.get(p.id);
    if (!variants) {
      setChecking(p.id);
      try {
        variants = (await api.variants(p.id)).variants ?? [];
      } catch {
        variants = [];
      } finally {
        setChecking(null);
      }
      variantCache.current.set(p.id, variants);
    }
    if (variants.length > 0) setVariantFor({ product: p, variants });
    else addLine(orderId, p, step);
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/order/${orderId}`);
  };
  const done = async () => {
    tap();
    if (!chat || picked.length === 0) return back();
    if (sending) return;
    setSending(true);
    try {
      // one card per product: the manager adds each with one tap
      for (const l of picked) await api.requestProduct(orderId, { productId: l.product.id, quantity: l.quantity, variantName: l.variantName });
      setPicked([]);
      back();
    } catch (e) {
      Alert.alert("Не отправлено", e instanceof Error ? e.message : "Попробуйте ещё раз");
    } finally {
      setSending(false);
    }
  };
  const total = added.reduce((s, l) => s + l.quantity, 0);

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <View style={[styles.wrap, { paddingHorizontal: 16 }]}>
        <TitleBar title={chat ? "Добавить товар" : "Добавить товары"} onBack={back} />
        <View style={[styles.search, { backgroundColor: dark ? "#2B193D" : "rgba(118,118,128,0.12)" }]}>
          <Ionicons name="search-outline" size={20} color={c.secondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Название, бренд, артикул"
            placeholderTextColor={c.secondary}
            style={[styles.searchInput, { color: c.label }]}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
            accessibilityLabel="Поиск товара"
            keyboardAppearance={c.blurTint}
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={8} accessibilityLabel="Очистить">
              <Ionicons name="close-circle" size={19} color={c.secondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {error && items.length === 0 ? (
        <ErrorView message={error} onRetry={() => load(q, 1)} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.wrap, { paddingHorizontal: 16, paddingBottom: insets.bottom + 110, gap: 10 }]}
          onEndReached={() => hasMore && !loading && load(q, page + 1)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={VIOLET} style={{ marginTop: 30 }} />
            ) : (
              <Text style={[styles.empty, { color: c.secondary }]}>Ничего не нашлось. Попробуйте другое название или артикул.</Text>
            )
          }
          ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator color={VIOLET} style={{ marginTop: 8 }} /> : null}
          renderItem={({ item: p }) => {
            const img = imageUrl(p.images?.[0]?.path, 160);
            const n = countOf(p.id);
            const st = stockLabel(p.stock);
            return (
              <View style={[styles.row, { backgroundColor: c.cell }, !dark && styles.shadow]}>
                <View style={[styles.photo, { backgroundColor: "#fff" }]}>
                  {img ? <Image source={{ uri: img }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={22} color="#AEAEB2" />}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  {p.brand?.name ? <Text style={styles.brand} numberOfLines={1}>{p.brand.name.toUpperCase()}</Text> : null}
                  <Text style={{ color: c.label, fontSize: 15, lineHeight: 20 }} numberOfLines={2}>{p.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.price}>{money(priceFor(p, priceType))}</Text>
                    <Text style={{ color: st.tone === "low" ? "#C2410C" : c.secondary, fontSize: 12 }}>{st.text}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => onAdd(p)}
                  accessibilityRole="button"
                  accessibilityLabel={n > 0 ? `Добавить ещё ${p.name}, уже ${n}` : `Добавить ${p.name}`}
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                >
                  {n > 0 ? (
                    <View style={[styles.addBtn, { backgroundColor: "rgba(139,61,255,0.12)" }]}>
                      <Text style={{ color: VIOLET, fontWeight: "800", fontSize: 15 }}>{n}</Text>
                      <Ionicons name="add" size={16} color={VIOLET} style={{ position: "absolute", right: 3, top: 3 }} />
                    </View>
                  ) : (
                    <LinearGradient colors={[VIOLET, "#b832e0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtn}>
                      {checking === p.id ? <ActivityIndicator color="#fff" /> : <Ionicons name="add" size={24} color="#fff" />}
                    </LinearGradient>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* back to the order with what was picked */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: dark ? "rgba(33,16,50,0.97)" : "rgba(255,255,255,0.97)" }]}>
        <Pressable onPress={done} accessibilityRole="button" style={[styles.wrap, { paddingHorizontal: 16 }]}>
          <LinearGradient colors={["#8b3dff", "#e82c87"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            <Ionicons name="checkmark" size={22} color="#fff" />
            {sending ? <ActivityIndicator color="#fff" /> : null}
            <Text style={styles.ctaText}>
              {chat ? (total > 0 ? `Отправить менеджеру · ${total} шт.` : "Вернуться в чат") : total > 0 ? `Готово · выбрано ${total} шт.` : "Вернуться к заказу"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Sheet open={!!variantFor} onClose={() => setVariantFor(null)} title="Выберите вариант">
        {variantFor ? (
          <View style={{ gap: 8, paddingBottom: 8 }}>
            {variantFor.variants.map((v) => {
              const n = added.find((l) => l.key === `${variantFor.product.id}:${v.name}`)?.quantity ?? 0;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    tap();
                    addLine(orderId, variantFor.product, Math.max(1, variantFor.product.minOrderQty ?? 1), { name: v.name, imageUrl: v.imageUrl });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Добавить ${v.name}`}
                  style={[styles.variant, { backgroundColor: dark ? "#2B193D" : "#F6F3FB" }]}
                >
                  <Image source={{ uri: imageUrl(v.imageUrl, 160) ?? undefined }} style={styles.variantImg} contentFit="cover" />
                  <Text style={{ flex: 1, color: c.label, fontSize: 15 }} numberOfLines={2}>{v.name}</Text>
                  {n > 0 ? <Text style={{ color: VIOLET, fontWeight: "800" }}>{n} шт.</Text> : null}
                  <Ionicons name="add-circle" size={28} color={VIOLET} />
                </Pressable>
              );
            })}
            <Pressable onPress={() => setVariantFor(null)} style={{ alignSelf: "center", padding: 10 }}>
              <Text style={{ color: VIOLET, fontSize: 16, fontWeight: "600" }}>Готово</Text>
            </Pressable>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 640, alignSelf: "center" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 12, height: 46, marginTop: 4, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 16, height: 46 },
  empty: { textAlign: "center", marginTop: 30, fontSize: 15, paddingHorizontal: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 10 },
  photo: { width: 64, height: 64, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  brand: { color: VIOLET, fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  price: { color: VIOLET, fontSize: 16, fontWeight: "700" },
  addBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 10 },
  cta: { height: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  variant: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 8 },
  variantImg: { width: 44, height: 44, borderRadius: 10 },
});

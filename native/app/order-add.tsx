import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl } from "@/api";
import { NO_LINES, useOrderEdit, type AddedLine } from "@/store/orderEdit";
import { CatalogStoreContext, usePickCatalog } from "@/store/catalog";
import { CatalogBrowser, type CatalogPick } from "@/components/CatalogBrowser";
import { Sheet } from "@/components/iosui/Sheet";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";
import type { Product, Variant } from "@/types";

const VIOLET = "#8b3dff";
const PICK_STORE = { store: usePickCatalog, name: "pick" as const };

/**
 * «Добавить товары» to an order the customer is changing: the full catalogue (same screen as the
 * «Каталог» tab, its own search/filters); «Добавить» puts the product (or one of its variants) into
 * the order's draft; the order screen shows them and saves everything.
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
  // every opening starts with a clean search (the «Каталог» tab keeps its own)
  useState(() => usePickCatalog.getState().reset());
  const draft = useOrderEdit((s) => (s.orderId === orderId ? s.added : NO_LINES));
  // chat mode: a separate list, the order's edit draft is not touched
  const [picked, setPicked] = useState<AddedLine[]>([]);
  const [sending, setSending] = useState(false);
  const added = chat ? picked : draft;
  const addLine = (oid: number, product: Product, quantity: number, variant?: { name: string; imageUrl: string } | null) => {
    if (!chat) return useOrderEdit.getState().add(oid, product, quantity, variant);
    const key = `${product.id}:${variant?.name ?? ""}`;
    setPicked((list) =>
      list.some((l) => l.key === key)
        ? list.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l))
        : [...list, { key, product, quantity, variantName: variant?.name ?? null, variantImageUrl: variant?.imageUrl ?? null }]
    );
  };
  /** new quantity of a picked line; below the minimum order it is removed */
  const setLineQty = (key: string, quantity: number, min: number) => {
    if (!chat) {
      const s = useOrderEdit.getState();
      return quantity < min ? s.remove(key) : s.setQty(key, quantity);
    }
    setPicked((list) => (quantity < min ? list.filter((l) => l.key !== key) : list.map((l) => (l.key === key ? { ...l, quantity } : l))));
  };

  const [variantFor, setVariantFor] = useState<{ product: Product; variants: Variant[] } | null>(null);
  const [checking, setChecking] = useState<number | null>(null);
  const variantCache = useRef(new Map<number, Variant[]>());

  const stepOf = (p: Product) => Math.max(1, p.minOrderQty ?? 1);

  const onAdd = async (p: Product) => {
    if (checking !== null) return;
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
    else addLine(orderId, p, stepOf(p));
  };

  // «− n +» on a card: plain products change by the minimum-order step, products with variants open the variant list
  const onStep = (p: Product, dir: 1 | -1) => {
    const lines = added.filter((l) => l.product.id === p.id);
    const plain = lines.find((l) => !l.variantName);
    if (!plain || lines.length > 1) return void onAdd(p);
    const step = stepOf(p);
    setLineQty(plain.key, plain.quantity + dir * step, step);
  };

  const counts = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of added) m.set(l.product.id, (m.get(l.product.id) ?? 0) + l.quantity);
    return m;
  }, [added]);

  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/order/${orderId}`);
  }, [orderId]);
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
  const bottomPad = Math.max(insets.bottom, 12);

  // the handlers change every render; the cards re-render only when the picked counts change
  const handlers = useRef({ onAdd, onStep });
  handlers.current = { onAdd, onStep };
  const stableAdd = useCallback((p: Product) => handlers.current.onAdd(p), []);
  const stableStep = useCallback((p: Product, dir: 1 | -1) => handlers.current.onStep(p, dir), []);
  const pick: CatalogPick = useMemo(
    () => ({
      title: chat ? "Добавить товар" : "Добавить товары",
      onBack: back,
      counts,
      busyId: checking,
      onAdd: stableAdd,
      onStep: stableStep,
      bottomSpace: bottomPad + 86,
    }),
    [chat, back, counts, checking, bottomPad, stableAdd, stableStep]
  );

  return (
    <View style={{ flex: 1 }}>
      <CatalogStoreContext.Provider value={PICK_STORE}>
        <CatalogBrowser pick={pick} />
      </CatalogStoreContext.Provider>

      {/* back to the order with what was picked */}
      <View style={[styles.bottom, { paddingBottom: bottomPad, backgroundColor: dark ? "rgba(33,16,50,0.97)" : "rgba(255,255,255,0.97)" }]}>
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
              const p = variantFor.product;
              const step = stepOf(p);
              const key = `${p.id}:${v.name}`;
              const n = added.find((l) => l.key === key)?.quantity ?? 0;
              const plus = () => {
                tap();
                addLine(orderId, p, step, { name: v.name, imageUrl: v.imageUrl });
              };
              return (
                <Pressable
                  key={v.id}
                  onPress={n > 0 ? undefined : plus}
                  disabled={n > 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Добавить ${v.name}`}
                  style={[styles.variant, { backgroundColor: dark ? "#2B193D" : "#F6F3FB" }]}
                >
                  <Image source={{ uri: imageUrl(v.imageUrl, 160) ?? undefined }} style={styles.variantImg} contentFit="cover" />
                  <Text style={{ flex: 1, color: c.label, fontSize: 15 }} numberOfLines={2}>{v.name}</Text>
                  {n > 0 ? (
                    <View style={styles.vStepper}>
                      <Pressable
                        hitSlop={6}
                        onPress={() => {
                          tap();
                          setLineQty(key, n - step, step);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={n <= step ? `Убрать ${v.name}` : `Уменьшить ${v.name}`}
                      >
                        <Ionicons name="remove-circle-outline" size={28} color={VIOLET} />
                      </Pressable>
                      <Text style={styles.vQty}>{n}</Text>
                      <Pressable hitSlop={6} onPress={plus} accessibilityRole="button" accessibilityLabel={`Добавить ещё ${v.name}`}>
                        <Ionicons name="add-circle" size={28} color={VIOLET} />
                      </Pressable>
                    </View>
                  ) : (
                    <Ionicons name="add-circle" size={28} color={VIOLET} />
                  )}
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
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 10 },
  cta: { height: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  variant: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 8 },
  variantImg: { width: 44, height: 44, borderRadius: 10 },
  vStepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  vQty: { color: VIOLET, fontWeight: "800", fontSize: 16, minWidth: 22, textAlign: "center" },
});

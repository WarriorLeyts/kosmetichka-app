import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { get } from "../api";
import { useIOS } from "../ios";
import { PRICE_TYPES, type PriceType, type ProductRow } from "../products";
import { toRow, usePickerCatalog, type CatalogProduct } from "../catalog";
import { useDesktop } from "../useDesktop";
import { Catalog } from "./Catalog";
import { tap } from "./ui";

export type Picked = { product: ProductRow; variant: { name: string; imageUrl: string } | null };
type Variant = { id: number; name: string; imageUrl: string };

/**
 * Full-screen catalog (the same as the «Товары» tab) to add a product to an order or send it to the chat;
 * variants are asked for when the product has them. `priceType` — the customer's prices shown first.
 */
export function ProductPicker({
  open, title, onClose, onPick, priceType: initialPrice, actionLabel = "Добавить",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onPick: (p: Picked) => void;
  priceType?: string | null;
  actionLabel?: string;
}) {
  const c = useIOS();
  const insets = useSafeAreaInsets();
  const desktop = useDesktop();
  const [priceType, setPriceType] = useState<PriceType>("retail");
  const [variantsFor, setVariantsFor] = useState<ProductRow | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const cache = useRef(new Map<number, Variant[]>());

  useEffect(() => {
    if (!open) return;
    // every opening starts from the product list, with the customer's price type
    setVariantsFor(null);
    setBusyId(null);
    setPriceType(initialPrice && (PRICE_TYPES as readonly string[]).includes(initialPrice) ? (initialPrice as PriceType) : "retail");
  }, [open, initialPrice]);

  const choose = useCallback(
    async (row: ProductRow, knownNoVariants = false) => {
      if (knownNoVariants) {
        onPick({ product: row, variant: null });
        return;
      }
      let list = cache.current.get(row.id);
      if (!list) {
        setBusyId(row.id);
        try {
          list = (await get<{ variants: Variant[] }>(`/api/admin/products/${row.id}/variants`)).variants ?? [];
        } catch {
          list = [];
        } finally {
          setBusyId(null);
        }
        cache.current.set(row.id, list);
      }
      if (list.length === 0) onPick({ product: row, variant: null });
      else {
        setVariants(list);
        setVariantsFor(row);
      }
    },
    [onPick]
  );
  const pickProduct = useCallback((p: CatalogProduct) => choose(toRow(p)), [choose]);
  // a scanned barcode: the admin row already says whether there are variants
  const pickScanned = useCallback((row: ProductRow) => choose(row, !row.hasVariants), [choose]);

  const wrap = desktop ? { width: "100%" as const, maxWidth: 1180, alignSelf: "center" as const, paddingHorizontal: 32 } : { paddingHorizontal: 16 };

  const head = (
    <View style={[styles.head, !desktop && { paddingHorizontal: 5 }]}>
      <Text style={[styles.title, { color: c.label }]} numberOfLines={1}>
        {title}
      </Text>
      <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Закрыть">
        <Text style={styles.close}>Закрыть</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={Platform.OS === "android" && variantsFor ? () => setVariantsFor(null) : onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: 12 }}>
        {open ? (
          <View style={{ flex: 1, display: variantsFor ? "none" : "flex" }}>
            <Catalog
              store={usePickerCatalog}
              top={head}
              priceType={priceType}
              onPriceType={setPriceType}
              onOpen={pickProduct}
              actionLabel={actionLabel}
              onAction={pickProduct}
              busyId={busyId}
              onScanHit={pickScanned}
            />
          </View>
        ) : null}
        {variantsFor ? (
          <View style={{ flex: 1 }}>
            <View style={[styles.head, wrap]}>
              <Pressable onPress={() => { tap(); setVariantsFor(null); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Назад" style={styles.back}>
                <Ionicons name="chevron-back" size={22} color="#8b3dff" />
                <Text style={styles.close}>Назад</Text>
              </Pressable>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Закрыть">
                <Text style={styles.close}>Закрыть</Text>
              </Pressable>
            </View>
            <View style={wrap}>
              <Text style={[styles.title, { color: c.label, marginBottom: 2 }]}>Выберите вариант</Text>
              <Text style={{ color: c.secondary, fontSize: 15, marginBottom: 8 }} numberOfLines={2}>
                {variantsFor.name}
              </Text>
            </View>
            <FlatList
              key={desktop ? "v6" : "v3"}
              data={variants}
              keyExtractor={(v) => String(v.id)}
              numColumns={desktop ? 6 : 3}
              contentContainerStyle={[{ paddingBottom: insets.bottom + 20 }, wrap, { paddingHorizontal: desktop ? 28 : 12 }]}
              renderItem={({ item: v }) => (
                <Pressable
                  onPress={() => { tap(); onPick({ product: variantsFor, variant: { name: v.name, imageUrl: v.imageUrl } }); }}
                  accessibilityRole="button"
                  accessibilityLabel={v.name}
                  style={({ pressed }) => [styles.variant, { flex: 1 / (desktop ? 6 : 3), backgroundColor: c.cell, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Image source={{ uri: v.imageUrl }} style={styles.variantImg} contentFit="contain" />
                  <Text style={{ color: c.label, fontSize: 13, textAlign: "center" }} numberOfLines={2}>
                    {v.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 12, paddingTop: 4 },
  title: { fontSize: 26, fontWeight: "700", flexShrink: 1 },
  close: { color: "#8b3dff", fontSize: 17, fontWeight: "600" },
  back: { flexDirection: "row", alignItems: "center", gap: 2 },
  variant: { margin: 4, borderRadius: 14, padding: 8, alignItems: "center", gap: 6 },
  variantImg: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: "#fff" },
});

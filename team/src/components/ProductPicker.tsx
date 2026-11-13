import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

export type Picked = { product: ProductRow; variant: { name: string; imageUrl: string } | null; quantity: number };
type Variant = { id: number; name: string; imageUrl: string };

/**
 * Full-screen catalog (the same as the «Товары» tab) to add a product to an order or send it to the chat;
 * variants are asked for when the product has them. `priceType` — the customer's prices shown first.
 */
export function ProductPicker({
  open, title, onClose, onPick, priceType: initialPrice, actionLabel = "Добавить", chooseQuantity = true,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onPick: (p: Picked) => void;
  priceType?: string | null;
  actionLabel?: string;
  chooseQuantity?: boolean;
}) {
  const c = useIOS();
  const insets = useSafeAreaInsets();
  const desktop = useDesktop();
  const [priceType, setPriceType] = useState<PriceType>("retail");
  const [variantsFor, setVariantsFor] = useState<ProductRow | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pending, setPending] = useState<Omit<Picked, "quantity"> | null>(null);
  const [quantity, setQuantity] = useState("1");
  const amount = Number(quantity);
  const validQuantity = /^\d+$/.test(quantity) && Number.isInteger(amount) && amount >= 1 && amount <= 100_000;
  const confirm = useCallback((selection: Omit<Picked, "quantity">) => {
    if (!chooseQuantity) {
      onPick({ ...selection, quantity: 1 });
      return;
    }
    setQuantity("1");
    setPending(selection);
  }, [chooseQuantity, onPick]);
  const cache = useRef(new Map<number, Variant[]>());

  useEffect(() => {
    if (!open) return;
    // every opening starts from the product list, with the customer's price type
    setPending(null);
    setVariantsFor(null);
    setBusyId(null);
    setPriceType(initialPrice && (PRICE_TYPES as readonly string[]).includes(initialPrice) ? (initialPrice as PriceType) : "retail");
  }, [open, initialPrice]);

  const choose = useCallback(
    async (row: ProductRow, knownNoVariants = false) => {
      if (knownNoVariants) {
        confirm({ product: row, variant: null });
        return;
      }
      let list = cache.current.get(row.id);
      if (!list) {
        setBusyId(row.id);
        try {
          list = (await get<{ variants: Variant[] }>(`/api/admin/products/${row.id}/variants`)).variants ?? [];
        } catch {
          // unknown whether it has shades / sizes: not added without the choice, not remembered as «none»
          setBusyId(null);
          Alert.alert("Не получилось загрузить варианты", "Проверьте интернет и нажмите на товар ещё раз.");
          return;
        }
        setBusyId(null);
        cache.current.set(row.id, list);
      }
      if (list.length === 0) confirm({ product: row, variant: null });
      else {
        setVariants(list);
        setVariantsFor(row);
      }
    },
    [confirm]
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
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={pending ? () => setPending(null) : Platform.OS === "android" && variantsFor ? () => setVariantsFor(null) : onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: 12 }}>
        {open ? (
          <View style={{ flex: 1, display: variantsFor || pending ? "none" : "flex" }}>
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
        {variantsFor && !pending ? (
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
                  onPress={() => { tap(); confirm({ product: variantsFor, variant: { name: v.name, imageUrl: v.imageUrl } }); }}
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
        {pending ? (
          <View style={[wrap, { paddingBottom: insets.bottom + 20, gap: 16 }]}>
            <View style={styles.head}>
              <Pressable onPress={() => setPending(null)} accessibilityRole="button" accessibilityLabel="Назад">
                <Text style={styles.close}>Назад</Text>
              </Pressable>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть">
                <Text style={styles.close}>Закрыть</Text>
              </Pressable>
            </View>
            <Text style={[styles.title, { color: c.label }]}>{pending.product.name}</Text>
            {pending.variant ? <Text style={{ color: c.secondary }}>{pending.variant.name}</Text> : null}
            <Text style={{ color: c.label, fontSize: 17 }}>Количество</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable disabled={!validQuantity || amount <= 1} onPress={() => setQuantity(String(amount - 1))} accessibilityRole="button" accessibilityLabel="Уменьшить количество" style={{ padding: 12, opacity: validQuantity && amount > 1 ? 1 : 0.4 }}>
                <Ionicons name="remove" size={24} color="#8b3dff" />
              </Pressable>
              <TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" selectTextOnFocus maxLength={6} accessibilityLabel="Количество товара" style={{ width: 100, padding: 12, fontSize: 20, textAlign: "center", color: c.label, backgroundColor: c.cell, borderRadius: 12 }} />
              <Pressable disabled={!validQuantity || amount >= 100_000} onPress={() => setQuantity(String(amount + 1))} accessibilityRole="button" accessibilityLabel="Увеличить количество" style={{ padding: 12, opacity: validQuantity && amount < 100_000 ? 1 : 0.4 }}>
                <Ionicons name="add" size={24} color="#8b3dff" />
              </Pressable>
            </View>
            {!validQuantity ? <Text style={{ color: c.secondary }}>Укажите целое число от 1 до 100 000</Text> : null}
            <Pressable disabled={!validQuantity} onPress={() => { tap(); onPick({ ...pending, quantity: amount }); }} accessibilityRole="button" style={{ padding: 16, borderRadius: 14, backgroundColor: "#8b3dff", opacity: validQuantity ? 1 : 0.4 }}>
              <Text style={{ color: "#fff", textAlign: "center", fontSize: 17, fontWeight: "600" }}>{actionLabel}{validQuantity ? ` · ${amount} шт.` : ""}</Text>
            </Pressable>
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

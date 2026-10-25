import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { get, imageUrl } from "../api";
import { money } from "../format";
import { useIOS } from "../ios";
import { searchProducts, type ProductRow } from "../products";
import { usePaged } from "../usePaged";
import { Chips, SearchField } from "./kit";
import { categories, type Category } from "../products";

export type Picked = { product: ProductRow; variant: { name: string; imageUrl: string } | null };

/** full-screen catalog search (as the site's «Каталог» in the order card); variants are asked for when the product has them */
export function ProductPicker({ open, title, onClose, onPick }: { open: boolean; title: string; onClose: () => void; onPick: (p: Picked) => void }) {
  const c = useIOS();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [variantsFor, setVariantsFor] = useState<ProductRow | null>(null);
  const [variants, setVariants] = useState<{ id: number; name: string; imageUrl: string }[] | null>(null);
  useEffect(() => {
    if (open) categories().then(setCats).catch(() => {});
    // every opening starts from the product list
    setVariantsFor(null);
    setVariants(null);
  }, [open]);
  const list = usePaged<ProductRow>((offset) => (open ? searchProducts(q, cat, offset) : Promise.resolve({ items: [], hasMore: false })), [q, cat, open]);

  const choose = async (p: ProductRow) => {
    if (!p.hasVariants) {
      onPick({ product: p, variant: null });
      return;
    }
    setVariantsFor(p);
    setVariants(null);
    try {
      const r = await get<{ variants: { id: number; name: string; imageUrl: string }[] }>(`/api/admin/products/${p.id}/variants`);
      setVariants(r.variants);
    } catch {
      setVariants([]);
    }
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: 12 }}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: c.label }]}>{variantsFor ? "Выберите вариант" : title}</Text>
          <Pressable onPress={variantsFor ? () => setVariantsFor(null) : onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={variantsFor ? "Назад" : "Закрыть"}>
            <Text style={styles.close}>{variantsFor ? "Назад" : "Закрыть"}</Text>
          </Pressable>
        </View>
        {variantsFor ? (
          variants === null ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#8b3dff" />
          ) : (
            <FlatList
              data={variants}
              keyExtractor={(v) => String(v.id)}
              numColumns={3}
              contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}
              ListEmptyComponent={
                <Pressable onPress={() => onPick({ product: variantsFor, variant: null })} style={{ padding: 20 }}>
                  <Text style={{ color: "#8b3dff", textAlign: "center", fontSize: 16 }}>Вариантов нет — добавить товар</Text>
                </Pressable>
              }
              renderItem={({ item: v }) => (
                <Pressable onPress={() => onPick({ product: variantsFor, variant: { name: v.name, imageUrl: v.imageUrl } })} style={[styles.variant, { backgroundColor: c.cell }]}>
                  <Image source={{ uri: v.imageUrl }} style={styles.variantImg} contentFit="contain" />
                  <Text style={{ color: c.label, fontSize: 13, textAlign: "center" }} numberOfLines={2}>
                    {v.name}
                  </Text>
                </Pressable>
              )}
            />
          )
        ) : (
          <FlatList
            data={list.items}
            keyExtractor={(p) => String(p.id)}
            keyboardShouldPersistTaps="handled"
            onEndReached={list.more}
            onEndReachedThreshold={0.4}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 20 }}
            ListHeaderComponent={
              <>
                <SearchField value={q} onChange={setQ} placeholder="Название, артикул, штрихкод" />
                {cats.length ? <Chips items={[{ value: "", label: "Все" }, ...cats.filter((x) => !x.parentGuid).map((t) => ({ value: t.guid, label: t.name }))]} value={cat} onChange={setCat} /> : null}
              </>
            }
            ListEmptyComponent={list.loading ? <ActivityIndicator style={{ marginTop: 30 }} color="#8b3dff" /> : <Text style={{ color: c.secondary, textAlign: "center", marginTop: 30 }}>Ничего не найдено</Text>}
            ListFooterComponent={list.loadingMore ? <ActivityIndicator style={{ marginVertical: 14 }} color="#8b3dff" /> : null}
            renderItem={({ item: p }) => (
              <Pressable onPress={() => choose(p)} style={({ pressed }) => [styles.row, { backgroundColor: c.cell, opacity: pressed ? 0.8 : 1 }]}>
                <View style={styles.thumb}>
                  {p.imagePath ? <Image source={{ uri: imageUrl(p.imagePath) ?? undefined }} style={{ width: "90%", height: "90%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={22} color="#C7C7CC" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.label, fontSize: 15, fontWeight: "600" }} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 2 }}>
                    {(p.stock ?? 0) > 0 ? `В наличии: ${p.stock}` : "Нет в наличии"}
                    {p.hasVariants ? " · варианты" : ""}
                  </Text>
                </View>
                <Text style={{ color: "#e82c87", fontWeight: "700" }}>{money(p.price)}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", flexShrink: 1 },
  close: { color: "#8b3dff", fontSize: 17, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 10, marginBottom: 8 },
  thumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  variant: { flex: 1 / 3, margin: 4, borderRadius: 14, padding: 8, alignItems: "center", gap: 6 },
  variantImg: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: "#fff" },
});

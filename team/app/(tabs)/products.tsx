import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { ListScreen } from "@/components/ListScreen";
import { Card, Chips, Empty, ErrorState, Loading, SearchField } from "@/components/kit";
import { usePaged } from "@/usePaged";
import { categories, searchProducts, type Category, type ProductRow } from "@/products";
import { imageUrl } from "@/api";
import { money } from "@/format";
import { useIOS } from "@/ios";

/** Товары: search by name / article / barcode, top categories, stock and wholesale price. */
export default function Products() {
  const c = useIOS();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    categories().then(setCats).catch(() => {});
  }, []);
  const list = usePaged<ProductRow>((offset) => searchProducts(q, cat, offset), [q, cat]);
  const tops = cats.filter((x) => !x.parentGuid);

  return (
    <ListScreen
      tab
      title="Товары"
      data={list.items}
      keyOf={(p) => String(p.id)}
      onRefresh={list.reload}
      onEnd={list.more}
      loadingMore={list.loadingMore}
      header={
        <>
          <SearchField value={q} onChange={setQ} placeholder="Название, артикул, штрихкод" />
          {tops.length ? <Chips items={[{ value: "", label: "Все" }, ...tops.map((t) => ({ value: t.guid, label: t.name }))]} value={cat} onChange={setCat} /> : null}
        </>
      }
      empty={list.loading ? <Loading /> : list.error ? <ErrorState text={list.error} onRetry={list.reload} /> : <Empty icon="cube-outline" text="Ничего не найдено" />}
      renderItem={({ item: p }) => (
        <Card onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(p.id) } })} style={styles.row}>
          <View style={styles.thumb}>
            {p.imagePath ? <Image source={{ uri: imageUrl(p.imagePath, 160) ?? undefined }} style={styles.img} contentFit="contain" /> : <Ionicons name="image-outline" size={26} color="#C7C7CC" />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.label }]} numberOfLines={2}>
              {p.name}
            </Text>
            <Text style={[styles.meta, { color: c.secondary }]} numberOfLines={1}>
              {[p.article && `Арт. ${p.article}`, p.barcode].filter(Boolean).join(" · ") || "—"}
            </Text>
            <View style={styles.bottom}>
              <Text style={[styles.stock, { color: (p.stock ?? 0) > 0 ? "#16A34A" : "#DC2626" }]}>{(p.stock ?? 0) > 0 ? `В наличии: ${p.stock}` : "Нет в наличии"}</Text>
              {p.price > 0 ? <Text style={styles.price}>{money(p.price)}</Text> : null}
            </View>
            {p.hasVariants ? <Text style={[styles.meta, { color: "#8b3dff" }]}>Есть варианты</Text> : null}
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12 },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "90%", height: "90%" },
  name: { fontSize: 15.5, fontWeight: "600", lineHeight: 20 },
  meta: { fontSize: 13, marginTop: 3 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  stock: { fontSize: 13, fontWeight: "600" },
  price: { color: "#e82c87", fontWeight: "700", fontSize: 15 },
});

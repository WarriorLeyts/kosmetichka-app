import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ListScreen } from "@/components/ListScreen";
import { Card, Chips, Empty, ErrorState, Loading, SearchField, VIOLET } from "@/components/kit";
import { Scanner } from "@/components/Scanner";
import { usePaged } from "@/usePaged";
import { categories, priceOf, PRICE_LABELS, PRICE_TYPES, searchProducts, type Category, type PriceType, type ProductRow } from "@/products";
import { imageUrl } from "@/api";
import { money } from "@/format";
import { useIOS } from "@/ios";
import { useDesktop } from "@/useDesktop";
import { tap } from "@/components/ui";

/** 3D icons of the main categories — the same as in the customer app's category menu */
const ICONS = {
  all: require("../../assets/categories/all.png"),
  perfume: require("../../assets/categories/perfume.png"),
  accessories: require("../../assets/categories/accessories.png"),
  body: require("../../assets/categories/body.png"),
  mouth: require("../../assets/categories/mouth.png"),
  nocat: require("../../assets/categories/nocat.png"),
  household: require("../../assets/categories/household.png"),
  decor: require("../../assets/categories/decor.png"),
  gift: require("../../assets/categories/gift.png"),
  depilation: require("../../assets/categories/depilation.png"),
  face: require("../../assets/categories/face.png"),
  hair: require("../../assets/categories/hair.png"),
  hands: require("../../assets/categories/hands.png"),
  pro: require("../../assets/categories/pro.png"),
  hygiene: require("../../assets/categories/hygiene.png"),
  bags: require("../../assets/categories/bags.png"),
  home: require("../../assets/categories/home.png"),
};
function iconFor(name: string): number | null {
  const n = name.toLowerCase();
  const map: [RegExp, keyof typeof ICONS][] = [
    [/^профессион|парикмах/, "pro"],
    [/^гигиен/, "hygiene"],
    [/^пакет/, "bags"],
    [/^товары для дома/, "home"],
    [/парфю|духи|аромат/, "perfume"],
    [/аксессуар/, "accessories"],
    [/полост|зуб|рта/, "mouth"],
    [/без категор/, "nocat"],
    [/бытов|хими|уборк/, "household"],
    [/декоратив|макияж/, "decor"],
    [/подароч|набор/, "gift"],
    [/депиляц|бритв/, "depilation"],
    [/лиц/, "face"],
    [/волос/, "hair"],
    [/ног|рук|ногт|маникюр/, "hands"],
    [/тел/, "body"],
  ];
  for (const [re, k] of map) if (re.test(n)) return ICONS[k];
  return null;
}

const PRICE_KEY = "team-products-price";
const SHORT: Record<PriceType, string> = { retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Крупный опт" };
let lastPrice: PriceType = "wholesale";

/**
 * Товары — the catalogue as in the customer app: main categories as tiles, then sub-categories down to
 * the products; search by name / article / barcode (typed, from a USB scanner or the camera);
 * which price to show — Розница / Скидка по карте / Опт / Крупный опт (prices are read only, they come from 1C).
 */
export default function Products() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const desktop = useDesktop();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null); // null + !all → the category tiles
  const [all, setAll] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [priceType, setPriceType] = useState<PriceType>(lastPrice);
  const [scan, setScan] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  useEffect(() => {
    categories().then(setCats).catch(() => {});
    AsyncStorage.getItem(PRICE_KEY)
      .then((v) => {
        if (v && (PRICE_TYPES as readonly string[]).includes(v)) setPriceType((lastPrice = v as PriceType));
      })
      .catch(() => {});
  }, []);
  const choosePrice = (v: PriceType) => {
    lastPrice = v;
    setPriceType(v);
    AsyncStorage.setItem(PRICE_KEY, v).catch(() => {});
  };

  // the tree: a single root wrapper («Каталог») is skipped, as in the customer app
  const tree = useMemo(() => {
    const byParent = new Map<string, Category[]>();
    for (const x of cats) {
      const k = x.parentGuid ?? "";
      const arr = byParent.get(k);
      if (arr) arr.push(x);
      else byParent.set(k, [x]);
    }
    const roots = byParent.get("") ?? [];
    const rootGuid = roots.length === 1 ? roots[0].guid : null;
    const top = rootGuid ? byParent.get(rootGuid) ?? [] : roots;
    const byGuid = new Map(cats.map((x) => [x.guid, x]));
    return { byParent, top, rootGuid, byGuid };
  }, [cats]);
  const childrenOf = (g: string) => tree.byParent.get(g) ?? [];
  // «Категории › Лицо › Очищение»
  const path = useMemo(() => {
    const out: Category[] = [];
    let g = cat;
    while (g && g !== tree.rootGuid) {
      const x = tree.byGuid.get(g);
      if (!x || out.includes(x)) break;
      out.unshift(x);
      g = x.parentGuid;
    }
    return out;
  }, [cat, tree]);

  const searching = q.trim().length >= 2;
  const browsing = !searching && !cat && !all;
  const list = usePaged<ProductRow>(
    (offset) => (browsing ? Promise.resolve({ items: [], hasMore: false }) : searchProducts(q, cat ?? "", offset)),
    [q, cat, browsing]
  );

  const openCat = (g: string | null) => {
    tap();
    setAll(false);
    setCat(g);
  };

  const onScanned = async (code: string) => {
    setScan(false);
    setQ(code);
    try {
      const r = await searchProducts(code, "", 0, 5);
      if (r.items.length === 1) router.push({ pathname: "/product/[id]", params: { id: String(r.items[0].id) } });
      else if (r.items.length === 0) setScanMsg(`Товар со штрихкодом ${code} не найден`);
      else setScanMsg("");
    } catch {
      /* the list below shows the search */
    }
  };

  const tileBg = dark ? "#2B193D" : "#fff";
  const subs = cat ? childrenOf(cat) : [];

  const header = (
    <>
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchField
            value={q}
            onChange={(v) => {
              setScanMsg("");
              setQ(v);
            }}
            placeholder="Название, артикул, штрихкод"
          />
        </View>
        <Pressable
          onPress={() => {
            tap();
            setScanMsg("");
            setScan(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Сканировать штрихкод"
          style={[styles.scanBtn, { backgroundColor: dark ? "rgba(255,255,255,0.08)" : "rgba(139,61,255,0.1)" }]}
        >
          <Ionicons name="barcode-outline" size={24} color={VIOLET} />
        </Pressable>
      </View>
      {scanMsg ? <Text style={[styles.scanMsg, { color: "#DC2626" }]}>{scanMsg}</Text> : null}

      <Text style={[styles.caption, { color: c.secondary }]}>Цены</Text>
      <Chips items={PRICE_TYPES.map((t) => ({ value: t, label: SHORT[t] }))} value={priceType} onChange={choosePrice} />

      {browsing ? (
        <>
          <Pressable onPress={() => { tap(); setAll(true); }} accessibilityRole="button" accessibilityLabel="Все товары">
            <LinearGradient colors={["#a020f0", "#c21ae8", "#e82c87"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.allTile}>
              <Image source={ICONS.all} style={{ width: 46, height: 46 }} contentFit="contain" />
              <Text style={styles.allText}>Все товары</Text>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
          {tree.top.length === 0 ? <Loading /> : null}
          <View style={styles.grid}>
            {tree.top.map((t) => {
              const icon = iconFor(t.name);
              return (
                <View key={t.guid} style={{ width: desktop ? "25%" : "50%", padding: 6 }}>
                  <Pressable
                    onPress={() => openCat(t.guid)}
                    accessibilityRole="button"
                    accessibilityLabel={t.name}
                    style={({ pressed }) => [styles.tile, { backgroundColor: tileBg, transform: [{ scale: pressed ? 0.98 : 1 }] }, !dark && styles.shadow]}
                  >
                    {icon ? <Image source={icon} style={styles.icon} contentFit="contain" /> : <Ionicons name="pricetags-outline" size={40} color={VIOLET} style={{ marginBottom: 8 }} />}
                    <Text numberOfLines={2} style={[styles.tileText, { color: c.label }]}>
                      {t.name}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <>
          {/* where we are: Категории › … — every step can be tapped */}
          <View style={styles.crumbs}>
            <Pressable onPress={() => openCat(null)} accessibilityRole="button" style={styles.crumbBack}>
              <Ionicons name="chevron-back" size={18} color={VIOLET} />
              <Text style={styles.crumbLink}>Категории</Text>
            </Pressable>
            {all && !cat ? <Text style={[styles.crumbHere, { color: c.label }]}>› Все товары</Text> : null}
            {path.map((x, i) => (
              <Pressable key={x.guid} onPress={() => i < path.length - 1 && openCat(x.guid)} disabled={i === path.length - 1}>
                <Text style={i === path.length - 1 ? [styles.crumbHere, { color: c.label }] : styles.crumbLink}>› {x.name}</Text>
              </Pressable>
            ))}
          </View>
          {subs.length && !searching ? (
            <View style={styles.subs}>
              {subs.map((s) => (
                <Pressable
                  key={s.guid}
                  onPress={() => openCat(s.guid)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.sub, { backgroundColor: tileBg, opacity: pressed ? 0.85 : 1 }, !dark && styles.shadow]}
                >
                  <Text style={[styles.subText, { color: c.label }]} numberOfLines={2}>
                    {s.name}
                  </Text>
                  {childrenOf(s.guid).length ? <Ionicons name="chevron-forward" size={16} color={VIOLET} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          {searching && cat ? <Text style={[styles.caption, { color: c.secondary, marginTop: 0 }]}>Поиск в «{path[path.length - 1]?.name ?? ""}»</Text> : null}
        </>
      )}
    </>
  );

  return (
    <>
      <ListScreen
        tab
        title="Товары"
        data={browsing ? [] : list.items}
        keyOf={(p) => String(p.id)}
        onRefresh={list.reload}
        onEnd={list.more}
        loadingMore={list.loadingMore}
        header={header}
        empty={browsing ? null : list.loading ? <Loading /> : list.error ? <ErrorState text={list.error} onRetry={list.reload} /> : <Empty icon="cube-outline" text="Ничего не найдено" />}
        renderItem={({ item: p }) => {
          const price = priceOf(p.prices, priceType);
          return (
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
                  <Text style={[styles.stock, { color: (p.stock ?? 0) > 0 ? "#16A34A" : "#DC2626" }]}>{(p.stock ?? 0) > 0 ? `Остаток: ${p.stock} шт.` : "Нет в наличии"}</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.priceLabel, { color: c.secondary }]}>{PRICE_LABELS[priceType]}</Text>
                    <Text style={styles.price}>{price > 0 ? money(price) : "—"}</Text>
                  </View>
                </View>
                {p.hasVariants ? <Text style={[styles.meta, { color: VIOLET }]}>Есть варианты</Text> : null}
              </View>
            </Card>
          );
        }}
      />
      <Scanner open={scan} onClose={() => setScan(false)} onCode={onScanned} />
    </>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  scanBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  scanMsg: { fontSize: 14, fontWeight: "600", marginTop: -4, marginBottom: 10, marginLeft: 4 },
  caption: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginLeft: 4 },
  allTile: { flexDirection: "row", alignItems: "center", gap: 14, height: 64, borderRadius: 22, paddingHorizontal: 18, marginBottom: 6 },
  allText: { flex: 1, color: "#fff", fontSize: 19, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, marginBottom: 8 },
  tile: { minHeight: 124, borderRadius: 20, alignItems: "center", justifyContent: "center", padding: 14 },
  shadow: { boxShadow: "0 3px 12px rgba(80,50,140,0.07)" },
  icon: { width: 58, height: 58, marginBottom: 6 },
  tileText: { fontSize: 15, fontWeight: "600", textAlign: "center", lineHeight: 19 },
  crumbs: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 12 },
  crumbBack: { flexDirection: "row", alignItems: "center", gap: 2 },
  crumbLink: { color: VIOLET, fontSize: 15, fontWeight: "600" },
  crumbHere: { fontSize: 15, fontWeight: "700" },
  subs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  sub: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "100%" },
  subText: { fontSize: 14.5, fontWeight: "600", flexShrink: 1 },
  row: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12 },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "90%", height: "90%" },
  name: { fontSize: 15.5, fontWeight: "600", lineHeight: 20 },
  meta: { fontSize: 13, marginTop: 3 },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6, gap: 8 },
  stock: { fontSize: 13, fontWeight: "600" },
  priceLabel: { fontSize: 11 },
  price: { color: "#e82c87", fontWeight: "700", fontSize: 15 },
});

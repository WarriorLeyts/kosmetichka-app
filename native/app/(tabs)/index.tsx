import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl } from "@/api";
import { colors, fonts, themed, useTheme } from "@/theme";
import { topCategories, useCatalog } from "@/store/catalog";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { categoryIcon } from "@/categoryIcon";
import { ProductCard } from "@/components/ProductCard";
import { SideMenu } from "@/components/SideMenu";
import { Silk } from "@/components/Silk";
import { LOGO } from "@/components/PageTitle";
import { IconButton, SearchBar, tap } from "@/components/ui";
import { useAddToCart } from "@/useAddToCart";
import type { Product } from "@/types";

export default function Home() {
  const insets = useSafeAreaInsets();
  const mode = useTheme((s) => s.mode);
  const toggleTheme = useTheme((s) => s.toggle);
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const { categories, loadMeta } = useCatalog();
  const addToCart = useAddToCart();

  const [menu, setMenu] = useState(false);
  const [fresh, setFresh] = useState<Product[]>([]);
  const [sale, setSale] = useState<Product[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    loadMeta();
    api.homeStats().then((s) => setTotal(s.totalProducts)).catch(() => {});
    api.catalog({ page: 1, quick: ["new"], onlyStock: true }).then((r) => setFresh(r.products.slice(0, 12))).catch(() => {});
    api.catalog({ page: 1, quick: ["sale"], onlyStock: true }).then((r) => setSale(r.products.slice(0, 1))).catch(() => {});
  }, [loadMeta]);

  const active = effectivePriceType(cart, customer);
  const tops = topCategories(categories).filter((c) => !c.name.startsWith("<")).slice(0, 12);
  const heroImg = imageUrl(fresh[0]?.images?.[0]?.path);
  const saleImg = imageUrl(sale[0]?.images?.[0]?.path);

  const openCatalog = (patch: Parameters<ReturnType<typeof useCatalog.getState>["set"]>[0]) => {
    tap();
    useCatalog.getState().reset();
    useCatalog.getState().set(patch);
    router.navigate("/catalog");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <Pressable onPress={() => { tap(); setMenu(true); }} hitSlop={8} style={styles.menuBtn}>
            <Ionicons name="menu" size={24} color={colors.text} />
          </Pressable>
          <Image source={LOGO} style={{ width: 34, height: 34 }} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>КОСМЕТИЧКА</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {total ? `Опт и розница · ${total.toLocaleString("ru-RU")} товаров` : "Опт и розница"}
            </Text>
          </View>
          <IconButton name={mode === "dark" ? "sunny-outline" : "moon-outline"} onPress={toggleTheme} />
          <IconButton name="heart-outline" onPress={() => router.push("/favorites")} badge={favorites.length || undefined} />
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <SearchBar
            onPress={() => openCatalog({})}
            right={
              <Pressable onPress={() => { tap(); router.push("/scanner"); }} hitSlop={10}>
                <Ionicons name="barcode-outline" size={21} color={colors.pink} />
              </Pressable>
            }
          />
        </View>

        {/* hero banner */}
        <Pressable onPress={() => openCatalog({ quick: ["new"] })} style={styles.hero}>
          <Silk />
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>НОВАЯ{"\n"}КОЛЛЕКЦИЯ</Text>
            <Text style={styles.heroSub}>Новинки этого месяца</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Смотреть</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
          {heroImg ? (
            <View style={styles.heroPhoto}>
              <Image source={{ uri: heroImg }} style={{ width: "86%", height: "86%" }} contentFit="contain" />
            </View>
          ) : null}
        </Pressable>

        {/* category tiles */}
        {tops.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
            {tops.map((c) => (
              <Pressable key={c.guid} onPress={() => openCatalog({ categoryGuid: c.guid })} style={styles.tile}>
                <Ionicons name={categoryIcon(c.name)} size={26} color={colors.pink} />
                <Text style={styles.tileText} numberOfLines={2}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* promo banner */}
        <Pressable onPress={() => openCatalog({ quick: ["sale"] })} style={[styles.hero, styles.promo]}>
          <Silk intensity={1.3} />
          <View style={[styles.heroText, { justifyContent: "center" }]}>
            <Text style={[styles.heroTitle, { fontSize: 30 }]}>СКИДКИ</Text>
            <Text style={styles.heroSub}>Товары со скидкой</Text>
          </View>
          {saleImg ? (
            <View style={[styles.heroPhoto, { width: 104, height: 104 }]}>
              <Image source={{ uri: saleImg }} style={{ width: "86%", height: "86%" }} contentFit="contain" />
            </View>
          ) : null}
          <View style={styles.promoMore}>
            <Text style={styles.pillText}>Смотреть</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </View>
        </Pressable>

        {!customer && (
          <Pressable style={styles.login} onPress={() => router.push("/login")}>
            <Ionicons name="pricetags-outline" size={20} color={colors.pink} />
            <Text style={styles.loginText}>Войдите, чтобы видеть оптовые цены и оформлять заказы</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        )}

        {fresh.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>НОВИНКИ</Text>
              <Pressable onPress={() => openCatalog({ quick: ["new"] })} hitSlop={8}>
                <Text style={styles.more}>Все →</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={fresh}
              keyExtractor={(p) => String(p.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 11 }}
              renderItem={({ item }) => (
                <View style={{ width: 172 }}>
                  <ProductCard
                    product={item}
                    customer={customer}
                    activePrice={active}
                    inCart={cart.find((c) => c.cartKey === String(item.id))?.quantity ?? 0}
                    isFavorite={favorites.some((f) => f.id === item.id)}
                    onAdd={addToCart}
                    onFavorite={toggleFav}
                  />
                </View>
              )}
            />
          </>
        )}
      </ScrollView>
      <SideMenu open={menu} onClose={() => setMenu(false)} />
    </View>
  );
}

const styles = themed(() => ({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10 },
  menuBtn: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
  brand: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, letterSpacing: 1.2, lineHeight: 24 },
  sub: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 178,
    borderRadius: 22,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255,79,168,0.35)",
  },
  heroText: { flex: 1, padding: 18, justifyContent: "space-between" },
  heroTitle: { fontFamily: fonts.serif, color: "#fff", fontSize: 30, lineHeight: 31, letterSpacing: 0.8 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12.5, marginTop: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#ff1f8e",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  heroPhoto: {
    width: 128,
    height: 148,
    marginRight: 14,
    alignSelf: "center",
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "6deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tiles: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  tile: {
    width: 82,
    height: 92,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  tileText: { fontSize: 10.5, color: colors.text, textAlign: "center", lineHeight: 13 },
  promo: { height: 128 },
  promoMore: { position: "absolute", right: 14, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  login: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.pinkSoft,
  },
  loginText: { flex: 1, color: colors.text, fontSize: 13.5, lineHeight: 18 },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 24, marginBottom: 6 },
  section: { fontFamily: fonts.serif, fontSize: 24, color: colors.text, letterSpacing: 1 },
  more: { color: colors.pink, fontWeight: "700", fontSize: 13 },
}));

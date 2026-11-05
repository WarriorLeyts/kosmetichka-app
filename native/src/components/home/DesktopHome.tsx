import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "@/ios";
import { tap } from "@/components/ui";
import { DESKTOP_WIDE } from "@/useDesktop";
import { CatalogCard } from "@/components/CatalogCard";
import { DesktopCategories } from "@/components/DesktopCategories";
import { PendingOrderNote, type useActiveOrders } from "@/components/home/PendingOrder";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { useAddToCart } from "@/useAddToCart";
import type { Quick } from "@/store/catalog";
import type { Category, Product } from "@/types";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";
const QUICK: { key: Quick; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "new", label: "Новинки", icon: "sparkles-outline" },
  { key: "sale", label: "Со скидкой", icon: "pricetag-outline" },
  { key: "gift", label: "Подарочные наборы", icon: "gift-outline" },
];

/**
 * Home on a computer: categories on the left (always open), on the right a banner, quick links and
 * «Новинки» as a grid of 5 — not the phone screen stretched wide.
 */
export function DesktopHome({
  categories,
  fresh,
  orders,
  openCatalog,
}: {
  categories: Category[];
  fresh: Product[];
  orders: ReturnType<typeof useActiveOrders>;
  openCatalog: (patch: { categoryGuid?: string | null; quick?: Quick[] }) => void;
}) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const addToCart = useAddToCart();
  const active = effectivePriceType(cart, customer);

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <DesktopCategories categories={categories} selected={null} onSelect={(guid) => openCatalog(guid ? { categoryGuid: guid } : {})} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
        <PendingOrderNote orders={orders} wide />

        <LinearGradient colors={[VIOLET, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Собираем ваш заказ</Text>
            <Text style={styles.heroText}>Сеть магазинов косметики и парфюмерии. Любимые средства — вместе, каждая деталь с заботой</Text>
            <Pressable
              onPress={() => openCatalog({})}
              accessibilityRole="button"
              style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.heroBtnText}>Перейти в каталог</Text>
              <Ionicons name="arrow-forward" size={18} color={VIOLET} />
            </Pressable>
          </View>
          <Image source={require("../../../assets/categories/gift.png")} style={styles.heroImg} contentFit="contain" />
        </LinearGradient>

        {!customer ? (
          <Pressable style={[styles.login, { backgroundColor: c.cell }]} onPress={() => router.push("/login")}>
            <Ionicons name="pricetags-outline" size={22} color={VIOLET} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.loginTitle, { color: c.label }]}>Войдите, чтобы видеть оптовые цены</Text>
              <Text style={{ color: c.secondary, marginTop: 2 }}>И оформлять заказы с подтверждением менеджера</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={VIOLET} />
          </Pressable>
        ) : null}

        <View style={styles.quickRow}>
          {QUICK.map((q) => (
            <Pressable
              key={q.key}
              onPress={() => openCatalog({ quick: [q.key] })}
              style={({ pressed }) => [styles.quick, { backgroundColor: c.cell, borderColor: dark ? "rgba(255,255,255,0.12)" : "#EDE3F7" }, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name={q.icon} size={18} color={PINK} />
              <Text style={[styles.quickText, { color: c.label }]}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {fresh.length > 0 ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={[styles.section, { color: c.label }]}>Новинки</Text>
              <Pressable onPress={() => openCatalog({ quick: ["new"] })} accessibilityRole="link" style={styles.all}>
                <Text style={[styles.allText, dark && { color: "#D7B8FF" }]}>Все новинки</Text>
                <Ionicons name="arrow-forward" size={17} color={dark ? "#D7B8FF" : "#8b2be0"} />
              </Pressable>
            </View>
            <View style={styles.grid}>
              {fresh.slice(0, 10).map((p) => (
                <View key={p.id} style={styles.cell}>
                  <CatalogCard
                    product={p}
                    customer={customer}
                    activePrice={active}
                    inCart={cart.find((x) => x.cartKey === String(p.id))?.quantity ?? 0}
                    isFavorite={favorites.some((f) => f.id === p.id)}
                    onAdd={addToCart}
                    onFavorite={toggleFav}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Pressable
          style={styles.contacts}
          onPress={() => {
            tap();
            router.push("/info");
          }}
        >
          <Ionicons name="call-outline" size={18} color={c.secondary} />
          <Text style={{ color: c.secondary, fontWeight: "600" }}>Контакты и документы</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", gap: 24, width: "100%", maxWidth: DESKTOP_WIDE, alignSelf: "center", paddingHorizontal: 20 },
  side: { paddingTop: 24, paddingBottom: 20 },
  main: { paddingTop: 24, paddingBottom: 40, gap: 18 },
  hero: { borderRadius: 26, paddingHorizontal: 34, paddingVertical: 26, flexDirection: "row", alignItems: "center", gap: 20, minHeight: 210, overflow: "hidden" },
  heroTitle: { color: "#fff", fontSize: 34, fontWeight: "800" },
  heroText: { color: "rgba(255,255,255,0.92)", fontSize: 16, lineHeight: 22, marginTop: 8, maxWidth: 440 },
  heroBtn: { marginTop: 18, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 24, paddingHorizontal: 22, height: 46 },
  heroBtnText: { color: VIOLET, fontSize: 16, fontWeight: "700" },
  heroImg: { width: 240, height: 190 },
  login: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 16 },
  loginTitle: { fontSize: 16, fontWeight: "700" },
  quickRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  quick: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, height: 44 },
  quickText: { fontSize: 15, fontWeight: "600" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  section: { fontSize: 24, fontWeight: "800" },
  all: { flexDirection: "row", alignItems: "center", gap: 6 },
  allText: { color: "#7a1ee8", fontSize: 16, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5, marginTop: -8 },
  cell: { width: "20%" },
  contacts: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingVertical: 14 },
});

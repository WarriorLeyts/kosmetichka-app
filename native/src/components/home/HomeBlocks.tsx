import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, imageUrl, type SiteBlock } from "@/api";
import { useLivePromo } from "@/promo";
import { useIOS } from "@/ios";
import { tap } from "@/components/ui";
import { ProductCard } from "@/components/ProductCard";
import { HomeCategories } from "@/components/home/HomeCategories";
import { ScrollStrip } from "@/components/home/ScrollStrip";
import { topCategories, type Quick } from "@/store/catalog";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useFavorites } from "@/store/favorites";
import { effectivePriceType } from "@/pricing";
import { useAddToCart } from "@/useAddToCart";
import type { Category, Product } from "@/types";
import { colors } from "@/theme";

const PINK = "#e82c87";

type OpenCatalog = (patch: { categoryGuid?: string | null; quick?: Quick[]; search?: string }) => void;

/** The published blocks cached for the session (one request per app start, refreshed in the background). */
const cachedBy: Record<"home" | "catalog", SiteBlock[] | null | undefined> = { home: undefined, catalog: undefined };
export function useSiteHome(page: "home" | "catalog" = "home"): SiteBlock[] | null | undefined {
  const [blocks, setBlocks] = useState(cachedBy[page]);
  useEffect(() => {
    let alive = true;
    api
      .siteHome(page)
      .then((r) => {
        cachedBy[page] = r.blocks;
        if (alive) setBlocks(r.blocks);
      })
      .catch(() => {
        if (alive && cachedBy[page] === undefined) setBlocks(null);
      });
    return () => {
      alive = false;
    };
  }, [page]);
  return blocks;
}

/** A link from the admin panel: «/catalog?quick=sale», «/product/12», any site page, or https://… */
export function openSiteLink(link: string | null | undefined, openCatalog: OpenCatalog) {
  if (!link) return;
  tap();
  if (/^https?:\/\//i.test(link)) {
    Linking.openURL(link).catch(() => {});
    return;
  }
  const [path, query = ""] = link.split("?");
  if (path === "/catalog" || path === "/catalog/") {
    const q = new URLSearchParams(query);
    const quick = q.getAll("quick").filter((x): x is Quick => x === "new" || x === "sale" || x === "gift");
    openCatalog({
      ...(quick.length ? { quick } : {}),
      ...(q.get("categoryGuid") ? { categoryGuid: q.get("categoryGuid") } : {}),
      ...(q.get("search") ? { search: q.get("search") as string } : {}),
    });
    return;
  }
  const m = path.match(/^\/product\/(\d+)\/?$/);
  if (m) {
    router.push(`/product/${m[1]}`);
    return;
  }
  router.push(link as never);
}

/** The promotion's banners (admin panel → Акция) — first on the home page while it runs. */
export function PromoHero({ desktop, openCatalog }: { desktop: boolean; openCatalog: OpenCatalog }) {
  const promo = useLivePromo();
  if (!promo?.banners.length) return null;
  return <Hero b={{ id: "promo", type: "hero", banners: promo.banners, intervalSec: 5 }} desktop={desktop} openCatalog={openCatalog} />;
}

function Hero({ b, desktop, openCatalog }: { b: Extract<SiteBlock, { type: "hero" }>; desktop: boolean; openCatalog: OpenCatalog }) {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const ref = useRef<ScrollView>(null);
  const [w, setW] = useState(0);
  const n = b.banners.length;
  // the slider takes the shape of the first banner's picture (a 3:1 or 3:4 banner is not cropped);
  // until it loads — the recommended 8:3 / 4:5
  const first = imageUrl(desktop ? b.banners[0]?.imageDesktop : b.banners[0]?.imageMobile);
  const [shape, setShape] = useState<{ src: string; ratio: number } | null>(null);
  const [lo, hi] = desktop ? [2, 4.5] : [0.6, 1.4];
  const ratio = shape && shape.src === first ? Math.min(hi, Math.max(lo, shape.ratio)) : desktop ? 8 / 3 : 4 / 5;
  useEffect(() => {
    if (n < 2 || !w) return;
    const t = setInterval(() => {
      setI((x) => {
        const next = (x + 1) % n;
        ref.current?.scrollTo({ x: next * w, animated: true });
        return next;
      });
    }, Math.max(2, b.intervalSec) * 1000);
    return () => clearInterval(t);
  }, [n, w, b.intervalSec]);
  return (
    <View style={[styles.heroWrap, !desktop && { marginHorizontal: 16 }]} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => w && setI(Math.round(e.nativeEvent.contentOffset.x / w))}
      >
        {b.banners.map((x, k) => {
          const src = imageUrl(desktop ? x.imageDesktop : x.imageMobile);
          return (
            <Pressable
              key={x.id}
              onPress={() => openSiteLink(x.link, openCatalog)}
              disabled={!x.link}
              accessibilityRole={x.link ? "link" : "image"}
              accessibilityLabel={x.title}
              style={{ width: w || width - 32, aspectRatio: ratio }}
            >
              {src ? (
                <Image
                  source={{ uri: src }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={150}
                  onLoad={k === 0 ? (e) => e.source.width && e.source.height && setShape({ src, ratio: e.source.width / e.source.height }) : undefined}
                />
              ) : null}
              {x.subtitle || x.buttonText ? (
                <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={styles.heroShade}>
                  {x.subtitle ? <Text style={[styles.heroText, desktop && { fontSize: 20 }]}>{x.subtitle}</Text> : null}
                  {x.buttonText ? (
                    <View style={styles.heroBtn}>
                      <Text style={styles.heroBtnText}>{x.buttonText}</Text>
                    </View>
                  ) : null}
                </LinearGradient>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {n > 1 ? (
        <View style={styles.dots}>
          {b.banners.map((x, k) => (
            <View key={x.id} style={[styles.dot, k === i && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ProductsRow({ b, openCatalog, desktop }: { b: Extract<SiteBlock, { type: "products" }>; openCatalog: OpenCatalog; desktop: boolean }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [items, setItems] = useState<Product[]>([]);
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const addToCart = useAddToCart();
  const active = effectivePriceType(cart, customer);
  // arrivals depend on who is signed in (retail — the shop, wholesale — also the warehouse)
  const key = JSON.stringify(b.query) + (b.query.arrivals ? `:${customer?.id ?? 0}` : "");
  useEffect(() => {
    let alive = true;
    const q = b.query;
    // «Новинки» / «Снова в наличии» from the admin panel: the customer's own arrivals (as on the standard home)
    const load = q.arrivals
      ? api.arrivals(q.arrivals).then((r) => r.products)
      : q.ids?.length
      ? api.productsByIds(q.ids).then((r) => {
          const byId = new Map(r.products.map((p) => [p.id, p]));
          return q.ids!.map((id) => byId.get(id)).filter((p): p is Product => !!p);
        })
      : api
          .catalog({ page: 1, quick: q.quick, sort: q.sort, categoryGuids: q.categoryGuid ? [q.categoryGuid] : undefined, onlyStock: q.onlyStock })
          .then((r) => r.products);
    load.then((list) => alive && setItems(list.slice(0, b.limit))).catch(() => {});
    return () => {
      alive = false;
    };
  }, [key, b.limit]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!items.length) return null;
  return (
    <View>
      <View style={[styles.sectionRow, !desktop && { marginHorizontal: 16 }]}>
        <Text style={[styles.section, { color: c.label }]}>{b.title}</Text>
        {b.moreLink ? (
          <Pressable onPress={() => openSiteLink(b.moreLink, openCatalog)} accessibilityRole="link" hitSlop={8} style={styles.all}>
            <Text style={[styles.allText, dark && { color: "#D7B8FF" }]}>{b.moreText || "Все"}</Text>
            <Ionicons name="arrow-forward" size={17} color={dark ? "#D7B8FF" : "#8b2be0"} />
          </Pressable>
        ) : null}
      </View>
      <ScrollStrip
        data={items}
        desktop={desktop}
        itemWidth={desktop ? 210 : 180}
        keyOf={(p) => String(p.id)}
        render={(item) => (
          <ProductCard
            product={item}
            customer={customer}
            activePrice={active}
            inCart={cart.find((x) => x.cartKey === String(item.id))?.quantity ?? 0}
            isFavorite={favorites.some((f) => f.id === item.id)}
            onAdd={addToCart}
            onFavorite={toggleFav}
          />
        )}
      />
    </View>
  );
}

/**
 * What came in the last 10 days and this customer can buy (retail — the shop, wholesale — the warehouse and
 * the shop; the site decides), as two strips: «Новинки» — came to the company for the first time,
 * «Снова в наличии» — brought again. A strip with nothing in it is hidden.
 */
export function ArrivalsRow({ desktop, openCatalog }: { desktop: boolean; openCatalog?: OpenCatalog }) {
  return (
    <View style={{ gap: desktop ? 22 : 18 }}>
      <ArrivalStrip kind="new" title="Новинки" desktop={desktop} onAll={openCatalog ? () => openCatalog({ quick: ["new"] }) : undefined} />
      <ArrivalStrip kind="back" title="Снова в наличии" desktop={desktop} />
    </View>
  );
}

function ArrivalStrip({ kind, title, desktop, onAll }: { kind: "new" | "back"; title: string; desktop: boolean; onAll?: () => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [items, setItems] = useState<Product[]>([]);
  const customer = useAuth((s) => s.customer);
  const cart = useCartStore((s) => s.items);
  const favorites = useFavorites((s) => s.items);
  const toggleFav = useFavorites((s) => s.toggle);
  const addToCart = useAddToCart();
  const active = effectivePriceType(cart, customer);
  const who = customer?.id ?? 0;
  useEffect(() => {
    let alive = true;
    api
      .arrivals(kind)
      .then((r) => alive && setItems(r.products.slice(0, 24)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [who, kind]);
  if (!items.length) return null;
  return (
    <View>
      <View style={[styles.sectionRow, !desktop && { marginHorizontal: 16 }]}>
        <Text style={[styles.section, { color: c.label }]}>{title}</Text>
        {onAll ? (
          <Pressable onPress={onAll} accessibilityRole="link" hitSlop={8} style={styles.all}>
            <Text style={[styles.allText, dark && { color: "#D7B8FF" }]}>Все</Text>
            <Ionicons name="arrow-forward" size={17} color={dark ? "#D7B8FF" : "#8b2be0"} />
          </Pressable>
        ) : null}
      </View>
      <ScrollStrip
        data={items}
        desktop={desktop}
        itemWidth={desktop ? 210 : 180}
        keyOf={(p) => String(p.id)}
        render={(item) => (
          <ProductCard
            product={item}
            customer={customer}
            activePrice={active}
            inCart={cart.find((x) => x.cartKey === String(item.id))?.quantity ?? 0}
            isFavorite={favorites.some((f) => f.id === item.id)}
            onAdd={addToCart}
            onFavorite={toggleFav}
          />
        )}
      />
    </View>
  );
}

/**
 * Home page content published in the admin panel: banners, categories, product strips, info blocks,
 * buttons — in the order chosen there. The header, search and order status above stay the app's own.
 */
export function HomeBlocks({
  blocks,
  categories,
  openCatalog,
  desktop = false,
  arrivals = true,
  promo = true,
}: {
  blocks: SiteBlock[];
  categories: Category[];
  openCatalog: OpenCatalog;
  desktop?: boolean;
  /** add «Новинки» / «Снова в наличии» after the banners — unless the page has them as its own blocks */
  arrivals?: boolean;
  /** the promotion's banners first (the home page) */
  promo?: boolean;
}) {
  const c = useIOS();
  const live = useLivePromo();
  const promoBanners = promo && live?.banners.length ? live.banners : null;
  if (promoBanners) {
    const ids = new Set(promoBanners.map((x) => x.id));
    blocks = [
      { id: "promo", type: "hero", banners: promoBanners, intervalSec: 5 },
      // the same banners are not shown twice
      ...blocks.map((b) => (b.type === "hero" ? { ...b, banners: b.banners.filter((x) => !ids.has(x.id)) } : b)),
    ];
  }
  const byGuid = new Map(categories.map((x) => [x.guid, x]));
  const autoArrivals = arrivals && !blocks.some((b) => b.type === "products" && b.query.arrivals);
  return (
    <View style={{ gap: desktop ? 22 : 18, paddingTop: desktop ? 0 : 8 }}>
      {/* «Новые поступления» right after the banners (or first, when there are none) */}
      {autoArrivals && !blocks.some((b) => b.type === "hero" && b.banners.length) ? <ArrivalsRow desktop={desktop} openCatalog={openCatalog} /> : null}
      {blocks.map((b, i) => {
        if (b.type === "hero")
          return b.banners.length ? (
            <View key={b.id} style={{ gap: desktop ? 22 : 18 }}>
              <Hero b={b} desktop={desktop} openCatalog={openCatalog} />
              {autoArrivals && blocks.findIndex((x) => x.type === "hero" && x.banners.length) === i ? <ArrivalsRow desktop={desktop} openCatalog={openCatalog} /> : null}
            </View>
          ) : null;
        if (b.type === "categories") {
          if (desktop) return null; // on a computer the categories are always in the left column
          const list = b.categories ? b.categories.map((x) => byGuid.get(x.guid)).filter((x): x is Category => !!x) : topCategories(categories).slice(0, b.limit);
          return list.length ? <HomeCategories key={b.id} title={b.title || "Категории товаров"} categories={list} onOpen={(guid) => openCatalog(guid ? { categoryGuid: guid } : {})} /> : null;
        }
        if (b.type === "products") return <ProductsRow key={b.id} b={b} openCatalog={openCatalog} desktop={desktop} />;
        if (b.type === "info") {
          const accent = b.tone === "accent";
          const body = (
            <View style={[styles.infoRow, desktop && { flexDirection: "row", alignItems: "center" }]}>
              {b.imageUrl ? <Image source={{ uri: imageUrl(b.imageUrl) ?? undefined }} style={[styles.infoImg, desktop && { width: 280, aspectRatio: 16 / 10 }]} contentFit="cover" /> : null}
              <View style={{ flex: desktop ? 1 : undefined, gap: 6 }}>
                {b.title ? <Text style={[styles.infoTitle, { color: accent ? "#fff" : c.label }]}>{b.title}</Text> : null}
                {b.text ? <Text style={[styles.infoText, { color: accent ? "rgba(255,255,255,0.92)" : c.secondary }]}>{b.text}</Text> : null}
                {b.buttonText && b.link ? (
                  <Pressable onPress={() => openSiteLink(b.link, openCatalog)} accessibilityRole="link" style={[styles.infoBtn, { backgroundColor: accent ? "#fff" : PINK }]}>
                    <Text style={{ color: accent ? colors.brand : "#fff", fontWeight: "800" }}>{b.buttonText}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
          return accent ? (
            <LinearGradient key={b.id} colors={[colors.brand, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.info, !desktop && { marginHorizontal: 16 }]}>
              {body}
            </LinearGradient>
          ) : (
            <View key={b.id} style={[styles.info, { backgroundColor: c.cell }, !desktop && { marginHorizontal: 16 }]}>
              {body}
            </View>
          );
        }
        if (b.type === "buttons") {
          return (
            <View key={b.id} style={!desktop ? { marginHorizontal: 16 } : undefined}>
              {b.title ? <Text style={[styles.section, { color: c.label, marginBottom: 10 }]}>{b.title}</Text> : null}
              <View style={styles.btnRow}>
                {b.items.map((it, k) => (
                  <Pressable key={k} onPress={() => openSiteLink(it.link, openCatalog)} accessibilityRole="link" style={({ pressed }) => [styles.chip, { backgroundColor: c.cell }, pressed && { opacity: 0.85 }]}>
                    <Text style={[styles.chipText, { color: c.label }]}>{it.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { borderRadius: 22, overflow: "hidden", backgroundColor: "#EDE3F7" },
  heroShade: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingTop: 40, gap: 8 },
  heroText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  heroBtn: { alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  heroBtnText: { color: "#2A1A3A", fontWeight: "800" },
  dots: { position: "absolute", bottom: 10, alignSelf: "center", flexDirection: "row", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)" },
  dotOn: { width: 16, backgroundColor: "#fff" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  section: { fontSize: 20, fontWeight: "900" },
  all: { flexDirection: "row", alignItems: "center", gap: 4 },
  allText: { color: "#8b2be0", fontWeight: "800", fontSize: 14 },
  info: { borderRadius: 22, padding: 18, overflow: "hidden" },
  infoRow: { gap: 14 },
  infoImg: { width: "100%", aspectRatio: 16 / 9, borderRadius: 14 },
  infoTitle: { fontSize: 19, fontWeight: "900" },
  infoText: { fontSize: 14, lineHeight: 20 },
  infoBtn: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: 6 },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 16, height: 42, justifyContent: "center", borderWidth: 1, borderColor: "rgba(121,37,214,0.16)" },
  chipText: { fontWeight: "800", fontSize: 14 },
});

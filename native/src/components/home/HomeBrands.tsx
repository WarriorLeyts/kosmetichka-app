import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/api";
import { brandLogo } from "@/brandLogos";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";
import { colors } from "@/theme";

type Brand = { guid: string; name: string; count: number };
// Keep the public/customer catalogues separate, and reuse the result when returning home.
const cached = new Map<number, { at: number; brands: Brand[] }>();

/** The same brand entry points below both the built-in and CMS home, on web and phones. */
export function HomeBrands({ desktop = false, openCatalog }: {
  desktop?: boolean;
  openCatalog: (patch: { brandGuids: string[] }) => void;
}) {
  const c = useIOS();
  const customerId = useAuth((s) => s.customer?.id ?? 0);
  const authLoading = useAuth((s) => s.loading);
  const [loaded, setLoaded] = useState<{ owner: number; brands: Brand[] } | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (authLoading) return;
    const saved = cached.get(customerId);
    if (saved && Date.now() - saved.at < 5 * 60_000) {
      setLoaded({ owner: customerId, brands: saved.brands });
      return;
    }
    const controller = new AbortController();
    api.brandFacets({}, controller.signal).then(({ brands }) => {
      if (controller.signal.aborted) return;
      // Facets already exclude hidden products and sort by assortment size. No empty or
      // "Без бренда" cards: only real brands with an existing logo, each GUID once.
      const seen = new Set<string>();
      const shown = brands.filter((b) => {
        if (!b.guid || b.count <= 0 || !brandLogo(b.name) || seen.has(b.guid)) return false;
        seen.add(b.guid);
        return true;
      }).slice(0, 12);
      cached.set(customerId, { at: Date.now(), brands: shown });
      setLoaded({ owner: customerId, brands: shown });
    }).catch(() => { /* Home remains usable when the catalogue is temporarily offline. */ });
    return () => controller.abort();
  }, [customerId, authLoading]);

  const brands = loaded?.owner === customerId ? loaded.brands : [];
  if (!brands.length) return null;
  const columns = width >= 900 ? 6 : width >= 600 ? 4 : width >= 330 ? 3 : 2;
  return (
    <View style={[styles.section, !desktop && styles.phone]} onLayout={(e) => setWidth(e.nativeEvent.layout.width - (desktop ? 0 : 32))}>
      <Text accessibilityRole="header" style={[styles.title, { color: c.label }, desktop && styles.desktopTitle]}>Ваши любимые бренды</Text>
      <Text style={[styles.subtitle, { color: c.secondary }]}>Косметика и парфюмерия — выбирайте бренд и открывайте его товары</Text>
      <View style={styles.grid}>
        {brands.map((brand) => (
          <View key={brand.guid} style={[styles.slot, { width: `${100 / columns}%` }]}>
            <BrandTile brand={brand} desktop={desktop} onPress={() => openCatalog({ brandGuids: [brand.guid] })} />
          </View>
        ))}
      </View>
    </View>
  );
}

function BrandTile({ brand, desktop, onPress }: { brand: Brand; desktop: boolean; onPress: () => void }) {
  const c = useIOS();
  const [failed, setFailed] = useState(false);
  const logo = brandLogo(brand.name)!;
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`Все товары бренда ${brand.name}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.cell, opacity: pressed ? 0.7 : 1 }, desktop && styles.desktopTile]}>
      <View style={[styles.logoBox, desktop && styles.desktopLogoBox]}>
        {failed ? <Text style={styles.wordmark} numberOfLines={2}>{brand.name}</Text> : (
          <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" onError={() => setFailed(true)} accessibilityLabel={`Логотип ${brand.name}`} />
        )}
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: c.label }]} numberOfLines={2}>{brand.name}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.brand} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 30, marginBottom: 4 },
  phone: { paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "800", lineHeight: 30 },
  desktopTitle: { fontSize: 28, lineHeight: 34 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 16, maxWidth: 580 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  slot: { padding: 5 },
  tile: { borderRadius: 20, padding: 10, minHeight: 132, gap: 10 },
  desktopTile: { minHeight: 148, padding: 12 },
  logoBox: { height: 64, borderRadius: 12, backgroundColor: "#fff", padding: 9, justifyContent: "center", alignItems: "center" },
  desktopLogoBox: { height: 76 },
  logo: { width: "100%", height: "100%" },
  wordmark: { color: "#21142D", fontSize: 14, fontWeight: "800", textAlign: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  label: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: "700", lineHeight: 17 },
});

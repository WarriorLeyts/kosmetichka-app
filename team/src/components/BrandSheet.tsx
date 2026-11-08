import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { brandLogo } from "@/brandLogos";
import { useIOS } from "@/ios";
import { Sheet } from "@/components/iosui/Sheet";
import { GradientButton } from "@/components/iosui/Buttons";
import { tap } from "@/components/ui";
import { brandFacets, categoryGuidsFor, type CatalogStore } from "@/catalog";
import { plural } from "@/format";
import { SUB_FILTERS } from "@/subFilters";

type Facet = { guid: string; name: string; count: number };
type Store = CatalogStore;

/**
 * «Бренд» in the catalogue: the brands of what the search / filters found (with how many products),
 * a search over them, ticks (several at once), «Сбросить» and «Показать N товаров».
 */
export function BrandSheet({ open, onClose, store }: { open: boolean; onClose: () => void; store: Store }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const { height } = useWindowDimensions();
  const [brands, setBrands] = useState<Facet[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");

  // each opening: the current choice, and the brands of what is found now
  useEffect(() => {
    if (!open) return;
    const s = store.getState();
    setPicked(s.brandGuids);
    setQ("");
    setError("");
    setBrands(null);
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const type = s.categoryGuid && s.typeLabel ? SUB_FILTERS[s.categoryGuid]?.find((x) => x.label === s.typeLabel) : undefined;
    brandFacets({ search: s.search || undefined, categoryGuids: categoryGuidsFor(s.categoryGuid), onlyStock: s.onlyStock, quick: s.quick, nameAny: type?.q }, ctl?.signal)
      .then((r) => setBrands(r.brands))
      .catch((e) => {
        if (!ctl?.signal.aborted) setError(e instanceof Error ? e.message : "Не удалось загрузить бренды");
      });
    return () => ctl?.abort();
  }, [open, store]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = brands ?? [];
    return t ? list.filter((b) => b.name.toLowerCase().includes(t)) : list;
  }, [brands, q]);
  const found = useMemo(() => (brands ?? []).filter((b) => picked.includes(b.guid)).reduce((n, b) => n + b.count, 0), [brands, picked]);

  const toggle = (g: string) => {
    tap();
    setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  };
  const apply = () => {
    const s = store.getState();
    const same = picked.length === s.brandGuids.length && picked.every((g) => s.brandGuids.includes(g));
    onClose();
    if (!same) s.set({ brandGuids: picked });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Бренд">
      <View style={styles.head}>
        <View style={[styles.search, { backgroundColor: dark ? "#2B193D" : "rgba(118,118,128,0.12)" }]}>
          <Ionicons name="search-outline" size={18} color={c.secondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Найти бренд"
            placeholderTextColor={c.secondary}
            autoCorrect={false}
            style={[styles.input, { color: c.label }]}
            accessibilityLabel="Найти бренд"
          />
        </View>
        {picked.length > 0 ? (
          <Pressable onPress={() => { tap(); setPicked([]); }} hitSlop={8} accessibilityRole="button">
            <Text style={styles.reset}>Сбросить</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={{ maxHeight: Math.max(240, height * 0.5) }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16 }}>
        {brands === null && !error ? (
          <ActivityIndicator color="#8b3dff" style={{ marginVertical: 30 }} />
        ) : error ? (
          <Text style={[styles.note, { color: c.secondary }]}>{error}</Text>
        ) : shown.length === 0 ? (
          <Text style={[styles.note, { color: c.secondary }]}>{q.trim() ? "Такого бренда среди найденных товаров нет" : "Нет брендов"}</Text>
        ) : (
          shown.map((b, i) => {
            const on = picked.includes(b.guid);
            return (
              <Pressable
                key={b.guid}
                onPress={() => toggle(b.guid)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${b.name}, ${b.count} ${plural(b.count, "товар", "товара", "товаров")}`}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }]}
              >
                <View style={[styles.box, on ? styles.boxOn : { borderColor: dark ? "rgba(200,160,255,0.35)" : "#CFC6DE" }]}>
                  {on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                </View>
                <BrandMark name={b.name} dark={dark} />
                <Text style={[styles.name, { color: c.label, fontWeight: on ? "600" : "400" }]} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={[styles.count, { color: c.secondary }]}>{b.count}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <GradientButton
          title={picked.length === 0 ? "Показать все бренды" : `Показать ${found.toLocaleString("ru-RU")} ${plural(found, "товар", "товара", "товаров")}`}
          onPress={apply}
        />
      </View>
    </Sheet>
  );
}

/** the brand's logo on a white tile; without a logo — its first letters */
function BrandMark({ name, dark }: { name: string; dark: boolean }) {
  const logo = brandLogo(name);
  return (
    <View style={[styles.mark, { backgroundColor: "#fff", borderColor: dark ? "transparent" : "#EEE9F6" }]}>
      {logo ? (
        <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={styles.initials} numberOfLines={1}>
          {name
            .replace(/[^\p{L}\p{N} ]/gu, "")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 64, height: 36, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: 54, height: 26 },
  initials: { color: "#8b3dff", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginBottom: 6 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 40, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, minWidth: 0, fontSize: 16, height: "100%" },
  reset: { color: "#8b3dff", fontSize: 15, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: "#8b3dff", borderColor: "#8b3dff" },
  name: { flex: 1, fontSize: 16 },
  count: { fontSize: 14 },
  note: { textAlign: "center", marginVertical: 24, fontSize: 15 },
});

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, themed, useTheme } from "@/theme";
import { SORT_LABELS, useCatalog, type Quick, type Sort } from "@/store/catalog";
import { Button, tap } from "@/components/ui";
import { CategoryDrawer } from "@/components/CategoryDrawer";

const QUICK: { key: Quick; label: string }[] = [
  { key: "new", label: "Новинки" },
  { key: "sale", label: "Со скидкой" },
  { key: "gift", label: "Подарочные наборы" },
];

export default function Filters() {
  const insets = useSafeAreaInsets();
  const s = useCatalog();
  const [sort, setSort] = useState<Sort>(s.sort);
  const [onlyStock, setOnlyStock] = useState(s.onlyStock);
  const [quick, setQuick] = useState<Quick[]>(s.quick);
  const [brands, setBrands] = useState<string[]>(s.brandGuids);
  const [brandQuery, setBrandQuery] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(s.categoryGuid);

  const brandList = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const list = q ? s.brands.filter((b) => b.name.toLowerCase().includes(q)) : s.brands;
    // selected first
    return [...list.filter((b) => brands.includes(b.guid)), ...list.filter((b) => !brands.includes(b.guid))].slice(0, 80);
  }, [s.brands, brandQuery, brands]);

  const apply = () => {
    s.set({ sort, onlyStock, quick, brandGuids: brands, categoryGuid: category });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h}>Категория</Text>
        <View style={styles.box}>
          <Pressable onPress={() => { tap(); setCatOpen(true); }} style={styles.row}>
            <Text style={styles.rowText} numberOfLines={1}>
              {s.categories.find((c) => c.guid === category)?.name ?? "Все товары"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        </View>

        <Text style={styles.h}>Сортировка</Text>
        <View style={styles.box}>
          {(Object.keys(SORT_LABELS) as Sort[]).map((k, i) => (
            <Pressable key={k} onPress={() => { tap(); setSort(k); }} style={[styles.row, i > 0 && styles.sep]}>
              <Text style={styles.rowText}>{SORT_LABELS[k]}</Text>
              {sort === k && <Ionicons name="checkmark" size={20} color={colors.pink} />}
            </Pressable>
          ))}
        </View>

        <Text style={styles.h}>Показать</Text>
        <View style={styles.box}>
          <View style={styles.row}>
            <Text style={styles.rowText}>Только в наличии</Text>
            <Switch value={onlyStock} onValueChange={setOnlyStock} trackColor={{ true: colors.pink, false: colors.border }} thumbColor="#fff" />
          </View>
          {QUICK.map((q) => {
            const on = quick.includes(q.key);
            return (
              <View key={q.key} style={[styles.row, styles.sep]}>
                <Text style={styles.rowText}>{q.label}</Text>
                <Switch
                  value={on}
                  onValueChange={(v) => setQuick(v ? [...quick, q.key] : quick.filter((x) => x !== q.key))}
                  trackColor={{ true: colors.pink, false: colors.border }}
                  thumbColor="#fff"
                />
              </View>
            );
          })}
        </View>

        {s.brands.length > 0 && (
          <>
            <Text style={styles.h}>Бренды {brands.length > 0 ? `· выбрано ${brands.length}` : ""}</Text>
            <TextInput
              value={brandQuery}
              onChangeText={setBrandQuery}
              placeholder="Найти бренд"
              placeholderTextColor={colors.faint}
              style={styles.search}
              autoCorrect={false}
            />
            <View style={styles.box}>
              {brandList.map((b, i) => {
                const on = brands.includes(b.guid);
                return (
                  <Pressable
                    key={b.guid}
                    onPress={() => { tap(); setBrands(on ? brands.filter((x) => x !== b.guid) : [...brands, b.guid]); }}
                    style={[styles.row, i > 0 && styles.sep]}
                  >
                    <Text style={styles.rowText}>{b.name}</Text>
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={22} color={on ? colors.pink : colors.faint} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <CategoryDrawer
        open={catOpen}
        onClose={() => setCatOpen(false)}
        categories={s.categories}
        selected={category}
        onSelect={setCategory}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title="Сбросить"
          variant="outline"
          style={{ flex: 1 }}
          onPress={() => {
            setSort("popularity");
            setOnlyStock(false);
            setQuick([]);
            setBrands([]);
            setCategory(null);
          }}
        />
        <Button title="Показать" style={{ flex: 2 }} onPress={apply} />
      </View>
    </View>
  );
}

const styles = themed(() => ({
  h: { fontSize: 13, fontWeight: "800", color: colors.muted, textTransform: "uppercase", marginTop: 18, marginBottom: 8, marginLeft: 4 },
  box: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sep: { borderTopWidth: 1, borderTopColor: colors.soft },
  rowText: { fontSize: 15, color: colors.text, fontWeight: "600", flex: 1, marginRight: 8 },
  search: {
    height: 46, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, fontSize: 16, marginBottom: 10, color: colors.text,
  },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, padding: 16,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
}));

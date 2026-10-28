import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, themed } from "../theme";
import { SORT_LABELS, useCatalogMeta, type CatalogStore, type Quick, type Sort } from "../catalog";
import { useDesktop } from "../useDesktop";
import { Button, tap } from "./ui";
import { CategoryDrawer } from "./CategoryDrawer";

const QUICK: { key: Quick; label: string }[] = [
  { key: "new", label: "Новинки" },
  { key: "sale", label: "Со скидкой" },
  { key: "gift", label: "Подарочные наборы" },
];

/** «Фильтры» of the customer app (category, sorting, in stock, quick filters, brands) as a full-screen panel. */
export function CatalogFilters({ open, onClose, store }: { open: boolean; onClose: () => void; store: CatalogStore }) {
  const insets = useSafeAreaInsets();
  const desktop = useDesktop();
  const meta = useCatalogMeta();
  const [sort, setSort] = useState<Sort>("popularity");
  const [onlyStock, setOnlyStock] = useState(false);
  const [quick, setQuick] = useState<Quick[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  // every opening starts from the filters in effect
  useEffect(() => {
    if (!open) return;
    const s = store.getState();
    setSort(s.sort);
    setOnlyStock(s.onlyStock);
    setQuick(s.quick);
    setBrands(s.brandGuids);
    setCategory(s.categoryGuid);
    setBrandQuery("");
  }, [open, store]);

  const brandList = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    const list = q ? meta.brands.filter((b) => b.name.toLowerCase().includes(q)) : meta.brands;
    // selected first
    return [...list.filter((b) => brands.includes(b.guid)), ...list.filter((b) => !brands.includes(b.guid))].slice(0, 80);
  }, [meta.brands, brandQuery, brands]);

  const apply = () => {
    store.getState().set({ sort, onlyStock, quick, brandGuids: brands, categoryGuid: category });
    onClose();
  };

  const wrap = desktop ? { width: "100%" as const, maxWidth: 720, alignSelf: "center" as const } : null;

  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: desktop ? 12 : 8 }}>
        <View style={[styles.head, wrap]}>
          <Text style={styles.title}>Фильтры</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.close}>
            <Ionicons name="close" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[{ padding: 16, paddingBottom: 120 }, wrap]} keyboardShouldPersistTaps="handled">
          <Text style={styles.h}>Категория</Text>
          <View style={styles.box}>
            <Pressable onPress={() => { tap(); setCatOpen(true); }} style={styles.row} accessibilityRole="button">
              <Text style={styles.rowText} numberOfLines={1}>
                {meta.categories.find((c) => c.guid === category)?.name ?? "Все товары"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          </View>

          <Text style={styles.h}>Сортировка</Text>
          <View style={styles.box}>
            {(Object.keys(SORT_LABELS) as Sort[]).map((k, i) => (
              <Pressable key={k} onPress={() => { tap(); setSort(k); }} style={[styles.row, i > 0 && styles.sep]} accessibilityRole="button" accessibilityState={{ selected: sort === k }}>
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

          {meta.brands.length > 0 && (
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
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
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

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <View style={[{ flexDirection: "row", gap: 10 }, wrap]}>
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

        <CategoryDrawer open={catOpen} onClose={() => setCatOpen(false)} categories={meta.categories} selected={category} onSelect={setCategory} />
      </View>
    </Modal>
  );
}

const styles = themed(() => ({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft },
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
    position: "absolute", left: 0, right: 0, bottom: 0, padding: 16,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
}));

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { get, put } from "@/api";
import { useIOS, iosText } from "@/ios";
import { Sheet } from "@/components/iosui/Sheet";
import { useTabCatalog } from "@/catalog";

type Brand = { id: string; name: string; count: number; hidden: boolean };
const normalize = (s: string) => s.toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]/g, "");

/** The API independently checks the current staff role on every request. */
export function BrandVisibilitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useIOS();
  const { height } = useWindowDimensions();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setBrands((await get<{ brands: Brand[] }>("/api/team/brand-visibility")).brands); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить бренды"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (open) { setQuery(""); setSelected(null); void load(); } }, [open, load]);
  const shown = useMemo(() => brands.filter(b => normalize(b.name).includes(normalize(query))), [brands, query]);
  const save = async () => {
    if (!selected || saving) return;
    setSaving(true); setError("");
    try {
      const result = await put<{ id: string; hidden: boolean }>("/api/team/brand-visibility", { id: selected.id, hidden: !selected.hidden });
      setBrands(rows => rows.map(b => b.id === result.id ? { ...b, hidden: result.hidden } : b));
      setSelected(null);
      useTabCatalog.getState().set({});
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить. Повторите."); }
    finally { setSaving(false); }
  };
  return <Sheet open={open} onClose={() => { if (!saving) onClose(); }} title="Видимость брендов" avoidKeyboard>
    <View style={{ width: "100%", maxWidth: 700, alignSelf: "center", paddingHorizontal: 16, height: Math.min(650, height * .72), gap: 12 }}>
      <Text style={[iosText.footnote, { color: c.secondary }]}>Скрытый бренд не показывается клиентам на сайте и в приложении. Новые товары этого бренда из 1С тоже будут скрыты. Заказы сохраняются.</Text>
      <TextInput accessibilityLabel="Найти бренд" placeholder="Найти бренд" placeholderTextColor={c.secondary} value={query} onChangeText={setQuery} editable={!saving} style={[iosText.body, { backgroundColor: c.cell, color: c.label, borderRadius: 16, padding: 14 }]} />
      {error ? <View><Text accessibilityRole="alert" style={{ color: "#e82c87" }}>{error}</Text>{!brands.length && !loading ? <Pressable onPress={load}><Text style={{ color: "#8b3dff", padding: 10 }}>Повторить</Text></Pressable> : null}</View> : null}
      {loading ? <ActivityIndicator style={{ flex: 1 }} /> : <FlatList data={shown} keyExtractor={b => b.id} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} ListEmptyComponent={<Text style={{ color: c.secondary }}>Бренды не найдены</Text>} renderItem={({ item }) => <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 8, borderRadius: 18, backgroundColor: c.cell }}>
        <Ionicons name={item.hidden ? "eye-off-outline" : "eye-outline"} size={22} color={item.hidden ? "#e82c87" : "#8b3dff"} />
        <View style={{ flex: 1 }}><Text style={[iosText.headline, { color: c.label }]}>{item.name}</Text><Text style={[iosText.footnote, { color: c.secondary }]}>{item.count} товаров · {item.hidden ? "Скрыт от клиентов" : "Показывается"}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${item.hidden ? "Показать" : "Скрыть"} ${item.name}`} disabled={saving} onPress={() => { setSelected(item); setError(""); }} style={{ paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, backgroundColor: c.bg }}><Text style={{ color: "#8b3dff", fontWeight: "700" }}>{item.hidden ? "Показать" : "Скрыть"}</Text></Pressable>
      </View>} />}
      {selected ? <View style={{ backgroundColor: c.cell, borderRadius: 18, padding: 14, gap: 10 }}>
        <Text style={[iosText.headline, { color: c.label }]}>{selected.hidden ? "Показать" : "Скрыть"} «{selected.name}»?</Text>
        <Text style={[iosText.footnote, { color: c.secondary }]}>{selected.hidden ? "Товары вернутся в каталог. Отдельно скрытые товары останутся скрытыми." : `${selected.count} товаров будут исключены из клиентского каталога. Скрытие действует и для следующих поступлений.`}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}><Pressable accessibilityRole="button" disabled={saving} onPress={() => setSelected(null)} style={{ flex: 1, padding: 14 }}><Text style={{ color: c.secondary, textAlign: "center" }}>Отмена</Text></Pressable><Pressable accessibilityRole="button" disabled={saving} onPress={save} style={{ flex: 1, backgroundColor: "#8b3dff", borderRadius: 14, padding: 14 }}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>{selected.hidden ? "Да, показать" : "Да, скрыть"}</Text>}</Pressable></View>
      </View> : null}
      <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={{ padding: 12 }}><Text style={{ color: "#8b3dff", textAlign: "center" }}>Готово</Text></Pressable>
    </View>
  </Sheet>;
}

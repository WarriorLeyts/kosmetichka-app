import { cartSelectionKey } from "../cartAssortment";
import { useCampaign } from "@/useCampaign";
import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { create } from "zustand";
import { Sheet } from "./iosui/Sheet";
import { GradientButton } from "./iosui/Buttons";
import { api, imageUrl } from "../api";
import { useCartStore } from "../store/cart";
import { useAuth } from "../store/auth";
import { PriceRows, priceRows } from "./Price";
import { calculateCart } from "../pricing";
import { stockLabel } from "../format";
import { useIOS } from "../ios";
import type { Product, Variant } from "../types";
type PickerData = { product: Product; variants: Variant[]; replace?: { expected: string; quantities: Record<number, number>; total: number } };
export const useAssortmentPicker = create<{ data: PickerData | null; open: (product: Product, variants: Variant[]) => void; edit: (product: Product, variants: Variant[]) => void; close: () => void }>(set => ({
  data: null, open: (product, variants) => set({ data: { product, variants } }), close: () => set({ data: null }),
  edit: (product, variants) => {
    const items = useCartStore.getState().items;
    const rows = items.filter(i => i.id === product.id);
    const quantities: Record<number, number> = {};
    for (const row of rows) {
      const v = variants.find(v => row.variantId != null ? v.id === row.variantId : v.name === row.variantName);
      if (v) quantities[v.id] = (quantities[v.id] ?? 0) + row.quantity;
    }
    set({ data: { product, variants, replace: { expected: cartSelectionKey(items, product.id), quantities, total: rows.reduce((s, i) => s + i.quantity, 0) } } });
  },
}));
export function AssortmentPicker() {
  const data = useAssortmentPicker(s => s.data);
  return data ? <Picker key={`${data.product.id}:${data.replace ? "edit" : "add"}`} {...data} /> : null;
}
function Picker({ product, variants, replace }: PickerData) {
  useCampaign();
  const c = useIOS();
  const customer = useAuth(s => s.customer);
  const close = useAssortmentPicker(s => s.close);
  const items = useCartStore(s => s.items);
  const [qty, setQty] = useState<Record<number, number>>(replace?.quantities ?? {});
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const have = items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
  const replacing = replace?.total ?? 0;
  const outside = replace ? 0 : have;
  const selected = Object.values(qty).reduce((s, n) => s + n, 0);
  const cap = product.stock == null ? 9999 : Math.max(0, Math.floor(product.stock));
  const min = Math.max(1, product.minOrderQty ?? 1);
  const tier = calculateCart([...items.filter(i => !replace || i.id !== product.id), ...variants.filter(v => qty[v.id] > 0).map(v => ({ ...product, quantity: qty[v.id] }))], customer).tier;
  const change = (v: Variant, delta: number) => setQty(q => {
    const selectedNow = Object.values(q).reduce((s, n) => s + n, 0);
    const limit = replace ? Math.min(cap, replacing) : cap - outside;
    return { ...q, [v.id]: Math.max(0, Math.min(limit - selectedNow + (q[v.id] ?? 0), (q[v.id] ?? 0) + delta)) };
  });
  const add = async () => {
    if (saving.current || !selected || (replace && selected !== replacing)) return; saving.current = true; setBusy(true);
    try {
      const [fresh, response] = await Promise.all([api.product(product.id), api.variants(product.id)]);
      const current = response.variants;
      if (!fresh.assortmentEnabled || variants.some(v => qty[v.id] && !current.some(x => x.id === v.id))) throw new Error("Варианты изменились. Закройте окно и выберите виды заново.");
      const already = replace ? 0 : useCartStore.getState().items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
      if (fresh.stock != null && selected + already > fresh.stock) throw new Error("Общий остаток изменился. Уменьшите количество или откройте выбор заново.");
      const entries = current.map(variant => ({ variant, quantity: qty[variant.id] ?? 0 }));
      if (replace) useCartStore.getState().replaceVariants(fresh, entries, replace.expected);
      else useCartStore.getState().addVariants(fresh, entries);
      close();
    } catch (e) { Alert.alert("Не удалось добавить", e instanceof Error ? e.message : "Попробуйте ещё раз"); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Sheet open onClose={close} title="Выберите виды" footer={
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8, borderTopWidth: 1, borderTopColor: c.separator, backgroundColor: c.bg, flexShrink: 0 }}>
      {min > 1 && <Text style={{ color: c.secondary }}>Минимум по всем видам вместе: {min} шт.</Text>}
      <GradientButton title={`${replace ? "Сохранить виды" : "Добавить в корзину"} · ${selected} шт.`} loading={busy} disabled={!selected || selected + outside < min || selected + outside > cap || !!replace && selected !== replacing} onPress={add} />
    </View>
  }>
    <ScrollView style={{ maxHeight: 500, flexShrink: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={{ color: c.label, fontSize: 18, fontWeight: "700" }}>{product.name}</Text>
      {replace ? <Text accessibilityRole="alert" style={{ color: selected === replacing ? c.secondary : "#E5484D", fontWeight: "600" }}>Распределите {replacing} шт. по видам. Выбрано: {selected} из {replacing}. Остальные товары сохранятся.</Text> : null}
      <Text style={{ color: c.secondary }}>{customer ? `Общий остаток: ${product.stock == null ? "уточняется" : `${cap} шт.`}` : stockLabel(product.stock).text}{have ? ` · В корзине: ${have} шт.` : ""}</Text>
      <Text style={{ color: c.secondary, fontSize: 13 }}>Цена за 1 шт.</Text>
      <PriceRows rows={priceRows(product, customer, tier)} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {variants.map(v => <View key={v.id} style={{ width: "47%", padding: 10, borderRadius: 16, backgroundColor: c.cell, borderWidth: 1, borderColor: qty[v.id] ? "#8b3dff" : c.separator }}>
          <Image source={{ uri: imageUrl(v.imageUrl, 320) ?? undefined }} style={{ height: 130, width: "100%", backgroundColor: "#fff", borderRadius: 10 }} contentFit="contain" />
          <Text style={{ color: c.label, marginTop: 8, minHeight: 36 }} numberOfLines={2}>{v.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Уменьшить ${v.name}`} disabled={busy || !qty[v.id]} onPress={() => change(v, -1)} style={{ padding: 12 }}><Text style={{ color: "#8b3dff", fontSize: 22 }}>−</Text></Pressable>
            <Text style={{ color: c.label }}>{qty[v.id] ?? 0}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Увеличить ${v.name}`} disabled={busy || selected + outside >= cap || !!replace && selected >= replacing} onPress={() => change(v, 1)} style={{ padding: 12, opacity: selected + outside >= cap || !!replace && selected >= replacing ? 0.4 : 1 }}><Text style={{ color: "#8b3dff", fontSize: 22 }}>+</Text></Pressable>
          </View>
        </View>)}
      </View>
      {!variants.length && <Text style={{ color: c.secondary }}>Сейчас нет доступных видов.</Text>}
      <Text style={{ color: c.secondary, fontSize: 13 }}>Наличие выбранных видов уточним при подтверждении заказа. Замену согласуем с вами.</Text>

    </ScrollView>
  </Sheet>;
}

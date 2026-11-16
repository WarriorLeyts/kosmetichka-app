import { useState } from "react";
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
export const useAssortmentPicker = create<{ data: { product: Product; variants: Variant[] } | null; open: (product: Product, variants: Variant[]) => void; close: () => void }>(set => ({ data: null, open: (product, variants) => set({ data: { product, variants } }), close: () => set({ data: null }) }));
export function AssortmentPicker() {
  const data = useAssortmentPicker(s => s.data);
  return data ? <Picker key={data.product.id} {...data} /> : null;
}
function Picker({ product, variants }: { product: Product; variants: Variant[] }) {
  const c = useIOS();
  const customer = useAuth(s => s.customer);
  const close = useAssortmentPicker(s => s.close);
  const items = useCartStore(s => s.items);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const have = items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
  const selected = Object.values(qty).reduce((s, n) => s + n, 0);
  const cap = product.stock == null ? 9999 : Math.max(0, Math.floor(product.stock));
  const min = Math.max(1, product.minOrderQty ?? 1);
  const tier = calculateCart([...items, ...variants.filter(v => qty[v.id] > 0).map(v => ({ ...product, quantity: qty[v.id] }))], customer).tier;
  const change = (v: Variant, delta: number) => setQty(q => ({ ...q, [v.id]: Math.max(0, Math.min(cap - have - selected + (q[v.id] ?? 0), (q[v.id] ?? 0) + delta)) }));
  const add = async () => {
    if (busy || !selected) return; setBusy(true);
    try {
      const [fresh, response] = await Promise.all([api.product(product.id), api.variants(product.id)]);
      const current = response.variants;
      if (!fresh.assortmentEnabled || variants.some(v => qty[v.id] && !current.some(x => x.id === v.id))) throw new Error("Варианты изменились. Закройте окно и выберите виды заново.");
      const already = useCartStore.getState().items.filter(i => i.id === product.id).reduce((s, i) => s + i.quantity, 0);
      if (fresh.stock != null && selected + already > fresh.stock) throw new Error("Общий остаток изменился. Уменьшите количество или откройте выбор заново.");
      useCartStore.getState().addVariants(fresh, current.map(variant => ({ variant, quantity: qty[variant.id] ?? 0 })));
      close();
    } catch (e) { Alert.alert("Не удалось добавить", e instanceof Error ? e.message : "Попробуйте ещё раз"); }
    finally { setBusy(false); }
  };
  return <Sheet open onClose={close} title="Выберите виды">
    <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={{ color: c.label, fontSize: 18, fontWeight: "700" }}>{product.name}</Text>
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
            <Pressable accessibilityRole="button" accessibilityLabel={`Увеличить ${v.name}`} disabled={busy || selected + have >= cap} onPress={() => change(v, 1)} style={{ padding: 12, opacity: selected + have >= cap ? 0.4 : 1 }}><Text style={{ color: "#8b3dff", fontSize: 22 }}>+</Text></Pressable>
          </View>
        </View>)}
      </View>
      {!variants.length && <Text style={{ color: c.secondary }}>Сейчас нет доступных видов.</Text>}
      <Text style={{ color: c.secondary, fontSize: 13 }}>Наличие выбранных видов уточним при подтверждении заказа. Замену согласуем с вами.</Text>
      {min > 1 && <Text style={{ color: c.secondary }}>Минимум по всем видам вместе: {min} шт.</Text>}
      <GradientButton title={`Добавить в корзину · ${selected} шт.`} loading={busy} disabled={!selected || selected + have < min || selected + have > cap} onPress={add} />
    </ScrollView>
  </Sheet>;
}

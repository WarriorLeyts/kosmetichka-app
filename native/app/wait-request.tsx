import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl } from "@/api";
import { useAuth } from "@/store/auth";
import { useWaitlistStore } from "@/store/waitlist";
import { TitleBar } from "@/components/iosui/TitleBar";
import { Button, Field } from "@/components/ui";
import { useIOS } from "@/ios";
import { DEMAND_NOTICE, quantityFromText } from "@/demand";
import type { Product } from "@/types";

export default function WaitRequest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = useAuth(s => s.customer?.id);
  if (!customerId) return <Redirect href="/login" />;
  return <WaitForm key={`${customerId}:${id}`} id={id} customerId={customerId} />;
}
function WaitForm({ id, customerId }: { id: string; customerId: number }) {
  const c = useIOS(), insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1"), [error, setError] = useState(""), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const lock = useRef(false);
  const waiting = useWaitlistStore(s => s.ids.includes(Number(id)));
  useEffect(() => {
    let active = true;
    if (!/^\d+$/.test(id ?? "")) { setError("Товар не найден"); return; }
    Promise.all([api.product(id), api.wishlist()]).then(([p, list]) => {
      if (!active) return;
      setProduct(p); setQuantity(String(list.products.find(x => x.id === Number(id))?.quantity ?? 1));
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [id]);
  async function save() {
    if (lock.current) return;
    const n = quantityFromText(quantity);
    if (!n) { setError("Укажите целое количество от 1 до 10 000 шт."); return; }
    lock.current = true; setBusy(true); setError("");
    try { if (useAuth.getState().customer?.id !== customerId) return; await useWaitlistStore.getState().save(Number(id), n); if (useAuth.getState().customer?.id === customerId) setDone(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить. Попробуйте ещё раз."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={{ maxWidth: 560, width: "100%", alignSelf: "center" }}>
      <TitleBar title={done ? "Вы в листе ожидания" : "Сообщить о поступлении"} />
      {product ? <View style={{ padding: 20, borderRadius: 24, backgroundColor: c.cell, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          {product.images?.[0]?.path ? <Image source={{ uri: imageUrl(product.images[0].path, 160)! }} style={{ width: 76, height: 90, borderRadius: 12, backgroundColor: "#fff" }} contentFit="contain" /> : null}
          <Text style={{ flex: 1, color: c.label, fontSize: 17, fontWeight: "600" }}>{product.name}</Text>
        </View>
        {done ? <><Text style={{ color: c.label, fontSize: 18 }}>Ваше пожелание: {quantity} шт.</Text><Text style={{ color: c.secondary, lineHeight: 22 }}>{DEMAND_NOTICE}</Text><Button title="Готово" onPress={() => router.back()} /></> : <>
          <Field label="Сколько хотели бы купить?" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" maxLength={5} accessibilityLabel="Нужное количество" />
          <Text style={{ color: c.secondary, lineHeight: 22 }}>{DEMAND_NOTICE}</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: "#e63a59" }}>{error}</Text> : null}
          <Button title={waiting ? "Сохранить количество" : "Добавить в лист ожидания"} onPress={save} loading={busy} icon="notifications-outline" />
          {waiting ? <Button title="Убрать из листа ожидания" variant="ghost" disabled={busy} onPress={async () => { if (lock.current) return; lock.current = true; setBusy(true); try { await useWaitlistStore.getState().remove(Number(id)); router.back(); } catch (e) { setError(e instanceof Error ? e.message : "Ошибка"); } finally { lock.current = false; setBusy(false); } }} /> : null}
        </>}
      </View> : error ? <Text accessibilityRole="alert" style={{ color: c.label }}>{error}</Text> : <ActivityIndicator color="#8b3dff" />}
    </View>
  </ScrollView>;
}

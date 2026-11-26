import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { api, imageUrl, type RestockArrival } from "@/api";
import { useAuth } from "@/store/auth";
import { useIOS } from "@/ios";

/** Personal arrivals expire 24 hours after the server announcement, even if this screen stays open. */
export function YourRestocks() {
  const id = useAuth(s => s.customer?.id);
  if (!id) return null;
  return <RestocksFor key={id} customerId={id} />;
}
function RestocksFor({ customerId }: { customerId: number }) {
  const c = useIOS();
  const [items, setItems] = useState<RestockArrival[]>([]), [now, setNow] = useState(Date.now());
  useFocusEffect(useCallback(() => {
    let active = true, running = false;
    const load = async () => {
      if (running || AppState.currentState !== "active") return;
      running = true;
      try { const r = await api.restocks(); if (active && useAuth.getState().customer?.id === customerId) { setItems(r.items); setNow(Date.now()); } }
      catch { /* A personal suggestion must not block the home page. */ }
      finally { running = false; }
    };
    void load(); const timer = setInterval(load, 60000);
    const sub = AppState.addEventListener("change", s => { if (s === "active") void load(); });
    return () => { active = false; clearInterval(timer); sub.remove(); };
  }, [customerId]));
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const visible = items.filter(x => Date.parse(x.expiresAt) > now);
  if (!visible.length) return null;
  return <View style={{ padding: 16, borderRadius: 24, backgroundColor: c.cell, marginVertical: 12, gap: 8 }}>
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Ionicons name="notifications-outline" size={22} color="#8b3dff" /><Text style={{ color: c.label, fontSize: 19, fontWeight: "700", flex: 1 }}>Вы ждали — товары поступили</Text></View>
    <Text style={{ color: c.secondary, fontSize: 13, lineHeight: 19 }}>Это не бронь: товар не резервируется. Проверьте наличие и цену.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 8 }}>
      {visible.map(p => <Pressable key={p.id} onPress={() => router.push(`/product/${p.id}`)} accessibilityRole="button" accessibilityLabel={p.name} style={{ width: 146, gap: 7, paddingBottom: 6 }}>
        {p.imagePath ? <Image source={{ uri: imageUrl(p.imagePath, 160)! }} style={{ height: 110, borderRadius: 12, backgroundColor: "#fff" }} contentFit="contain" /> : <Ionicons name="cube-outline" size={40} color={c.secondary} />}
        <Text style={{ color: c.label, fontSize: 14 }} numberOfLines={3}>{p.name}</Text>{p.quantity ? <Text style={{ color: c.secondary, fontSize: 12 }}>Вы хотели: {p.quantity} шт.</Text> : null}<Text style={{ color: "#8b3dff", fontWeight: "600", fontSize: 13 }}>Посмотреть товар →</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}

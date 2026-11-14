import { LoyaltyActions } from "@/components/LoyaltyActions";
import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { TitleBar } from "@/components/iosui/TitleBar";
import { IOSField } from "@/components/iosui/Field";
import { GradientButton } from "@/components/iosui/Buttons";
import { useIOS } from "@/ios";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoyaltyOrder() {
  const c = useIOS();
  const insets = useSafeAreaInsets();
  const customer = useAuth((s) => s.customer);
  const [name, setName] = useState<string | null>(null);
  const fullName = name ?? customer?.name ?? "";
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const add = async () => {
    if (busy.current) return;
    if (!customer) { router.push("/login"); return; }
    if (customer.hasCard || !["retail", "discount"].includes(customer.priceType ?? "")) { setError("Оформление доступно розничным клиентам без скидочной карты"); return; }
    if (!customer.phone) { setError("Сначала укажите телефон в профиле"); return; }
    if (fullName.trim().split(/\s+/).length < 2) { setError("Укажите ФИО"); return; }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(birthDate)) { setError("Укажите дату рождения в формате ДД.ММ.ГГГГ"); return; }
    busy.current = true; setLoading(true); setError("");
    try {
      const { product } = await api.loyaltyProduct();
      const registration = { fullName: fullName.trim(), birthDate };
      // The server validates both the form and the actual catalogue item before adding it.
      await api.checkoutCalc({ items: [{ id: product.id, quantity: 1, cardRegistration: registration }] });
      const cart = useCartStore.getState();
      if (cart.items.some((i) => i.cardRegistration)) { setError("Карта уже добавлена в корзину"); return; }
      cart.add({ ...product, cardRegistration: registration }, 1);
      router.replace("/(tabs)/cart");
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось добавить карту"); }
    finally { busy.current = false; setLoading(false); }
  };
  return <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 30, width: "100%", maxWidth: 600, alignSelf: "center" }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
    <TitleBar title="Карта «Косметичка»" />
    <LoyaltyActions active="order" disabled={loading} />
    <View style={{ padding: 18, borderRadius: 20, backgroundColor: c.cell, gap: 12 }}>
      <Text style={{ color: c.label, fontSize: 23, fontWeight: "700" }}>Карта «Косметичка» — 990 ₽</Text>
      <Text style={{ color: c.secondary, fontSize: 16 }}>Скидочные цены и бонусы. Карту можно заказать отдельно или вместе с товарами. Товары в этом заказе сразу пересчитаются по скидочным ценам.</Text>
      <IOSField label="ФИО" value={fullName} onChangeText={setName} autoCapitalize="words" autoCorrect={false} />
      <IOSField label="Дата рождения" placeholder="ДД.ММ.ГГГГ" value={birthDate} keyboardType="number-pad" onChangeText={(value) => {
        const d = value.replace(/\D/g, "").slice(0, 8);
        setBirthDate(d.length > 4 ? `${d.slice(0,2)}.${d.slice(2,4)}.${d.slice(4)}` : d.length > 2 ? `${d.slice(0,2)}.${d.slice(2)}` : d);
      }} />
      <Text style={{ color: c.label, fontSize: 16 }}>Телефон из профиля: {customer?.phone ?? "не указан"}</Text>
      <Text style={{ color: c.secondary }}>Эти данные передадим сотруднику для оформления карты на кассе. После оформления она автоматически появится в вашем профиле.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: "#d32f2f" }}>{error}</Text> : null}
      <GradientButton title="Добавить карту в корзину · 990 ₽" loading={loading} onPress={add} />
    </View>
  </ScrollView>;
}

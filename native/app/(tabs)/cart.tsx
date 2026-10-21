import { useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, imageUrl } from "@/api";
import { colors, radius, themed } from "@/theme";
import { money, plural } from "@/format";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import {
  amountUntilBigWholesale, amountUntilWholesale, effectivePriceType, priceFor, priceTypeLabel, rawCartTotal,
} from "@/pricing";
import { Button, Empty, Notice, Stepper } from "@/components/ui";
import type { CartItem } from "@/types";
import { BRAND_GRADIENT, GradientText } from "@/components/GradientText";

export default function Cart() {
  const customer = useAuth((s) => s.customer);
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const active = effectivePriceType(items, customer);
  const total = rawCartTotal(items, active);
  const toWholesale = amountUntilWholesale(items, customer);
  const toBig = amountUntilBigWholesale(items, customer);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  if (items.length === 0) {
    return (
      <Empty
        icon="bag-outline"
        title="Корзина пуста"
        text="Добавляйте товары из каталога — они сохранятся здесь"
        action="Перейти в каталог"
        onAction={() => router.navigate("/catalog")}
      />
    );
  }

  const checkout = async () => {
    if (!customer) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const r = await api.createOrder(
        items.map((i) => ({ id: i.id, quantity: i.quantity, variantName: i.variantName ?? null, variantImageUrl: i.variantImageUrl ?? null })),
        comment.trim()
      );
      clear();
      setComment("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(`Заказ №${r.orderId} принят`, "Менеджер свяжется с вами для подтверждения.", [
        { text: "Мои заказы", onPress: () => router.navigate("/orders") },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось оформить заказ");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const img = item.variantImageUrl ? imageUrl(item.variantImageUrl) : imageUrl(item.images?.[0]?.path);
    const price = priceFor(item, active);
    const min = Math.max(1, item.minOrderQty ?? 1);
    return (
      <View style={styles.item}>
        <Pressable onPress={() => router.push(`/product/${item.id}`)}>
          {img ? (
            <Image source={{ uri: img }} style={styles.img} contentFit="contain" />
          ) : (
            <View style={[styles.img, { alignItems: "center", justifyContent: "center" }]}>
              <Ionicons name="image-outline" size={24} color={colors.faint} />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          {item.variantName ? <Text style={styles.variant}>{item.variantName}</Text> : null}
          <Text style={styles.unit}>{money(price)} × {item.quantity}</Text>
          <View style={styles.itemBottom}>
            <Stepper value={item.quantity} min={min} onChange={(n) => setQty(item.cartKey, n < min ? 0 : n)} />
            <Text style={styles.sum}>{money(price * item.quantity)}</Text>
          </View>
        </View>
        <Pressable hitSlop={10} onPress={() => remove(item.cartKey)} style={{ padding: 2 }}>
          <Ionicons name="close" size={20} color={colors.faint} />
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.cartKey}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            {customer && toWholesale > 0 && (
              <Notice tone="info" text={`Добавьте товаров ещё на ${money(toWholesale)} — включится оптовая цена`} />
            )}
            {customer && toWholesale === 0 && toBig > 0 && active === "wholesale" && (
              <Notice tone="info" text={`До цены «Крупный опт» осталось ${money(toBig)}`} />
            )}
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <Pressable
              onPress={() =>
                Alert.alert("Очистить корзину?", undefined, [
                  { text: "Отмена", style: "cancel" },
                  { text: "Очистить", style: "destructive", onPress: clear },
                ])
              }
              style={{ alignSelf: "flex-end", padding: 6 }}
            >
              <Text style={{ color: colors.muted, fontWeight: "600" }}>Очистить корзину</Text>
            </Pressable>
            <Text style={styles.label}>Комментарий к заказу</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Например: позвонить перед доставкой"
              placeholderTextColor={colors.faint}
              multiline
              style={styles.comment}
            />
            <View style={styles.summary}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>{count} {plural(count, "товар", "товара", "товаров")}</Text>
                <Text style={styles.sumLabel}>Цена: {priceTypeLabel(active)}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.totalLabel}>Итого</Text>
                <GradientText style={styles.total} colors={BRAND_GRADIENT}>{money(total)}</GradientText>
              </View>
            </View>
            {error ? <Notice tone="error" text={error} /> : null}
            <Button
              title={customer ? "Оформить заказ" : "Войти и оформить"}
              icon={customer ? "checkmark-circle-outline" : "log-in-outline"}
              loading={loading}
              onPress={checkout}
            />
            <Text style={styles.hint}>Заказ попадёт менеджеру на подтверждение. Оплата — после согласования.</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => ({
  item: {
    flexDirection: "row", gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  img: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#ffffff" },
  name: { fontWeight: "700", color: colors.text, fontSize: 14, lineHeight: 19 },
  variant: { color: colors.violet, fontSize: 12, fontWeight: "700", marginTop: 2 },
  unit: { color: colors.muted, fontSize: 12, marginTop: 4 },
  itemBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  sum: { fontWeight: "900", color: colors.text, fontSize: 15 },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: 6 },
  comment: {
    minHeight: 70, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    padding: 12, fontSize: 15, textAlignVertical: "top", color: colors.text,
  },
  summary: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginVertical: 14, borderWidth: 1, borderColor: colors.border, gap: 8 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { color: colors.muted, fontWeight: "600" },
  totalLabel: { fontSize: 18, fontWeight: "800", color: colors.text },
  // like the site's .cart-total strong: 24px, 900, brand gradient text
  total: { fontSize: 24, fontWeight: "900", lineHeight: 30 },
  hint: { color: colors.faint, fontSize: 12, textAlign: "center", marginTop: 10 },
}));

import { useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api, imageUrl } from "@/api";
import { colors, themed } from "@/theme";
import { money, plural } from "@/format";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import {
  amountUntilBigWholesale, amountUntilWholesale, effectivePriceType, priceFor, priceTypeLabel, rawCartTotal,
} from "@/pricing";
import { Button, Empty, Notice, Stepper } from "@/components/ui";
import type { CartItem } from "@/types";

export default function Cart() {
  const insets = useSafeAreaInsets();
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

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title}>
        Корзина{items.length > 0 ? <Text style={styles.titleCount}> ({count})</Text> : null}
      </Text>
      {items.length > 0 && (
        <Pressable
          hitSlop={8}
          onPress={() =>
            Alert.alert("Очистить корзину?", undefined, [
              { text: "Отмена", style: "cancel" },
              { text: "Очистить", style: "destructive", onPress: clear },
            ])
          }
        >
          <Text style={styles.clear}>Удалить всё</Text>
        </Pressable>
      )}
    </View>
  );

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <Empty
          icon="bag-handle-outline"
          title="Корзина пуста"
          text="Добавляйте товары из каталога — они сохранятся здесь"
          action="Перейти в каталог"
          onAction={() => router.navigate("/catalog")}
        />
      </View>
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
        <Pressable onPress={() => router.push(`/product/${item.id}`)} style={styles.photo}>
          {img ? (
            <Image source={{ uri: img }} style={{ width: "88%", height: "88%" }} contentFit="contain" />
          ) : (
            <Ionicons name="image-outline" size={22} color="#c9b7c2" />
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <View style={{ flex: 1 }}>
              {item.brand?.name ? <Text style={styles.brand} numberOfLines={1}>{item.brand.name}</Text> : null}
              <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
              {item.variantName ? <Text style={styles.variant}>{item.variantName}</Text> : null}
            </View>
            <Pressable hitSlop={10} onPress={() => remove(item.cartKey)}>
              <Ionicons name="close" size={18} color={colors.faint} />
            </Pressable>
          </View>
          <View style={styles.itemBottom}>
            <View>
              <Text style={styles.price}>{money(price * item.quantity)}</Text>
              {item.quantity > 1 ? <Text style={styles.unit}>{money(price)} × {item.quantity}</Text> : null}
            </View>
            <Stepper value={item.quantity} min={min} onChange={(n) => setQty(item.cartKey, n < min ? 0 : n)} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {header}
      <FlatList
        data={items}
        keyExtractor={(i) => i.cartKey}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          <View>
            {customer && toWholesale > 0 && <Notice tone="info" text={`Добавьте товаров ещё на ${money(toWholesale)} — включится оптовая цена`} />}
            {customer && toWholesale === 0 && toBig > 0 && active === "wholesale" && (
              <Notice tone="info" text={`До цены «Крупный опт» осталось ${money(toBig)}`} />
            )}
          </View>
        }
        ListFooterComponent={
          <View style={{ marginTop: 18 }}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Комментарий к заказу"
              placeholderTextColor={colors.faint}
              multiline
              style={styles.comment}
              keyboardAppearance={colors.statusBar === "light" ? "dark" : "light"}
            />
            <View style={styles.summary}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>
                  {count} {plural(count, "товар", "товара", "товаров")}
                </Text>
                <Text style={styles.sumLabel}>Цена: {priceTypeLabel(active)}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.totalLabel}>Итого</Text>
                <Text style={styles.total}>{money(total)}</Text>
              </View>
            </View>
            {error ? <Notice tone="error" text={error} /> : null}
            <Button title={customer ? "Оформить заказ" : "Войти и оформить"} loading={loading} onPress={checkout} />
            <Text style={styles.hint}>Заказ попадёт менеджеру на подтверждение. Оплата — после согласования.</Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => ({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  titleCount: { color: colors.muted, fontWeight: "500" },
  clear: { color: colors.pink, fontWeight: "600", fontSize: 13.5 },
  item: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  sep: { height: 1, backgroundColor: colors.border },
  photo: { width: 84, height: 96, borderRadius: 14, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  name: { color: colors.text, fontSize: 14, lineHeight: 19, marginTop: 2 },
  variant: { color: colors.pink, fontSize: 12, fontWeight: "600", marginTop: 2 },
  itemBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  price: { fontWeight: "800", color: colors.text, fontSize: 16 },
  unit: { color: colors.faint, fontSize: 11.5, marginTop: 1 },
  comment: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    fontSize: 15,
    textAlignVertical: "top",
    color: colors.text,
  },
  summary: { marginVertical: 18, gap: 8 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { color: colors.muted, fontSize: 13 },
  totalLabel: { fontSize: 18, fontWeight: "600", color: colors.text },
  total: { fontSize: 24, fontWeight: "800", color: colors.text },
  hint: { color: colors.faint, fontSize: 12, textAlign: "center", marginTop: 12 },
}));

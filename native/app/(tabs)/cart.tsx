import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError, imageUrl } from "@/api";
import { BonusBox, PromoBox } from "@/components/PromoBox";
import type { CheckoutCalc } from "@/api";
import { money, plural } from "@/format";
import { useAuth } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import {
  amountUntilBigWholesale, amountUntilWholesale, effectivePriceType, priceFor, priceTypeLabel, rawCartTotal, type PriceType,
} from "@/pricing";
import { iosText, useIOS } from "@/ios";
import { BrandHeader } from "@/components/iosui/BrandHeader";
import { useTabBarSpace, VIOLET_PINK } from "@/components/TabBar";
import { tap } from "@/components/ui";
import type { CartItem } from "@/types";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

/** «Скидка», «Опт» or «Кр. опт» as in the catalog cards. */
function shortLabel(t: PriceType) {
  return t === "big_wholesale" ? "Кр. опт" : priceTypeLabel(t);
}

// latest typed comment (the store is written with a small delay so typing doesn't save the whole cart on every key)
let draft: string | null = null;
const currentComment = () => draft ?? useCartStore.getState().comment;

/** «Комментарий к заказу» with its own state: typing re-renders only this field. */
function CommentInput({ style, placeholderColor }: { style: object; placeholderColor: string }) {
  const stored = useCartStore((s) => s.comment);
  const [value, setValue] = useState(stored);
  useEffect(() => {
    // cleared after an order / changed elsewhere
    if (draft === null) setValue(stored);
  }, [stored]);
  useEffect(() => {
    if (draft === null) return;
    const t = setTimeout(() => {
      useCartStore.getState().setComment(value);
      draft = null;
    }, 400);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <TextInput
      value={value}
      onChangeText={(v) => {
        draft = v;
        setValue(v);
      }}
      onBlur={() => {
        if (draft !== null) useCartStore.getState().setComment(draft);
        draft = null;
      }}
      placeholder="Например: позвонить перед доставкой"
      placeholderTextColor={placeholderColor}
      multiline
      style={style}
    />
  );
}

/** Cart — iOS style, same look as the catalog and profile. Pricing, thresholds and checkout are the existing logic. */
export default function Cart() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const bottomSpace = useTabBarSpace();
  const customer = useAuth((s) => s.customer);
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const setComment = useCartStore((s) => s.setComment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // a second tap before the re-render must not send the same order twice
  const submitting = useRef(false);
  // promo code and bonuses — the site calculates them with MAXMA for the current cart
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [promoErr, setPromoErr] = useState("");
  const [spend, setSpend] = useState(false);
  const [calc, setCalc] = useState<CheckoutCalc | null>(null);
  const [calcBusy, setCalcBusy] = useState(false);
  const calcSeq = useRef(0);
  const cartKey = JSON.stringify(items.map((i) => [i.id, i.quantity, i.variantName ?? null]));
  const maxRef = useRef(0);
  maxRef.current = calc?.bonuses?.maxToApply ?? maxRef.current;
  // price type switched in the profile (retail ↔ wholesale): bonuses are retail-only — start over
  const priceType = customer?.priceType ?? null;
  useEffect(() => {
    setSpend(false);
    maxRef.current = 0;
  }, [priceType]);
  useEffect(() => {
    if (!customer || items.length === 0) {
      setCalc(null);
      return;
    }
    const my = ++calcSeq.current;
    setCalcBusy(true);
    const t = setTimeout(async () => {
      try {
        const lines = useCartStore
          .getState()
          .items.filter((i) => Number.isInteger(i.quantity) && i.quantity > 0)
          .map((i) => ({ id: i.id, quantity: i.quantity, variantName: i.variantName ?? null }));
        // «Списать бонусы» on: ask for the last known maximum — the site re-asks MAXMA if it changed
        const want = spend ? Math.max(1, maxRef.current || calc?.bonuses?.balance || 1) : 0;
        const r = await api.checkoutCalc({ items: lines, promocode: promoCode ?? undefined, applyBonuses: want });
        if (my !== calcSeq.current) return;
        setCalc(r);
        if (promoCode && !r.promo) {
          // the code doesn't fit (any more): show why and drop it
          setPromoErr(r.promoError || "Промокод не подходит");
          setPromoCode(null);
        }
      } catch (e) {
        if (my !== calcSeq.current) return;
        // the site without this feature yet / no network: plain cart total, no promo or bonuses
        setCalc(null);
        if (promoCode) {
          setPromoErr(e instanceof Error ? e.message : "Не удалось проверить промокод");
          setPromoCode(null);
        }
      } finally {
        if (my === calcSeq.current) setCalcBusy(false);
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, priceType, cartKey, promoCode, spend]);

  const active = effectivePriceType(items, customer);
  const total = rawCartTotal(items, active);
  const toWholesale = amountUntilWholesale(items, customer);
  const toBig = amountUntilBigWholesale(items, customer);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  const bg = "transparent";
  const card = [styles.card, { backgroundColor: c.cell }, !dark && styles.shadow];
  const soft = dark ? "#352044" : "#F2F2F7";
  const pinkSoft = dark ? "rgba(232,44,135,0.16)" : "#FCEFF7";

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={styles.wrap}>
          <BrandHeader title="Корзина" />
        </View>
        <View style={[styles.empty, { paddingBottom: bottomSpace }]}>
          <View style={[styles.emptyIcon, { backgroundColor: "rgba(139,61,255,0.1)" }]}>
            <Ionicons name="bag-outline" size={38} color={VIOLET} />
          </View>
          <Text style={[iosText.title2, { color: c.label, textAlign: "center" }]}>Корзина пуста</Text>
          <Text style={[iosText.subhead, { color: c.secondary, textAlign: "center", marginTop: 6 }]}>
            Добавляйте товары из каталога — они сохранятся здесь
          </Text>
          <GradientButton title="Перейти в каталог" icon="grid-outline" onPress={() => router.navigate("/catalog")} style={{ marginTop: 22, alignSelf: "stretch" }} />
        </View>
      </View>
    );
  }

  const checkout = async (noBonuses = false) => {
    if (submitting.current) return;
    if (!customer) {
      router.push("/login");
      return;
    }
    submitting.current = true;
    setLoading(true);
    setError("");
    try {
      // the latest cart from the store (not this render's copy), whole positive quantities only
      const lines = useCartStore.getState().items.filter((i) => Number.isInteger(i.quantity) && i.quantity > 0);
      if (lines.length === 0) return;
      const r = await api.createOrder(
        lines.map((i) => ({ id: i.id, quantity: i.quantity, variantName: i.variantName ?? null, variantImageUrl: i.variantImageUrl ?? null })),
        currentComment().trim(),
        { promocode: calc?.promo?.code ?? undefined, applyBonuses: spend && !noBonuses ? calc?.bonuses?.applied ?? 0 : 0 }
      );
      clear();
      setPromoCode(null);
      setSpend(false);
      setCalc(null);
      if (r.loyaltyWarning) Alert.alert("Бонусы", r.loyaltyWarning);
      draft = null;
      setComment("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(`Заказ №${r.orderId} принят`, "Менеджер свяжется с вами для подтверждения.", [
        { text: "Мои заказы", onPress: () => router.navigate("/orders") },
      ]);
    } catch (e) {
      // MAXMA didn't confirm the bonuses: nothing was ordered — retry, or order without bonuses
      if (e instanceof ApiError && e.code === "bonuses_unavailable") {
        Alert.alert("Не удалось списать бонусы", e.message, [
          { text: "Отмена", style: "cancel" },
          { text: "Повторить", onPress: () => setTimeout(() => checkout(), 0) },
          {
            text: "Без бонусов",
            onPress: () => {
              setSpend(false);
              setTimeout(() => checkout(true), 0);
            },
          },
        ]);
        return;
      }
      setError(e instanceof Error ? e.message : "Не удалось оформить заказ");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // the login expired on the server: show the signed-out state instead of failing again and again
      if (e instanceof ApiError && e.status === 401) useAuth.getState().refresh();
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  // wholesale threshold banner (existing rules: only wholesale customers get the upgrade)
  let banner: { icon: keyof typeof Ionicons.glyphMap; node: ReactNode } | null = null;
  if (customer && toWholesale > 0) {
    banner = {
      icon: "bag-handle",
      node: (
        <>
          Добавьте товаров ещё на <Text style={styles.bannerSum}>{money(toWholesale)}</Text> — включится оптовая цена
        </>
      ),
    };
  } else if (customer && active === "wholesale" && toBig > 0) {
    banner = {
      icon: "checkmark-circle",
      node: (
        <>
          Оптовая цена включена. До цены «Крупный опт» ещё <Text style={styles.bannerSum}>{money(toBig)}</Text>
        </>
      ),
    };
  } else if (customer && active === "big_wholesale" && customer.priceType === "wholesale") {
    banner = { icon: "checkmark-circle", node: <>Включена цена «Крупный опт»</> };
  }

  const renderItem = ({ item }: { item: CartItem }) => {
    const img = item.variantImageUrl ? imageUrl(item.variantImageUrl) : imageUrl(item.images?.[0]?.path, 160);
    const price = priceFor(item, active);
    const min = Math.max(1, item.minOrderQty ?? 1);
    const stock = typeof item.stock === "number" && item.stock > 0 ? item.stock : null;
    const atMax = stock !== null && item.quantity >= stock;
    const minus = () => {
      tap();
      const n = item.quantity - 1;
      setQty(item.cartKey, n < min ? 0 : n);
    };
    const plus = () => {
      if (atMax) return;
      tap();
      setQty(item.cartKey, item.quantity + 1);
    };
    return (
      <View style={[card, styles.item, styles.wrap]}>
        <Pressable onPress={() => router.push(`/product/${item.id}`)} accessibilityLabel={item.name} style={styles.photo}>
          {img ? (
            <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
          ) : (
            <Ionicons name="image-outline" size={28} color={c.secondary} />
          )}
        </Pressable>
        <View style={{ flex: 1, paddingRight: 26 }}>
          {item.brand?.name ? (
            <Text style={[styles.brand, { color: c.secondary }]} numberOfLines={1}>
              {item.brand.name.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.name, { color: c.label }]}>{item.name}</Text>
          {item.variantName ? <Text style={styles.variant}>{item.variantName}</Text> : null}
          <Text style={[styles.unit, { color: c.secondary }]}>
            {money(price)} × {item.quantity}
          </Text>
          <Text style={styles.sum} numberOfLines={1} adjustsFontSizeToFit>
            {money(price * item.quantity)}
          </Text>
          <View style={styles.stepRow}>
            <View style={[styles.stepper, { backgroundColor: soft }]}>
              <Pressable onPress={minus} hitSlop={6} accessibilityLabel="Уменьшить количество" style={styles.stepBtn}>
                <Ionicons name="remove" size={22} color={c.label} />
              </Pressable>
              <View style={[styles.qtyBox, { backgroundColor: c.cell }]}>
                <Text style={[styles.qty, { color: c.label }]}>{item.quantity}</Text>
              </View>
              <Pressable onPress={plus} disabled={atMax} hitSlop={6} accessibilityLabel="Увеличить количество" style={{ opacity: atMax ? 0.4 : 1 }}>
                <LinearGradient colors={[VIOLET, "#b832e0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plus}>
                  <Ionicons name="add" size={24} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
          {atMax ? <Text style={[styles.stockHint, { color: c.secondary }]}>В наличии {stock} шт.</Text> : null}
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => {
            tap();
            remove(item.cartKey);
          }}
          accessibilityLabel="Удалить из корзины"
          style={[styles.remove, { backgroundColor: soft }]}
        >
          <Ionicons name="close" size={17} color={c.secondary} />
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.cartKey}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: bottomSpace }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.wrap}>
            <BrandHeader title="Корзина" />
            {banner ? (
              <View style={[styles.banner, { backgroundColor: pinkSoft }]}>
                <View style={[styles.bannerIcon, { backgroundColor: c.cell }]}>
                  <Ionicons name={banner.icon} size={24} color={VIOLET} />
                </View>
                <Text style={[styles.bannerText, { color: c.label }]}>{banner.node}</Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={styles.wrap}>
            <Pressable
              onPress={() =>
                Alert.alert("Очистить корзину?", undefined, [
                  { text: "Отмена", style: "cancel" },
                  { text: "Очистить", style: "destructive", onPress: clear },
                ])
              }
              accessibilityRole="button"
              style={styles.clear}
            >
              <Ionicons name="trash-outline" size={20} color={c.secondary} />
              <Text style={[iosText.body, { color: c.secondary }]}>Очистить корзину</Text>
            </Pressable>

            <Text style={[styles.label, { color: c.label }]}>Комментарий к заказу</Text>
            <CommentInput style={[styles.comment, { backgroundColor: dark ? "#2B193D" : "#EEEEF3", color: c.label }]} placeholderColor={c.secondary} />

            {customer ? (
              <PromoBox
                applied={promoCode}
                name={calc?.promo?.name}
                discount={calc?.promo?.discount}
                error={promoErr}
                busy={calcBusy && !!promoCode}
                onApply={(code) => {
                  setPromoErr("");
                  setPromoCode(code);
                }}
                onRemove={() => {
                  setPromoErr("");
                  setPromoCode(null);
                }}
              />
            ) : null}
            {customer && calc?.bonuses ? <BonusBox bonuses={calc.bonuses} on={spend} onToggle={setSpend} busy={calcBusy && spend} /> : null}

            <View style={[styles.summary, { backgroundColor: pinkSoft }]}>
              <View style={styles.sumRow}>
                <Text style={[iosText.subhead, { color: c.secondary }]}>
                  {count} {plural(count, "товар", "товара", "товаров")}
                </Text>
                <Text style={[iosText.subhead, { color: c.secondary }]}>
                  Цена: <Text style={{ color: PINK }}>{shortLabel(active)}</Text>
                </Text>
              </View>
              {calc && (calc.promo || (spend && calc.bonuses?.applied)) ? (
                <>
                  <View style={[styles.sumRow, { marginTop: 6 }]}>
                    <Text style={[iosText.body, { color: c.label }]}>Сумма</Text>
                    <Text style={[iosText.body, { color: c.label }]}>{money(calc.subtotal)}</Text>
                  </View>
                  {calc.promo ? (
                    <View style={[styles.sumRow, { marginTop: 2 }]}>
                      <Text style={[iosText.body, { color: "#1f8a3b" }]}>Скидка по промокоду</Text>
                      <Text style={[iosText.body, { color: "#1f8a3b" }]}>−{money(calc.promo.discount)}</Text>
                    </View>
                  ) : null}
                  {spend && calc.bonuses?.applied ? (
                    <View style={[styles.sumRow, { marginTop: 2 }]}>
                      <Text style={[iosText.body, { color: VIOLET }]}>Списано бонусов</Text>
                      <Text style={[iosText.body, { color: VIOLET }]}>−{money(calc.bonuses.applied)}</Text>
                    </View>
                  ) : null}
                </>
              ) : null}
              <View style={[styles.sumRow, { marginTop: 4 }]}>
                <Text style={[styles.totalLabel, { color: c.label }]}>Итого</Text>
                <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                  {money(calc && (calc.promo || (spend && calc.bonuses?.applied)) ? calc.total : total)}
                </Text>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                <Text style={[iosText.subhead, { color: "#FF3B30", flex: 1 }]}>{error}</Text>
              </View>
            ) : null}
            {!customer ? (
              <Text style={[iosText.footnote, { color: c.secondary, textAlign: "center", marginBottom: 8 }]}>
                Чтобы оформить заказ, войдите в аккаунт
              </Text>
            ) : null}
            <GradientButton
              title={customer ? "Оформить заказ" : "Войти и оформить"}
              icon={customer ? undefined : "log-in-outline"}
              loading={loading}
              onPress={() => checkout()}
            />
            <Text style={[iosText.footnote, { color: c.secondary, textAlign: "center", marginTop: 10 }]}>
              Заказ попадёт менеджеру на подтверждение. Оплата — после согласования.
            </Text>
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

function GradientButton({
  title, icon, loading, onPress, style,
}: { title: string; icon?: keyof typeof Ionicons.glyphMap; loading?: boolean; onPress: () => void; style?: object }) {
  return (
    <Pressable
      onPress={() => {
        if (loading) return;
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: !!loading }}
      style={({ pressed }) => [{ opacity: pressed || loading ? 0.9 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, style]}
    >
      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
        {loading ? <ActivityIndicator color="#fff" /> : icon ? <Ionicons name={icon} size={22} color="#fff" /> : null}
        <Text style={styles.ctaText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 640, alignSelf: "center" },
  card: { borderRadius: 22 },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.07)" },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 12, marginBottom: 12 },
  bannerIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerText: { flex: 1, fontSize: 16, lineHeight: 22 },
  bannerSum: { color: VIOLET, fontWeight: "700" },
  item: { flexDirection: "row", gap: 14, padding: 14, marginBottom: 12 },
  photo: { width: 112, height: 132, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  brand: { fontSize: 13, letterSpacing: 0.3, marginBottom: 3 },
  name: { fontSize: 16, lineHeight: 21 },
  variant: { color: VIOLET, fontSize: 13, fontWeight: "600", marginTop: 3 },
  unit: { fontSize: 15, marginTop: 6 },
  sum: { color: PINK, fontSize: 26, fontWeight: "800", marginTop: 2 },
  stepRow: { flexDirection: "row", marginTop: 10 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 24, padding: 3, gap: 4 },
  stepBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  qtyBox: { minWidth: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  qty: { fontSize: 17, fontWeight: "600" },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(139,61,255,0.35)" },
  stockHint: { fontSize: 12, marginTop: 6 },
  remove: { position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  clear: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 4 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 10, marginBottom: 8 },
  comment: { minHeight: 52, maxHeight: 140, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontSize: 16, textAlignVertical: "top" },
  summary: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, marginTop: 18, marginBottom: 12 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  totalLabel: { fontSize: 30, fontWeight: "800" },
  total: { color: PINK, fontSize: 32, fontWeight: "800", flexShrink: 1 },
  errorBox: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "rgba(255,59,48,0.1)", borderRadius: 14, padding: 12, marginBottom: 10 },
  cta: { height: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: "0 8px 20px rgba(139,61,255,0.35)" },
  ctaText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, width: "100%", maxWidth: 440, alignSelf: "center" },
  emptyIcon: { width: 84, height: 84, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 16 },
});

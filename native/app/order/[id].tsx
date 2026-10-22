import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator, Alert, AppState, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { api, ApiError, BASE_URL, imageUrl } from "@/api";
import { dateLong, money, time } from "@/format";
import { orderCache } from "@/orderCache";
import { useCartStore } from "@/store/cart";
import { ErrorView, tap } from "@/components/ui";
import { BackBar } from "@/components/iosui/BrandHeader";
import { VIOLET_PINK } from "@/components/TabBar";
import { iosText, useIOS } from "@/ios";
import { statusLook } from "@/orderStatus";
import { clearOrderStatus } from "@/unread";
import type { ChatMessage, Order, Product, Variant } from "@/types";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

type Pending = { key: string; text: string; createdAt: string; failed: boolean; sent?: boolean };

/** Messages can be plain text or JSON cards (photo / product) sent by the manager. */
function MessageBody({ text, color, fromManager }: { text: string; color: string; fromManager: boolean }) {
  // cards (photo / product) only from the manager — a customer can't fake them by typing JSON
  if (!fromManager) return <Text style={{ color, fontSize: 16, lineHeight: 21 }}>{text}</Text>;
  try {
    const obj = JSON.parse(text);
    if (obj?._t === "img" && typeof obj.url === "string") {
      return <Image source={{ uri: imageUrl(obj.url) ?? undefined }} style={{ width: 200, height: 200, borderRadius: 12 }} contentFit="cover" />;
    }
    if (obj?._t === "product" && typeof obj.name === "string") {
      return (
        <View style={{ width: 210 }}>
          {obj.imagePath ? (
            <Image source={{ uri: imageUrl(obj.imagePath) ?? undefined }} style={{ width: 210, height: 120, borderRadius: 10, backgroundColor: "#fff" }} contentFit="contain" />
          ) : null}
          <Text style={{ fontWeight: "600", marginTop: 6, color }}>{obj.name}</Text>
          {typeof obj.price === "number" ? <Text style={{ color: PINK, fontWeight: "700" }}>{money(obj.price)}</Text> : null}
        </View>
      );
    }
  } catch {
    /* plain text */
  }
  return <Text style={{ color, fontSize: 16, lineHeight: 21 }}>{text}</Text>;
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const repeat = useCartStore((s) => s.repeat);
  const [order, setOrder] = useState<Order | null>(orderCache.get(orderId) ?? null);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"" | "cancel" | "confirm">("");
  const [repeating, setRepeating] = useState(false);
  const [kb, setKb] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const nearBottom = useRef(true);
  const lastCount = useRef(0);

  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => setKb(true));
    const b = Keyboard.addListener("keyboardDidHide", () => setKb(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const loadOrder = useCallback(async () => {
    setError("");
    try {
      const fresh = await api.order(orderId);
      setOrder((prev) => ({ ...(prev ?? {}), ...fresh, items: fresh.items.map((it) => {
        const old = prev?.items.find((x) => x.id === it.id);
        return { ...old, ...it };
      }) }) as Order);
    } catch (e) {
      if (!orderCache.get(orderId)) setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, [orderId]);

  const loadMessages = useCallback(async () => {
    try {
      const r = await api.messages(orderId);
      setMessages((prev) =>
        prev.length === r.messages.length && prev[prev.length - 1]?.id === r.messages[r.messages.length - 1]?.id ? prev : r.messages
      );
      // messages already sent are now in the server list
      setPending((p) => (p.some((x) => x.sent) ? p.filter((x) => !x.sent) : p));
      clearOrderStatus(); // messages were read — refresh the bell next time
      setChatError(false);
      return true;
    } catch {
      setChatError(true);
      return false;
    } finally {
      setChatLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // chat refresh every 15 s only while this screen is open and in front
  useFocusEffect(
    useCallback(() => {
      loadMessages();
      const t = setInterval(() => {
        if (AppState.currentState === "active") loadMessages();
      }, 15000);
      return () => clearInterval(t);
    }, [loadMessages])
  );

  // new replies: scroll down only if the user is already at the bottom (don't disturb reading)
  useEffect(() => {
    if (messages.length > lastCount.current && lastCount.current > 0 && nearBottom.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
    lastCount.current = messages.length;
  }, [messages.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    nearBottom.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 120;
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/orders"));
  const bg = dark ? "#000" : "#F7F7FA";

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top, paddingHorizontal: 16 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <BackBar onBack={goBack} color={c.label} />
        {error ? <ErrorView message={error} onRetry={loadOrder} /> : <ActivityIndicator style={{ flex: 1 }} color={VIOLET} />}
      </View>
    );
  }

  const s = statusLook(order.status, dark);
  const needsConfirm = order.status === "consultation" && !order.customerConfirmed;

  const send = async (msg: string, key?: string) => {
    const t = msg.trim();
    if (!t) return;
    const k = key ?? `p${Date.now()}`;
    // show the message right away; it is replaced by the server copy after loading
    setPending((p) => (key ? p.map((x) => (x.key === k ? { ...x, failed: false } : x)) : [...p, { key: k, text: t, createdAt: new Date().toISOString(), failed: false }]));
    if (!key) setText("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    try {
      await api.sendMessage(orderId, t);
      const ok = await loadMessages();
      // if the list couldn't be refreshed, keep the bubble (as sent) until the next refresh
      setPending((p) => (ok ? p.filter((x) => x.key !== k) : p.map((x) => (x.key === k ? { ...x, sent: true, failed: false } : x))));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      setPending((p) => p.map((x) => (x.key === k ? { ...x, failed: true } : x)));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  // repeat with current prices and stock; unavailable items are skipped and listed
  const repeatOrder = async () => {
    if (repeating) return;
    setRepeating(true);
    try {
      const ids = [...new Set(order.items.map((i) => i.productId))];
      const fresh = new Map<number, Product>();
      let failed = 0;
      await Promise.all(
        ids.map((pid) =>
          api
            .product(pid)
            .then((p) => {
              fresh.set(pid, p);
            })
            .catch((e) => {
              // 404 = product removed; other errors = network problem
              if (!(e instanceof ApiError && e.status === 404)) failed++;
            })
        )
      );
      if (failed > 0 && fresh.size === 0) {
        Alert.alert("Нет связи", "Не удалось получить актуальные цены. Попробуйте ещё раз.");
        return;
      }
      const variantIds = new Map<string, Variant>();
      const withVariants = [...new Set(order.items.filter((i) => i.variantName).map((i) => i.productId))];
      await Promise.all(
        withVariants.map((pid) =>
          api
            .variants(pid)
            .then((r) => (r.variants ?? []).forEach((v) => variantIds.set(`${pid}|${v.name}`, v)))
            .catch(() => {})
        )
      );
      const skipped = repeat(order.items, fresh, variantIds);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (skipped.length) {
        Alert.alert(
          skipped.length === order.items.length ? "Товаров нет в наличии" : "Добавлено не всё",
          `Сейчас нет в наличии:\n${skipped.join("\n")}\n\nОстальные товары добавлены по текущим ценам.`,
          [{ text: "В корзину", onPress: () => router.navigate("/cart") }, { text: "OK" }]
        );
      } else {
        router.navigate("/cart");
      }
    } finally {
      setRepeating(false);
    }
  };

  const cancel = () =>
    Alert.alert("Отменить заказ?", `Заказ №${order.id} будет отменён.`, [
      { text: "Нет", style: "cancel" },
      {
        text: "Отменить заказ",
        style: "destructive",
        onPress: async () => {
          setBusy("cancel");
          try {
            await api.cancelOrder(order.id);
            setOrder({ ...order, status: "cancelled" });
            orderCache.set(order.id, { ...order, status: "cancelled" });
          } catch (e) {
            Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось отменить");
          } finally {
            setBusy("");
          }
        },
      },
    ]);

  const confirm = async () => {
    setBusy("confirm");
    try {
      await api.confirmOrder(order.id);
      setOrder({ ...order, customerConfirmed: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось подтвердить");
    } finally {
      setBusy("");
    }
  };

  const panel = [styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow];
  const outBubble = dark ? "rgba(139,61,255,0.28)" : "#F6E9FB";

  const bubble = (key: string | number, mine: boolean, body: string, at: string, extra?: ReactNode) => (
    <View key={key} style={[styles.bubble, mine ? [styles.mine, { backgroundColor: outBubble }] : [styles.theirs, { backgroundColor: dark ? "#2C2C2E" : "#F2F2F7" }]]}>
      {!mine ? <Text style={styles.from}>Менеджер</Text> : null}
      <MessageBody text={body} color={c.label} fromManager={!mine} />
      <View style={styles.metaRow}>
        {extra}
        <Text style={[styles.time, { color: c.secondary }]}>{time(at)}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16, backgroundColor: bg }}>
        <View style={styles.wrap}>
          <BackBar onBack={goBack} color={c.label} />
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={64}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <Text style={[iosText.largeTitle, { color: c.label, marginTop: 4 }]} accessibilityRole="header">
            Заказ №{order.id}
          </Text>
          <View style={styles.headRow}>
            <View style={[styles.status, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon} size={22} color={s.fg} />
              <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
            </View>
            <Text style={[iosText.subhead, { color: c.secondary }]}>от {dateLong(order.createdAt)}</Text>
          </View>

          {needsConfirm ? (
            <View style={[panel, { gap: 10 }]}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <Ionicons name="information-circle-outline" size={20} color={VIOLET} />
                <Text style={[iosText.subhead, { color: c.label, flex: 1 }]}>Менеджер изменил заказ после консультации. Проверьте состав и подтвердите.</Text>
              </View>
              <GradientButton title="Подтвердить заказ" icon="checkmark-done" loading={busy === "confirm"} onPress={confirm} />
            </View>
          ) : null}

          {/* items */}
          <View style={panel}>
            <Text style={[styles.h, { color: c.label }]}>Товары в заказе</Text>
            {order.items.map((it, i) => {
              const img = it.variantImageUrl ? imageUrl(it.variantImageUrl) : imageUrl(it.imagePath);
              return (
                <Pressable
                  key={it.id}
                  onPress={() => {
                    tap();
                    router.push(`/product/${it.productId}`);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={it.productName}
                  style={({ pressed }) => [styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }, pressed && { opacity: 0.7 }]}
                >
                  <View style={[styles.photo, { backgroundColor: dark ? "#fff" : "#F4F4F7" }]}>
                    {img ? <Image source={{ uri: img }} style={{ width: "88%", height: "88%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={26} color="#AEAEB2" />}
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontSize: 16, lineHeight: 21, color: c.label }}>{it.productName}</Text>
                    {it.variantName ? <Text style={{ color: VIOLET, fontSize: 13, fontWeight: "600" }}>{it.variantName}</Text> : null}
                    <View style={[styles.pricePill, { backgroundColor: dark ? "rgba(139,61,255,0.22)" : "rgba(139,61,255,0.09)" }]}>
                      <Text style={styles.priceText}>
                        {money(it.price)}
                        {it.quantity > 1 ? ` × ${it.quantity}` : ""}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={19} color={c.chevron} />
                </Pressable>
              );
            })}
            <View style={[styles.totalRow, { borderTopColor: c.separator }]}>
              <Text style={[iosText.headline, { color: c.label }]}>Итого</Text>
              <Text style={styles.total}>{money(order.total)}</Text>
            </View>
          </View>

          {order.comment ? (
            <View style={panel}>
              <Text style={[iosText.footnote, { color: c.secondary }]}>Комментарий</Text>
              <Text style={{ color: c.label, fontSize: 16, marginTop: 4 }}>{order.comment}</Text>
            </View>
          ) : null}

          {/* actions — existing logic */}
          <View style={styles.actions}>
            <GradientButton title="Повторить" icon="refresh" loading={repeating} onPress={repeatOrder} />
            <Pressable
              onPress={() => {
                tap();
                WebBrowser.openBrowserAsync(`${BASE_URL}/orders/${order.id}/invoice`);
              }}
              accessibilityRole="button"
              accessibilityLabel="Накладная"
              style={({ pressed }) => [styles.outline, { backgroundColor: c.cell, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="document-text-outline" size={22} color={VIOLET} />
              <Text style={styles.outlineText}>Накладная</Text>
            </Pressable>
          </View>
          {order.status === "pending" ? (
            <Pressable onPress={cancel} disabled={busy === "cancel"} style={styles.cancel} accessibilityRole="button">
              {busy === "cancel" ? <ActivityIndicator color="#FF3B30" /> : <Text style={[iosText.body, { color: "#FF3B30" }]}>Отменить заказ</Text>}
            </Pressable>
          ) : null}

          {/* chat */}
          <View style={[panel, { marginTop: 16 }]}>
            <View style={styles.chatHead}>
              <Ionicons name="chatbubble-ellipses-outline" size={26} color={VIOLET} />
              <Text style={[styles.h, { color: c.label, marginBottom: 0 }]}>Чат с менеджером</Text>
            </View>
            {chatLoading ? (
              <ActivityIndicator style={{ marginVertical: 18 }} color={VIOLET} />
            ) : chatError && messages.length === 0 ? (
              <Pressable onPress={loadMessages} style={{ alignItems: "center", marginVertical: 14 }}>
                <Text style={[iosText.subhead, { color: c.secondary }]}>Не удалось загрузить сообщения</Text>
                <Text style={[iosText.subhead, { color: VIOLET, marginTop: 4 }]}>Повторить</Text>
              </Pressable>
            ) : messages.length === 0 && pending.length === 0 ? (
              <Text style={[iosText.subhead, { color: c.secondary, textAlign: "center", marginVertical: 14 }]}>Напишите, если есть вопросы по заказу</Text>
            ) : null}
            {messages.map((m) => bubble(m.id, !m.isFromManager, m.text, m.createdAt))}
            {pending.map((p) =>
              p.failed ? (
                <Pressable key={p.key} onPress={() => send(p.text, p.key)} accessibilityRole="button" accessibilityLabel="Не отправлено. Нажмите, чтобы повторить">
                  {bubble(
                    p.key + "b",
                    true,
                    p.text,
                    p.createdAt,
                    <Text style={{ color: "#FF3B30", fontSize: 12 }}>Не отправлено · повторить</Text>
                  )}
                </Pressable>
              ) : (
                bubble(p.key, true, p.text, p.createdAt, p.sent ? undefined : <ActivityIndicator size="small" color={c.secondary} style={{ transform: [{ scale: 0.7 }] }} />)
              )
            )}
          </View>
        </View>
      </ScrollView>

      {/* message input, pinned to the bottom (stays above the keyboard) */}
      <View style={[styles.composer, { paddingBottom: kb ? 8 : Math.max(insets.bottom, 8), backgroundColor: dark ? "#111" : "#fff" }, !dark && styles.composerShadow]}>
        <View style={[styles.wrap, { flexDirection: "row", alignItems: "flex-end", gap: 10 }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Написать сообщение…"
            placeholderTextColor={c.secondary}
            style={[styles.input, { backgroundColor: dark ? "#1C1C1E" : "#F2F2F7", color: c.label }]}
            multiline
            maxLength={2000}
          />
          <Pressable onPress={() => send(text)} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel="Отправить" style={{ opacity: text.trim() ? 1 : 0.45 }}>
            <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.send}>
              <Ionicons name="paper-plane-outline" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function GradientButton({ title, icon, onPress, loading }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        if (loading) return;
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.9 : 1 }]}
    >
      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={icon} size={22} color="#fff" />}
        <Text style={styles.ctaText} numberOfLines={1}>
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 640, alignSelf: "center" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.07)" },
  headRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 8 },
  status: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: "100%" },
  statusText: { fontSize: 17, fontWeight: "600", flexShrink: 1 },
  panel: { borderRadius: 22, padding: 16, marginTop: 14 },
  h: { fontSize: 21, fontWeight: "700", marginBottom: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  photo: { width: 92, height: 92, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  pricePill: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  priceText: { color: VIOLET, fontSize: 16, fontWeight: "600" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 2 },
  total: { color: PINK, fontSize: 22, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cta: { height: 54, borderRadius: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 12, boxShadow: "0 8px 20px rgba(139,61,255,0.3)" },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "600", flexShrink: 1 },
  outline: { flex: 1, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: VIOLET, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  outlineText: { color: VIOLET, fontSize: 17, fontWeight: "600" },
  cancel: { alignSelf: "center", paddingVertical: 12, paddingHorizontal: 16, marginTop: 4 },
  chatHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  bubble: { maxWidth: "84%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, marginTop: 8 },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  from: { color: PINK, fontWeight: "600", fontSize: 12, marginBottom: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 3 },
  time: { fontSize: 12 },
  composer: { paddingTop: 10, paddingHorizontal: 16 },
  composerShadow: { boxShadow: "0 -4px 18px rgba(31,41,55,0.07)" },
  input: { flex: 1, minHeight: 48, maxHeight: 130, borderRadius: 24, paddingHorizontal: 18, paddingTop: 13, paddingBottom: 13, fontSize: 16 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px rgba(139,61,255,0.35)" },
});

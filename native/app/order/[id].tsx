import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { api, BASE_URL, imageUrl } from "@/api";
import { colors, radius, themed } from "@/theme";
import { date, money, time } from "@/format";
import { orderCache } from "@/orderCache";
import { useCartStore } from "@/store/cart";
import { Button, ErrorView, Header, Loading, Notice } from "@/components/ui";
import { alpha, STATUS_LABELS, STATUS_TONE, type ChatMessage, type Order } from "@/types";

/** Messages can be plain text or JSON cards (photo / product) sent by the manager. */
function MessageBody({ text, mine }: { text: string; mine: boolean }) {
  try {
    const obj = JSON.parse(text);
    if (obj?._t === "img" && typeof obj.url === "string") {
      return <Image source={{ uri: imageUrl(obj.url) ?? undefined }} style={{ width: 200, height: 200, borderRadius: 12 }} contentFit="cover" />;
    }
    if (obj?._t === "product" && typeof obj.name === "string") {
      return (
        <View style={{ width: 210 }}>
          {obj.imagePath ? (
            <Image source={{ uri: imageUrl(obj.imagePath) ?? undefined }} style={{ width: 210, height: 120, borderRadius: 10, backgroundColor: colors.card }} contentFit="contain" />
          ) : null}
          <Text style={{ fontWeight: "700", marginTop: 6, color: mine ? "#fff" : colors.text }}>{obj.name}</Text>
          {typeof obj.price === "number" ? <Text style={{ color: mine ? "#fff" : colors.pink, fontWeight: "800" }}>{money(obj.price)}</Text> : null}
        </View>
      );
    }
  } catch {
    /* plain text */
  }
  return <Text style={{ color: mine ? "#fff" : colors.text, fontSize: 15, lineHeight: 20 }}>{text}</Text>;
}

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const repeat = useCartStore((s) => s.repeat);
  const [order, setOrder] = useState<Order | null>(orderCache.get(orderId) ?? null);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState<"" | "cancel" | "confirm">("");
  const scrollRef = useRef<ScrollView>(null);

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
      setMessages(r.messages);
    } catch {
      /* chat unavailable */
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
    loadMessages();
    const t = setInterval(loadMessages, 15000);
    return () => clearInterval(t);
  }, [loadOrder, loadMessages]);

  if (error || !order)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header back title={`Заказ №${orderId}`} />
        {error ? <ErrorView message={error} onRetry={loadOrder} /> : <Loading />}
      </View>
    );

  const tone = STATUS_TONE[order.status] ?? { color: "#9aa0ad", icon: "cube-outline" as const };
  const needsConfirm = order.status === "consultation" && !order.customerConfirmed;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await api.sendMessage(orderId, t);
      setText("");
      await loadMessages();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert("Не отправлено", e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSending(false);
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header back title={`Заказ №${order.id}`} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 14, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <View style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: alpha(tone.color, 0.14), borderColor: alpha(tone.color, 0.45) }}>
            <Text style={{ color: tone.color, fontSize: 12, fontWeight: "700" }}>{STATUS_LABELS[order.status] ?? order.status}</Text>
          </View>
          <Text style={styles.meta}>от {date(order.createdAt)}</Text>
        </View>

        {needsConfirm && (
          <View style={{ marginTop: 12 }}>
            <Notice tone="info" text="Менеджер изменил заказ после консультации. Проверьте состав и подтвердите." />
            <Button title="Подтвердить заказ" icon="checkmark-done" loading={busy === "confirm"} onPress={confirm} />
          </View>
        )}

        <View style={styles.box}>
          {order.items.map((it, i) => {
            const img = it.variantImageUrl ? imageUrl(it.variantImageUrl) : imageUrl(it.imagePath);
            return (
              <Pressable key={it.id} onPress={() => router.push(`/product/${it.productId}`)} style={[styles.item, i > 0 && styles.sep]}>
                {img ? <Image source={{ uri: img }} style={styles.img} contentFit="contain" /> : <View style={styles.img} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{it.productName}</Text>
                  {it.variantName ? <Text style={styles.variant}>{it.variantName}</Text> : null}
                  <Text style={styles.meta}>{money(it.price)} × {it.quantity}</Text>
                </View>
                <Text style={styles.itemSum}>{money(it.total)}</Text>
              </Pressable>
            );
          })}
          <View style={[styles.sep, styles.totalRow]}>
            <Text style={styles.totalLabel}>Итого</Text>
            <Text style={styles.total}>{money(order.total)}</Text>
          </View>
        </View>

        {order.comment ? (
          <View style={[styles.box, { padding: 14 }]}>
            <Text style={styles.small}>Комментарий</Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>{order.comment}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Повторить"
            icon="refresh"
            variant="outline"
            small
            style={{ flex: 1 }}
            onPress={() => {
              repeat(order.items);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              router.navigate("/cart");
            }}
          />
          <Button
            title="Накладная"
            icon="document-text-outline"
            variant="outline"
            small
            style={{ flex: 1 }}
            onPress={() => WebBrowser.openBrowserAsync(`${BASE_URL}/orders/${order.id}/invoice`)}
          />
        </View>
        {order.status === "pending" && (
          <Button title="Отменить заказ" variant="danger" small loading={busy === "cancel"} onPress={cancel} style={{ marginTop: 10 }} />
        )}

        <Text style={styles.h}>Чат с менеджером</Text>
        {messages.length === 0 ? (
          <Text style={[styles.meta, { textAlign: "center", marginVertical: 12 }]}>Напишите, если есть вопросы по заказу</Text>
        ) : (
          messages.map((m) => {
            const mine = !m.isFromManager;
            return (
              <View key={m.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                {!mine && <Text style={styles.from}>Менеджер</Text>}
                <MessageBody text={m.text} mine={mine} />
                <Text style={[styles.time, mine && { color: "rgba(255,255,255,0.75)" }]}>{time(m.createdAt)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Сообщение менеджеру"
          placeholderTextColor={colors.faint}
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <Pressable onPress={send} disabled={sending || !text.trim()} style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => ({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  box: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: 12, overflow: "hidden" },
  item: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  sep: { borderTopWidth: 1, borderTopColor: colors.soft },
  img: { width: 46, height: 46, borderRadius: 8, backgroundColor: "#ffffff" },
  itemName: { fontWeight: "700", color: colors.text, fontSize: 13 },
  variant: { color: colors.violet, fontSize: 12, fontWeight: "700" },
  itemSum: { fontWeight: "800", color: colors.text },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: 14 },
  totalLabel: { fontSize: 16, fontWeight: "800", color: colors.text },
  total: { fontSize: 18, fontWeight: "900", color: colors.pink },
  small: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  h: { fontSize: 18, fontWeight: "900", color: colors.text, marginTop: 24, marginBottom: 10 },
  bubble: { maxWidth: "82%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.pink, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  from: { color: colors.pink, fontWeight: "800", fontSize: 12, marginBottom: 2 },
  time: { color: colors.faint, fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  composer: {
    flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, paddingBottom: Platform.OS === "ios" ? 28 : 10,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 21, backgroundColor: colors.soft, paddingHorizontal: 16,
    paddingTop: 11, paddingBottom: 11, fontSize: 15, color: colors.text,
  },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.pink, alignItems: "center", justifyContent: "center" },
}));

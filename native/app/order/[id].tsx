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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { api, ApiError, BASE_URL, imageUrl } from "@/api";
import { dateLong, money, time } from "@/format";
import { orderCache } from "@/orderCache";
import { useCartStore } from "@/store/cart";
import { useAuth } from "@/store/auth";
import { NO_LINES, useOrderEdit } from "@/store/orderEdit";
import { priceFor, resolveCustomerPriceType } from "@/pricing";
import { ErrorView, tap } from "@/components/ui";
import { BackBar } from "@/components/iosui/BrandHeader";
import { VIOLET_PINK } from "@/components/TabBar";
import { iosText, useIOS } from "@/ios";
import { statusLook } from "@/orderStatus";
import { clearOrderStatus } from "@/unread";
import type { ChatMessage, LineChange, Order, Product, RemovedOrderItem, Variant } from "@/types";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

type Pending = { key: string; text: string; createdAt: string; failed: boolean; sent?: boolean };

function fileSize(bytes: unknown): string {
  const b = typeof bytes === "number" ? bytes : 0;
  if (b <= 0) return "";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} КБ`;
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}

/**
 * Chat attachments are only ever files uploaded to our own /api/uploads/chat/ (same name format the
 * server accepts). Anything else — another host, http://, «..» in the path — is shown as plain text
 * and never loaded or opened, whoever sent it.
 */
const CHAT_FILE = /^\/api\/uploads\/chat\/chat-[0-9]+-[a-z0-9]+\.[a-z0-9]+$/;
function chatFileUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const path = url.startsWith(BASE_URL + "/") ? url.slice(BASE_URL.length) : url;
  return CHAT_FILE.test(path) ? BASE_URL + path : null;
}

/** opens a photo / video / file from the chat in the system viewer */
function openAttachment(url: string) {
  const u = chatFileUrl(url);
  if (u) WebBrowser.openBrowserAsync(u).catch(() => {});
}

/** Messages can be plain text or JSON cards: photo / video / file (both sides), product (manager). */
function MessageBody({ text, color, fromManager }: { text: string; color: string; fromManager: boolean }) {
  try {
    const obj = JSON.parse(text);
    // attachments: from either side, but only files uploaded to our own server
    const fileUrl = chatFileUrl(obj?.url);
    const own = fileUrl !== null;
    if (own && obj._t === "img") {
      return (
        <Pressable onPress={() => openAttachment(obj.url)} accessibilityRole="imagebutton" accessibilityLabel="Фото, открыть">
          <Image source={{ uri: fileUrl }} style={{ width: 200, height: 200, borderRadius: 12 }} contentFit="cover" />
        </Pressable>
      );
    }
    if (own && obj._t === "video") {
      return (
        <Pressable onPress={() => openAttachment(obj.url)} accessibilityRole="button" accessibilityLabel="Видео, смотреть" style={styles.video}>
          <Ionicons name="play-circle" size={54} color="#fff" />
          <Text style={styles.videoText} numberOfLines={1}>
            Видео{fileSize(obj.size) ? ` · ${fileSize(obj.size)}` : ""}
          </Text>
        </Pressable>
      );
    }
    if (own && obj._t === "file") {
      const name = typeof obj.name === "string" ? obj.name : "Файл";
      const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 4);
      return (
        <Pressable onPress={() => openAttachment(obj.url)} accessibilityRole="button" accessibilityLabel={`Файл ${name}, открыть`} style={styles.file}>
          <View style={styles.fileIcon}>
            <Text style={styles.fileExt}>{ext || "FILE"}</Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color, fontWeight: "600", fontSize: 15 }} numberOfLines={2}>
              {name}
            </Text>
            <Text style={{ color, opacity: 0.7, fontSize: 13, marginTop: 2 }}>{[fileSize(obj.size), "Открыть"].filter(Boolean).join(" · ")}</Text>
          </View>
        </Pressable>
      );
    }
    // product cards only from the manager — a customer can't fake them by typing JSON
    if (!fromManager) return <Text style={{ color, fontSize: 16, lineHeight: 21 }}>{text}</Text>;
    if (obj?._t === "product" && typeof obj.name === "string") {
      return (
        <View style={{ width: 210 }}>
          {typeof obj.imagePath === "string" && imageUrl(obj.imagePath)?.startsWith(BASE_URL + "/") ? (
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
  // deep links can carry anything here — only a positive whole number is an order id
  const orderId = /^[0-9]+$/.test(String(id ?? "")) ? Number(id) : NaN;
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
  const [busy, setBusy] = useState<"" | "cancel" | "confirm" | "save">("");
  // changing the order: new quantities, removed lines; added products wait in useOrderEdit
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const added = useOrderEdit((st) => (st.orderId === orderId ? st.added : NO_LINES));
  const editStore = useOrderEdit();
  const customer = useAuth((st) => st.customer);
  const [repeating, setRepeating] = useState(false);
  const [kb, setKb] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // name of the file being sent
  // taps that arrive before the re-render (double tap) must not add the order to the cart twice
  const repeatBusy = useRef(false);
  const actionBusy = useRef(false);
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
    if (!Number.isFinite(orderId)) {
      setError("Заказ не найден");
      return;
    }
    try {
      const fresh = await api.order(orderId);
      setOrder((prev) => ({ ...(prev ?? {}), ...fresh, items: (fresh.items ?? []).map((it) => {
        const old = prev?.items?.find((x) => x.id === it.id);
        return { ...old, ...it };
      }) }) as Order);
    } catch (e) {
      // not this account's order (or signed out): never keep showing a cached copy
      if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) {
        orderCache.delete(orderId);
        setOrder(null);
        setError(e.message);
        return;
      }
      if (!orderCache.get(orderId)) setError(e instanceof Error ? e.message : "Ошибка");
    }
  }, [orderId]);

  const loadMessages = useCallback(async () => {
    if (!Number.isFinite(orderId)) {
      setChatLoading(false);
      return false;
    }
    try {
      const r = await api.messages(orderId);
      const list = Array.isArray(r?.messages) ? r.messages : [];
      setMessages((prev) =>
        prev.length === list.length && prev[prev.length - 1]?.id === list[list.length - 1]?.id ? prev : list
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
  const bg = "transparent";

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top, paddingHorizontal: 16 }}>
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

  // ── attachments: photo / video from the gallery or camera, any file ──
  const sendFile = async (file: { uri: string; name: string; mime: string }) => {
    setUploading(file.name);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    try {
      const up = await api.uploadChat(file);
      const msg = up.kind === "img" ? JSON.stringify({ _t: "img", url: up.url }) : JSON.stringify({ _t: up.kind, url: up.url, name: up.name, size: up.size });
      await api.sendMessage(orderId, msg);
      await loadMessages();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Не отправлено", e instanceof Error ? e.message : "Не удалось отправить файл");
    } finally {
      setUploading(null);
    }
  };

  const fromAsset = (a: ImagePicker.ImagePickerAsset) => {
    const isVideo = a.type === "video";
    const ext = isVideo ? (a.uri.split(".").pop() || "mp4").toLowerCase() : (a.uri.split(".").pop() || "jpg").toLowerCase();
    const name = a.fileName || `${isVideo ? "video" : "photo"}-${Date.now()}.${ext}`;
    const mime = a.mimeType || (isVideo ? (ext === "mov" ? "video/quicktime" : "video/mp4") : ext === "png" ? "image/png" : "image/jpeg");
    return { uri: a.uri, name, mime };
  };

  const attach = async (how: string) => {
    setAttachOpen(false);
    // let the sheet close before the system picker opens (iOS can't show two at once)
    await new Promise((r) => setTimeout(r, 450));
    try {
      if (how === "file") {
        const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
        if (r.canceled || !r.assets?.[0]) return;
        const d = r.assets[0];
        await sendFile({ uri: d.uri, name: d.name || `file-${Date.now()}`, mime: d.mimeType || "application/octet-stream" });
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images", "videos"], quality: 0.8, videoMaxDuration: 120 };
      if (how === "camera") {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
          Alert.alert("Нет доступа к камере", "Разрешите доступ к камере в настройках телефона.");
          return;
        }
      }
      const r = how === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (r.canceled || !r.assets?.[0]) return;
      await sendFile(fromAsset(r.assets[0]));
    } catch (e) {
      Alert.alert("Не получилось", e instanceof Error ? e.message : "Попробуйте ещё раз");
    }
  };

  // repeat with current prices and stock; unavailable items are skipped and listed
  const repeatOrder = async () => {
    if (repeating || repeatBusy.current) return;
    repeatBusy.current = true;
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
      repeatBusy.current = false;
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
          if (actionBusy.current) return;
          actionBusy.current = true;
          setBusy("cancel");
          try {
            await api.cancelOrder(order.id);
            setOrder({ ...order, status: "cancelled" });
            orderCache.set(order.id, { ...order, status: "cancelled" });
          } catch (e) {
            Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось отменить");
          } finally {
            actionBusy.current = false;
            setBusy("");
          }
        },
      },
    ]);

  const confirm = async () => {
    if (actionBusy.current) return;
    actionBusy.current = true;
    setBusy("confirm");
    try {
      await api.confirmOrder(order.id);
      setOrder({ ...order, customerConfirmed: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      Alert.alert("Ошибка", e instanceof Error ? e.message : "Не удалось подтвердить");
    } finally {
      actionBusy.current = false;
      setBusy("");
    }
  };

  const startEdit = () => {
    tap();
    setQty(Object.fromEntries(order.items.map((it) => [it.id, it.quantity])));
    setRemoved(new Set());
    editStore.start(order.id);
    setEditing(true);
  };
  const stopEdit = () => {
    setEditing(false);
    setQty({});
    setRemoved(new Set());
    editStore.clear();
  };
  const priceType = resolveCustomerPriceType(customer);
  const draftTotal =
    order.items.filter((it) => !removed.has(it.id)).reduce((sum, it) => sum + it.price * (qty[it.id] ?? it.quantity), 0) +
    added.reduce((sum, l) => sum + priceFor(l.product, priceType) * l.quantity, 0);
  const draftChanged =
    removed.size > 0 || added.length > 0 || order.items.some((it) => (qty[it.id] ?? it.quantity) !== it.quantity);

  const saveEdit = async () => {
    if (actionBusy.current) return;
    if (!draftChanged) {
      stopEdit();
      return;
    }
    actionBusy.current = true;
    setBusy("save");
    try {
      await api.editOrder(order.id, {
        items: order.items
          .filter((it) => !removed.has(it.id) && (qty[it.id] ?? it.quantity) !== it.quantity)
          .map((it) => ({ id: it.id, quantity: qty[it.id] ?? it.quantity })),
        removeIds: [...removed],
        newItems: added.map((l) => ({ id: l.product.id, quantity: l.quantity, variantName: l.variantName, variantImageUrl: l.variantImageUrl })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      stopEdit();
      await loadOrder();
      loadMessages();
    } catch (e) {
      Alert.alert("Не удалось сохранить", e instanceof Error ? e.message : "Попробуйте ещё раз");
    } finally {
      actionBusy.current = false;
      setBusy("");
    }
  };

  const panel = [styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow];
  const outBubble = dark ? "rgba(139,61,255,0.28)" : "#F6E9FB";

  const bubble = (key: string | number, mine: boolean, body: string, at: string, extra?: ReactNode) => (
    <View key={key} style={[styles.bubble, mine ? [styles.mine, { backgroundColor: outBubble }] : [styles.theirs, { backgroundColor: dark ? "#352044" : "#F2F2F7" }]]}>
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <Text style={[styles.h, { color: c.label }]}>{editing ? "Изменение заказа" : "Товары в заказе"}</Text>
              {order.editable && !editing ? (
                <Pressable onPress={startEdit} hitSlop={8} accessibilityRole="button" style={styles.editLink}>
                  <Ionicons name="create-outline" size={18} color={VIOLET} />
                  <Text style={{ color: VIOLET, fontSize: 16, fontWeight: "600" }}>Изменить</Text>
                </Pressable>
              ) : null}
            </View>
            {editing ? (
              <Text style={[iosText.footnote, { color: c.secondary, marginBottom: 4 }]}>
                Измените количество, уберите лишнее или добавьте товары. Менеджер увидит изменения.
              </Text>
            ) : null}
            {order.items.map((it, i) => {
              const img = it.variantImageUrl ? imageUrl(it.variantImageUrl) : imageUrl(it.imagePath, 160);
              const gone = editing && removed.has(it.id);
              const q = editing ? qty[it.id] ?? it.quantity : it.quantity;
              return (
                <Pressable
                  key={it.id}
                  disabled={editing}
                  onPress={() => {
                    tap();
                    router.push(`/product/${it.productId}`);
                  }}
                  accessibilityRole={editing ? undefined : "button"}
                  accessibilityLabel={it.productName}
                  style={({ pressed }) => [styles.item, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }, pressed && { opacity: 0.7 }, gone && { opacity: 0.45 }]}
                >
                  <View style={[styles.photo, editing && styles.photoSmall, { backgroundColor: dark ? "#fff" : "#F4F4F7" }]}>
                    {img ? <Image source={{ uri: img }} style={{ width: "88%", height: "88%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={26} color="#AEAEB2" />}
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontSize: 16, lineHeight: 21, color: c.label, textDecorationLine: gone ? "line-through" : "none" }}>{it.productName}</Text>
                    {it.variantName ? <Text style={{ color: VIOLET, fontSize: 13, fontWeight: "600" }}>{it.variantName}</Text> : null}
                    {editing ? (
                      gone ? (
                        <Pressable
                          onPress={() => {
                            tap();
                            setRemoved((r) => {
                              const n = new Set(r);
                              n.delete(it.id);
                              return n;
                            });
                          }}
                          accessibilityRole="button"
                          style={styles.restore}
                        >
                          <Ionicons name="arrow-undo-outline" size={16} color={VIOLET} />
                          <Text style={{ color: VIOLET, fontWeight: "600" }}>Вернуть</Text>
                        </Pressable>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Stepper value={q} onChange={(n) => setQty((m) => ({ ...m, [it.id]: n }))} />
                          <Text style={{ color: c.secondary, fontSize: 14 }}>× {money(it.price)}</Text>
                        </View>
                      )
                    ) : (
                      <>
                        <View style={[styles.pricePill, { backgroundColor: dark ? "rgba(139,61,255,0.22)" : "rgba(139,61,255,0.09)" }]}>
                          <Text style={styles.priceText}>
                            {money(it.price)}
                            {it.quantity > 1 ? ` × ${it.quantity}` : ""}
                          </Text>
                        </View>
                        {it.staffChange ? <ManagerBadge ch={it.staffChange} /> : null}
                      </>
                    )}
                  </View>
                  {editing ? (
                    gone ? null : (
                      <Pressable
                        onPress={() => {
                          tap();
                          setRemoved((r) => new Set(r).add(it.id));
                        }}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Убрать ${it.productName}`}
                        style={styles.trash}
                      >
                        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                      </Pressable>
                    )
                  ) : (
                    <Ionicons name="chevron-forward" size={19} color={c.chevron} />
                  )}
                </Pressable>
              );
            })}
            {editing
              ? added.map((l) => {
                  const img = l.variantImageUrl ? imageUrl(l.variantImageUrl) : imageUrl(l.product.images?.[0]?.path, 160);
                  return (
                    <View key={l.key} style={[styles.item, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }]}>
                      <View style={[styles.photo, styles.photoSmall, { backgroundColor: dark ? "#fff" : "#F4F4F7" }]}>
                        {img ? <Image source={{ uri: img }} style={{ width: "88%", height: "88%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={26} color="#AEAEB2" />}
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={[styles.badge, { backgroundColor: "rgba(31,138,59,0.12)" }]}>
                          <Text style={[styles.badgeText, { color: "#1f8a3b" }]}>Новый</Text>
                        </View>
                        <Text style={{ fontSize: 16, lineHeight: 21, color: c.label }}>{l.product.name}</Text>
                        {l.variantName ? <Text style={{ color: VIOLET, fontSize: 13, fontWeight: "600" }}>{l.variantName}</Text> : null}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Stepper value={l.quantity} onChange={(n) => editStore.setQty(l.key, n)} />
                          <Text style={{ color: c.secondary, fontSize: 14 }}>× {money(priceFor(l.product, priceType))}</Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => {
                          tap();
                          editStore.remove(l.key);
                        }}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Убрать ${l.product.name}`}
                        style={styles.trash}
                      >
                        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                      </Pressable>
                    </View>
                  );
                })
              : null}
            {editing ? (
              <Pressable
                onPress={() => {
                  tap();
                  router.push(`/order-add?order=${order.id}`);
                }}
                accessibilityRole="button"
                style={[styles.addRow, { borderColor: dark ? "rgba(200,160,255,0.35)" : "rgba(139,61,255,0.35)" }]}
              >
                <Ionicons name="add-circle-outline" size={22} color={VIOLET} />
                <Text style={{ color: VIOLET, fontSize: 16, fontWeight: "600" }}>Добавить товары</Text>
              </Pressable>
            ) : null}
            {editing ? (
              <View style={[styles.totalRow, { borderTopColor: c.separator, marginTop: 12 }]}>
                <Text style={[iosText.headline, { color: c.label }]}>Будет</Text>
                <Text style={styles.total}>{money(draftTotal)}</Text>
              </View>
            ) : null}
            {editing ? (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => {
                    tap();
                    stopEdit();
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.outline, { backgroundColor: c.cell, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={styles.outlineText}>Отмена</Text>
                </Pressable>
                <GradientButton title="Сохранить" icon="checkmark" loading={busy === "save"} onPress={saveEdit} />
              </View>
            ) : null}
            {editing ? null : (
            <>
            {order.promoCode && order.discount ? (
              <View style={[styles.totalRow, { borderTopColor: c.separator }]}>
                <Text style={[iosText.subhead, { color: "#1f8a3b", flex: 1 }]} numberOfLines={1}>
                  Промокод {order.promoCode}
                </Text>
                <Text style={[iosText.subhead, { color: "#1f8a3b" }]}>−{money(order.discount)}</Text>
              </View>
            ) : null}
            {order.bonusesApplied ? (
              <View style={[styles.totalRow, { borderTopColor: c.separator }]}>
                <Text style={[iosText.subhead, { color: "#8b3dff", flex: 1 }]}>Списано бонусов</Text>
                <Text style={[iosText.subhead, { color: "#8b3dff" }]}>−{money(order.bonusesApplied)}</Text>
              </View>
            ) : null}
            <View style={[styles.totalRow, { borderTopColor: c.separator }]}>
              <Text style={[iosText.headline, { color: c.label }]}>Итого</Text>
              <Text style={styles.total}>{money(order.total)}</Text>
            </View>
            {order.bonusesCollected ? (
              <Text style={[iosText.footnote, { color: c.secondary, marginTop: 6 }]}>
                {order.status === "exported" ? "Начислено" : "Начислится после выполнения"}: {order.bonusesCollected.toLocaleString("ru-RU")} бонусов
              </Text>
            ) : null}
            </>
            )}
          </View>

          {/* lines taken out of the order — by the manager or by the customer */}
          {!editing && order.removedItems && order.removedItems.length > 0 ? <RemovedBlock items={order.removedItems} /> : null}

          {order.comment ? (
            <View style={panel}>
              <Text style={[iosText.footnote, { color: c.secondary }]}>Комментарий</Text>
              <Text style={{ color: c.label, fontSize: 16, marginTop: 4 }}>{order.comment}</Text>
            </View>
          ) : null}

          {/* actions — existing logic (hidden while the order is being changed) */}
          {editing ? null : (
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
          )}
          {order.status === "pending" && !editing ? (
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
            {uploading ? (
              <View style={[styles.bubble, styles.mine, { backgroundColor: dark ? "#352044" : "#F3ECFA", flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <ActivityIndicator size="small" color={VIOLET} />
                <Text style={{ color: c.label, flexShrink: 1 }} numberOfLines={1}>
                  Отправка: {uploading}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* message input, pinned to the bottom (stays above the keyboard) */}
      <View style={[styles.composer, { paddingBottom: kb ? 8 : Math.max(insets.bottom, 8), backgroundColor: dark ? "#211032" : "#fff" }, !dark && styles.composerShadow]}>
        <View style={[styles.wrap, { flexDirection: "row", alignItems: "flex-end", gap: 10 }]}>
          <Pressable
            onPress={() => {
              tap();
              Keyboard.dismiss();
              setAttachOpen(true);
            }}
            disabled={!!uploading}
            accessibilityRole="button"
            accessibilityLabel="Прикрепить фото, видео или файл"
            style={({ pressed }) => [styles.attach, { backgroundColor: dark ? "#2B193D" : "#F2F2F7", opacity: uploading ? 0.5 : pressed ? 0.7 : 1 }]}
          >
            {uploading ? <ActivityIndicator size="small" color={VIOLET} /> : <Ionicons name="attach" size={26} color={VIOLET} />}
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Написать сообщение…"
            placeholderTextColor={c.secondary}
            style={[styles.input, { backgroundColor: dark ? "#2B193D" : "#F2F2F7", color: c.label }]}
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
      <Sheet open={attachOpen} onClose={() => setAttachOpen(false)} title="Отправить менеджеру">
        <SheetOptions
          options={[
            { value: "library", label: "Фото или видео из галереи" },
            { value: "camera", label: "Снять фото или видео" },
            { value: "file", label: "Файл (PDF, документ, таблица)" },
          ]}
          value=""
          onSelect={attach}
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/** − n + for the order edit. */
function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <View style={[styles.stepper, { backgroundColor: dark ? "#352044" : "#F2F2F7" }]}>
      <Pressable
        onPress={() => {
          tap();
          onChange(Math.max(1, value - 1));
        }}
        disabled={value <= 1}
        hitSlop={6}
        accessibilityLabel="Меньше"
        style={[styles.stepBtn, { opacity: value <= 1 ? 0.35 : 1 }]}
      >
        <Ionicons name="remove" size={20} color={c.label} />
      </Pressable>
      <Text style={{ minWidth: 28, textAlign: "center", fontSize: 16, fontWeight: "700", color: c.label }}>{value}</Text>
      <Pressable
        onPress={() => {
          tap();
          onChange(value + 1);
        }}
        hitSlop={6}
        accessibilityLabel="Больше"
        style={styles.stepBtn}
      >
        <Ionicons name="add" size={20} color={VIOLET} />
      </Pressable>
    </View>
  );
}

/** «Добавлено менеджером» / «Изменено менеджером · было 2 шт.» under a line. */
function ManagerBadge({ ch }: { ch: LineChange }) {
  const was: string[] = [];
  if (ch.oldQuantity != null) was.push(`${ch.oldQuantity} шт.`);
  if (ch.oldPrice != null) was.push(money(ch.oldPrice));
  if (ch.oldVariant) was.push(ch.oldVariant);
  const added = ch.kind === "added";
  return (
    <View style={[styles.badge, { backgroundColor: added ? "rgba(31,138,59,0.12)" : "rgba(234,88,12,0.12)" }]}>
      <Ionicons name={added ? "add-circle-outline" : "create-outline"} size={14} color={added ? "#1f8a3b" : "#C2410C"} />
      <Text style={[styles.badgeText, { color: added ? "#1f8a3b" : "#C2410C" }]}>
        {added ? "Добавлено менеджером" : `Изменено менеджером${was.length ? ` · было ${was.join(", ")}` : ""}`}
      </Text>
    </View>
  );
}

/** «Удалено из заказа»: what the manager (or the customer) took out. */
function RemovedBlock({ items }: { items: RemovedOrderItem[] }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <View style={[styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow]}>
      <Text style={[styles.h, { color: c.label, fontSize: 18 }]}>Удалено из заказа</Text>
      {items.map((r, i) => {
        const img = r.imagePath ? imageUrl(r.imagePath, 160) : null;
        return (
          <View key={i} style={[styles.item, { paddingVertical: 10 }, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }]}>
            <View style={[styles.photo, styles.photoSmall, { backgroundColor: dark ? "#fff" : "#F4F4F7", opacity: 0.5 }]}>
              {img ? <Image source={{ uri: img }} style={{ width: "88%", height: "88%" }} contentFit="contain" /> : <Ionicons name="image-outline" size={22} color="#AEAEB2" />}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 15, lineHeight: 20, color: c.secondary, textDecorationLine: "line-through" }}>
                {r.productName}
                {r.variantName ? ` · ${r.variantName}` : ""}
              </Text>
              {r.quantity != null ? (
                <Text style={{ fontSize: 13, color: c.secondary }}>
                  {r.quantity} шт.{r.price != null ? ` × ${money(r.price)}` : ""}
                </Text>
              ) : null}
              <View style={[styles.badge, { backgroundColor: r.by === "staff" ? "rgba(255,59,48,0.1)" : "rgba(118,118,128,0.12)" }]}>
                <Ionicons name="trash-outline" size={13} color={r.by === "staff" ? "#D70015" : c.secondary} />
                <Text style={[styles.badgeText, { color: r.by === "staff" ? "#D70015" : c.secondary }]}>
                  {r.by === "staff" ? "Удалено менеджером" : "Удалено вами"}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
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
  photoSmall: { width: 64, height: 64, borderRadius: 12 },
  editLink: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12.5, fontWeight: "600", flexShrink: 1 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 4, height: 38 },
  stepBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  trash: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  restore: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 4 },
  addRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", marginTop: 10 },
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
  attach: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  video: { width: 210, height: 140, borderRadius: 12, backgroundColor: "#1b1030", alignItems: "center", justifyContent: "center", gap: 4 },
  videoText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  file: { flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 240 },
  fileIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(139,61,255,0.16)", alignItems: "center", justifyContent: "center" },
  fileExt: { color: VIOLET, fontSize: 11, fontWeight: "800" },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", boxShadow: "0 6px 14px rgba(139,61,255,0.35)" },
});

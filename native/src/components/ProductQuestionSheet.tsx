import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { api, imageUrl } from "@/api";
import { useIOS } from "@/ios";
import type { Product, Variant } from "@/types";
import { newChatRequestId } from "@/chatRequest";
import { Sheet } from "./iosui/Sheet";
import { GradientButton } from "./iosui/Buttons";

export function ProductQuestionSheet({ product, orderId, onClose, onSent }: { product: Product; orderId: number; onClose: () => void; onSent: () => void }) {
  const c = useIOS();
  const [question, setQuestion] = useState(""), [variant, setVariant] = useState<string | null>(null), [variants, setVariants] = useState<Variant[]>([]);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const lock = useRef(false), alive = useRef(true);
  const requestId = useRef(newChatRequestId());
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await api.variants(product.id); if (alive.current) setVariants(r.variants ?? []); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Не удалось загрузить варианты товара"); }
    finally { if (alive.current) setLoading(false); }
  }, [product.id]);
  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  const send = async () => {
    if (lock.current || !question.trim() || loading) return;
    lock.current = true; setBusy(true); setError("");
    try { await api.questionProduct(orderId, { productId: product.id, question: question.trim(), variantName: variant }, requestId.current); onSent(); }
    catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Вопрос не отправлен"); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  };
  return <Sheet open onClose={() => { if (!busy) onClose(); }} title="Вопрос о товаре">
    <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Image source={{ uri: imageUrl(product.images?.[0]?.path, 160) ?? undefined }} style={{ width: 64, height: 76, borderRadius: 10 }} contentFit="contain" /><Text style={{ color: c.label, flex: 1, fontWeight: "600", fontSize: 15 }}>{product.name}</Text></View>
      {loading ? <ActivityIndicator color="#8b3dff" /> : variants.length ? <><Text style={{ color: c.secondary }}>Вариант (необязательно)</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[{ name: "О товаре в целом", value: null }, ...variants.map(v => ({ name: v.name, value: v.name }))].map(v => <Pressable key={v.name} accessibilityRole="radio" accessibilityState={{ selected: variant === v.value }} disabled={busy} onPress={() => { requestId.current = newChatRequestId(); setVariant(v.value); }} style={{ padding: 10, borderRadius: 14, backgroundColor: variant === v.value ? "#8b3dff" : c.cell }}><Text style={{ color: variant === v.value ? "#fff" : c.label }}>{v.name}</Text></Pressable>)}</View></> : null}
      <TextInput accessibilityLabel="Вопрос о товаре" value={question} onChangeText={v => { requestId.current = newChatRequestId(); setQuestion(v); }} maxLength={1000} multiline editable={!busy} placeholder="Например: как использовать этот крем?" placeholderTextColor={c.secondary} style={{ color: c.label, backgroundColor: c.cell, borderRadius: 16, minHeight: 100, textAlignVertical: "top", padding: 14, fontSize: 16 }} />
      <Text style={{ color: c.secondary, fontSize: 13 }}>Карточка и вопрос придут менеджеру. Товар не добавляется в заказ.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: "#E5484D" }}>{error}</Text> : null}
      {error && !question.trim() ? <Pressable onPress={() => void load()}><Text style={{ color: "#8b3dff" }}>Повторить загрузку вариантов</Text></Pressable> : null}
      <GradientButton title="Отправить вопрос" loading={busy} disabled={loading || !question.trim()} onPress={() => void send()} />
    </ScrollView>
  </Sheet>;
}

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, type OrderReview } from "@/api";
import { useAuth } from "@/store/auth";
import { useIOS } from "@/ios";
import { colors } from "@/theme";
import { GradientButton } from "./iosui/Buttons";

export function OrderReviewCard({ orderId, onSkip }: { orderId: number; onSkip?: () => void }) {
  const c = useIOS();
  const customerId = useAuth(s => s.customer?.id);
  const key = `${customerId}:${orderId}`;
  const [loadedFor, setLoadedFor] = useState("");
  const [saved, setSaved] = useState<OrderReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sequence = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    const mine = ++sequence.current;
    busy.current = false; setSaving(false); setLoadedFor(""); setSaved(null); setRating(0); setComment(""); setError(""); setLoadError(false);
    if (customerId) api.orderReview(orderId).then(r => {
      if (mine !== sequence.current) return;
      setSaved(r.review); setLoadedFor(key);
    }).catch(e => {
      if (mine !== sequence.current) return;
      setError(e instanceof Error ? e.message : "Не удалось загрузить отзыв"); setLoadError(true); setLoadedFor(key);
    });
    return () => { sequence.current = mine + 1; };
  }, [key, customerId, orderId, attempt]);
  const send = async () => {
    if (busy.current || !rating || saved || loadedFor !== key || loadError || !customerId) return;
    busy.current = true; setSaving(true); setError("");
    const mine = sequence.current;
    try {
      const r = await api.sendOrderReview(orderId, rating, comment.trim());
      if (mine === sequence.current) setSaved(r.review);
    } catch (e) {
      if (mine === sequence.current) setError(e instanceof Error ? e.message : "Не удалось отправить отзыв. Попробуйте ещё раз.");
    } finally {
      if (mine === sequence.current) { busy.current = false; setSaving(false); }
    }
  };
  if (!customerId) return null;
  return <View style={{ backgroundColor: c.cell, borderRadius: 24, padding: 20, marginVertical: 20 }}>
    {loadedFor !== key ? <ActivityIndicator accessibilityLabel="Загрузка отзыва" color={colors.brand} /> : saved ? <View accessibilityLiveRegion="polite" style={{ alignItems: "center", paddingVertical: 20 }}>
      <Ionicons name="heart-outline" size={38} color={colors.pink} />
      <Text style={{ color: c.label, fontSize: 24, fontWeight: "800", marginTop: 12, textAlign: "center" }}>Спасибо за отзыв!</Text>
      <Text style={{ color: c.secondary, textAlign: "center", marginTop: 8 }}>Вы помогаете нам делать сервис лучше.</Text>
      <Text accessibilityLabel={`Ваша оценка: ${saved.rating} из 5`} style={{ color: colors.pink, marginTop: 10, fontSize: 23 }}>{"★".repeat(saved.rating)}{"☆".repeat(5 - saved.rating)}</Text>
    </View> : <>
      <Text style={{ color: colors.brand, fontSize: 10, letterSpacing: 1, fontWeight: "800", marginBottom: 12 }}>СТАНОВИМСЯ ЛУЧШЕ ВМЕСТЕ</Text>
      <Text accessibilityRole="header" style={{ color: c.label, fontSize: 25, fontWeight: "800", marginBottom: 10 }}>Ваше мнение важно для нас</Text>
      <Text style={{ color: c.secondary, fontSize: 14, marginBottom: 18 }}>Всё ли было удобно при оформлении? Оцените свой опыт и расскажите, что нам стоит улучшить.</Text>
      {!loadError ? <>
        <Text style={{ color: c.label, textAlign: "center", fontSize: 13 }}>Как вам оформление заказа?</Text>
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map(n => <Pressable key={n} accessibilityRole="button" accessibilityLabel={`Оценка ${n} из 5`} accessibilityState={{ selected: n === rating, disabled: saving }} disabled={saving} onPress={() => setRating(n)} style={{ width: 44, height: 48, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={n <= rating ? "star" : "star-outline"} size={35} color={n <= rating ? colors.pink : c.secondary} />
          </Pressable>)}
        </View>
        <Text accessibilityLiveRegion="polite" style={{ color: c.secondary, textAlign: "center", marginTop: 6, marginBottom: 18, fontSize: 12 }}>{["Выберите оценку", "Очень неудобно", "Скорее неудобно", "Нормально", "Удобно", "Отлично!"][rating]}</Text>
        <Text style={{ color: c.label, fontSize: 13, marginBottom: 8 }}>Несколько слов об опыте · необязательно</Text>
        <TextInput accessibilityLabel="Комментарий к отзыву" value={comment} onChangeText={setComment} editable={!saving} maxLength={500} multiline placeholder="Что понравилось? Что можно сделать удобнее?" placeholderTextColor={c.secondary} style={{ color: c.label, backgroundColor: c.bg, borderColor: c.separator, borderWidth: 1, borderRadius: 16, minHeight: 110, padding: 14, fontSize: 16, textAlignVertical: "top" }} />
        <Text style={{ color: c.secondary, fontSize: 11, textAlign: "right", marginTop: 4, marginBottom: 14 }}>{comment.length} / 500</Text>
      </> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: colors.pink, marginBottom: 12 }}>{error}</Text> : null}
      {loadError ? <GradientButton title="Повторить загрузку отзыва" onPress={() => setAttempt(v => v + 1)} /> : <GradientButton title="Отправить отзыв" disabled={!rating} loading={saving} onPress={send} />}
      {onSkip ? <Pressable accessibilityRole="button" onPress={onSkip} style={{ minHeight: 44, justifyContent: "center", marginTop: 6 }}><Text style={{ color: c.secondary, textAlign: "center" }}>Позже</Text></Pressable> : null}
    </>}
  </View>;
}

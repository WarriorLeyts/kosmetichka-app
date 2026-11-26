import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Manipulator from "expo-image-manipulator";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import { useWaitlistStore } from "@/store/waitlist";
import { useIOS } from "@/ios";
import { TitleBar } from "@/components/iosui/TitleBar";
import { Button, Field } from "@/components/ui";
import { DEMAND_NOTICE, quantityFromText } from "@/demand";

export default function RequestProduct() {
  const { search } = useLocalSearchParams<{ search?: string }>();
  const customerId = useAuth(s => s.customer?.id);
  if (!customerId) return <Redirect href="/login" />;
  return <RequestForm key={customerId} customerId={customerId} initial={typeof search === "string" ? search.slice(0, 160) : ""} />;
}
function RequestForm({ customerId, initial }: { customerId: number; initial: string }) {
  const c = useIOS(), insets = useSafeAreaInsets();
  const [name, setName] = useState(initial), [quantity, setQuantity] = useState("1"), [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [picking, setPicking] = useState(false), [done, setDone] = useState(false);
  const lock = useRef(false), pickLock = useRef(false);
  async function pick() {
    if (pickLock.current || lock.current) return;
    pickLock.current = true; setPicking(true); setError("");
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
      if (r.canceled || !r.assets[0]) return;
      const a = r.assets[0];
      const resize = a.width >= a.height ? { width: Math.min(a.width, 1280) } : { height: Math.min(a.height, 1280) };
      const image = await Manipulator.manipulateAsync(a.uri, [{ resize }], { compress: 0.8, format: Manipulator.SaveFormat.JPEG });
      setPhoto({ uri: image.uri, name: "product.jpg", mime: "image/jpeg" }); setUploaded(null);
    } catch { setError("Не удалось выбрать фото. Попробуйте JPG или PNG."); }
    finally { pickLock.current = false; setPicking(false); }
  }
  async function send() {
    if (lock.current || pickLock.current) return;
    const n = quantityFromText(quantity);
    if (name.trim().length < 2 || !n) { setError("Укажите название товара и целое количество от 1 до 10 000 шт."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      let photoName = uploaded;
      if (photo && !photoName) { photoName = (await api.uploadDemandPhoto(photo)).photoName; setUploaded(photoName); }
      if (useAuth.getState().customer?.id !== customerId) return;
      await api.saveProductWish({ name: name.trim(), quantity: n, comment: comment.trim(), photoName });
      void useWaitlistStore.getState().load();
      if (useAuth.getState().customer?.id === customerId) setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось отправить. Попробуйте ещё раз."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>
      <TitleBar title={done ? "Спасибо за пожелание!" : "Не нашли нужный товар?"} />
      <View style={{ borderRadius: 24, padding: 20, backgroundColor: c.cell, gap: 15 }}>
        {done ? <><Text style={{ color: c.label, fontSize: 18 }}>{name} · {quantity} шт.</Text><Text style={{ color: c.secondary, lineHeight: 22 }}>{DEMAND_NOTICE}</Text><Button title="Готово" onPress={() => router.back()} /><Button title="Мои пожелания" variant="ghost" onPress={() => router.replace("/waitlist")} /></> : <>
          <Text style={{ color: c.secondary, lineHeight: 22 }}>Расскажите, что хотели бы у нас купить. Можно приложить фото товара.</Text>
          <Field label="Бренд и название" value={name} onChangeText={setName} maxLength={160} editable={!busy} accessibilityLabel="Бренд и название товара" />
          <Field label="Нужное количество, шт." value={quantity} onChangeText={setQuantity} maxLength={5} keyboardType="number-pad" editable={!busy} accessibilityLabel="Нужное количество" />
          {photo ? <><Image source={{ uri: photo.uri }} style={{ height: 150, width: "100%", borderRadius: 14 }} contentFit="contain" /><Button title="Убрать фото" variant="ghost" disabled={busy} onPress={() => { setPhoto(null); setUploaded(null); }} /></> : null}
          <Button title={photo ? "Выбрать другое фото" : "Прикрепить фото"} icon="image-outline" variant="outline" onPress={pick} loading={picking} disabled={busy} />
          <Field label="Комментарий — необязательно" value={comment} onChangeText={setComment} multiline maxLength={1000} editable={!busy} />
          <Text style={{ color: c.secondary, lineHeight: 22 }}>{DEMAND_NOTICE}</Text>
          {error ? <Text accessibilityRole="alert" style={{ color: "#e63a59" }}>{error}</Text> : null}
          <Button title="Отправить пожелание" icon="send-outline" loading={busy} disabled={picking} onPress={send} />
        </>}
      </View>
    </View>
  </ScrollView>;
}

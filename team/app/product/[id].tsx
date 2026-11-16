import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View, Switch } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, ErrorState, KV, Loading, SectionTitle, VIOLET } from "@/components/kit";
import { PRICE_TYPES } from "@/products";
import { money } from "@/format";
import { StockLine } from "@/components/StockLine";
import { afterSheet, pickFile } from "@/components/chat/Attach";
import { openUrl } from "@/components/chat/MessageBody";
import { Sheet, SheetOptions } from "@/components/iosui/Sheet";
import { useLoad } from "@/useLoad";
import { del, formFile, get, put, request } from "@/api";
import { useIOS } from "@/ios";

type Product = { id: number; name: string; barcode: string | null; article: string | null; guid: string; stock?: number | null; stockByWarehouse?: { name: string; qty: number }[]; barcodes?: { barcode: string; unitName: string | null }[]; images: { id: number; path: string }[]; prices?: { priceType: string; price: number }[] };
type Variants = { enabled: boolean; variants: { id: number; imageId: number; imageUrl: string; name: string; sortOrder: number; available: boolean }[]; images: { id: number; path: string; url: string }[] };

const PRICE_NAMES: Record<string, string> = { retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Крупный опт" };

/** Товар: data from 1C, photo (replace / delete — as the site), variant names per photo. */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useIOS();
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [availability, setAvailability] = useState<Record<number, boolean>>({});
  const [names, setNames] = useState<Record<number, string>>({});
  const { data, error, loading, reload } = useLoad(async () => {
    const [p, v] = await Promise.all([get<{ product: Product }>(`/api/admin/products/${id}`), get<Variants>(`/api/admin/products/${id}/variants`)]);
    return { product: p.product, ...v };
  }, [id]);

  useEffect(() => {
    if (!data) return;
    const n: Record<number, string> = {};
    for (const img of data.images) n[img.id] = data.variants.find((v) => v.imageId === img.id)?.name ?? "";
    setNames(n);
    setEnabled(data.enabled);
    setSelected(data.variants.map(v => v.imageId));
    setAvailability(Object.fromEntries(data.variants.map(v => [v.imageId, v.available])));
  }, [data]);

  const p = data?.product;

  const upload = async (how: string) => {
    setSheet(false);
    await afterSheet();
    const f = await pickFile(how as "camera" | "library", true).catch(() => null);
    if (!f) return;
    setBusy("photo");
    try {
      // the site accepts jpeg/png/webp — convert (HEIC from iPhone) and shrink
      const jpg = await ImageManipulator.manipulateAsync(f.uri, [{ resize: { width: 1600 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
      const form = new FormData();
      form.append("image", await formFile(jpg.uri, `product-${id}.jpg`, "image/jpeg"), `product-${id}.jpg`);
      await request(`/api/admin/products/${id}/images`, { method: "POST", body: form });
      await reload();
    } catch (e) {
      Alert.alert("Фото не загружено", e instanceof Error ? e.message : "");
    } finally {
      setBusy("");
    }
  };

  const removePhotos = () =>
    Alert.alert("Удалить фото товара?", "Клиенты увидят товар без фото.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          setBusy("del");
          try {
            await del(`/api/admin/products/${id}/images`);
            await reload();
          } catch (e) {
            Alert.alert("Не удалено", e instanceof Error ? e.message : "");
          } finally {
            setBusy("");
          }
        },
      },
    ]);

  const saveVariants = async () => {
    if (!data) return;
    setBusy("variants");
    try {
      const variants = selected.map((imageId, i) => ({ imageId, name: names[imageId]?.trim() || `Вариант ${i + 1}`, available: availability[imageId] !== false, sortOrder: i }));
      await put(`/api/admin/products/${id}/variants`, { enabled, variants });
      await reload();
      Alert.alert("Сохранено", variants.length ? `Вариантов: ${variants.length}` : "Варианты убраны");
    } catch (e) {
      Alert.alert("Не сохранено", e instanceof Error ? e.message : "");
    } finally {
      setBusy("");
    }
  };

  return (
    <Screen title="Товар" onRefresh={reload}>
      {loading && !data ? <Loading /> : !p ? <ErrorState text={error || "Товар не найден"} onRetry={reload} /> : (
        <>
          <Card>
            <Text style={{ color: c.label, fontSize: 18, fontWeight: "700", lineHeight: 24 }}>{p.name}</Text>
            <View style={{ height: 6 }} />
            <StockLine stock={p.stock ?? null} big byWarehouse={p.stockByWarehouse} />
            <KV k="Артикул" v={p.article} />
            <KV k="Штрихкод" v={p.barcode} />
            {/* every barcode of the product in 1С (the exchange carries one) */}
            {(p.barcodes ?? []).filter((b) => b.barcode !== p.barcode).length ? (
              <KV
                k={`Ещё штрихкоды (${(p.barcodes ?? []).filter((b) => b.barcode !== p.barcode).length})`}
                v={(p.barcodes ?? [])
                  .filter((b) => b.barcode !== p.barcode)
                  .map((b) => (b.unitName ? `${b.barcode} (${b.unitName})` : b.barcode))
                  .join("\n")}
              />
            ) : null}
            <KV k="Код 1С" v={p.guid} />
          </Card>

          {p.prices?.length ? (
            <>
              <SectionTitle>Цены</SectionTitle>
              <Card>
                {/* read only: prices come from 1C */}
                {PRICE_TYPES.map((t) => {
                  const v = p.prices!.find((x) => x.priceType === t)?.price;
                  return <KV key={t} k={PRICE_NAMES[t]} v={v && v > 0 ? money(v) : "—"} />;
                })}
                <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 6 }}>Цены приходят из 1С</Text>
              </Card>
            </>
          ) : null}

          <SectionTitle>Фото</SectionTitle>
          <Card>
            {data.images.length ? (
              <View style={styles.photos}>
                {data.images.map((img) => (
                  <Pressable key={img.id} onPress={() => openUrl(img.url)} style={styles.photoBox}>
                    <Image source={{ uri: img.url }} style={styles.photo} contentFit="contain" />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={{ color: c.secondary, marginBottom: 10 }}>Фото нет</Text>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <ActionButton label={data.images.length ? "Заменить фото" : "Добавить фото"} icon="camera-outline" loading={busy === "photo"} onPress={() => setSheet(true)} />
              {data.images.length ? <ActionButton label="Удалить" kind="danger" loading={busy === "del"} onPress={removePhotos} /> : null}
            </View>
            <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 8 }}>Новое фото заменяет все текущие — так же, как в админке сайта</Text>
          </Card>

          <SectionTitle>Ассортимент по фото</SectionTitle>
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}><Switch accessibilityLabel="Ассортимент — выбор по фото" value={enabled} onValueChange={setEnabled} /><Text style={{ flex: 1, color: c.label }}>Ассортимент — выбор по фото</Text></View>
            <Text style={{ color: c.secondary, marginBottom: 12 }}>Одна номенклатура, общая цена и остаток. Наличие выбранных видов подтверждается при сборке.</Text>
            {enabled && <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}><ActionButton label="Отметить все фото" onPress={() => setSelected(data.images.map(img => img.id))} /><ActionButton label="Снять выделение" onPress={() => setSelected([])} /></View>
              {[...data.images].sort((a, b) => { const ai = selected.indexOf(a.id), bi = selected.indexOf(b.id); return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi); }).map(img => {
                const index = selected.indexOf(img.id);
                return <View key={img.id} style={{ marginBottom: 16 }}>
                  <View style={styles.variant}>
                    <Pressable accessibilityRole="checkbox" accessibilityLabel={`Выбрать фото ${img.id}`} accessibilityState={{ checked: index >= 0 }} aria-checked={index >= 0} onPress={() => setSelected(ids => index >= 0 ? ids.filter(x => x !== img.id) : [...ids, img.id])} style={{ padding: 8 }}><Ionicons name={index >= 0 ? "checkbox" : "square-outline"} size={24} color={VIOLET} /></Pressable>
                    <Image source={{ uri: img.url }} style={styles.vImg} contentFit="contain" />
                    <TextInput value={names[img.id] ?? ""} onChangeText={t => setNames(n => ({ ...n, [img.id]: t }))} placeholder={index >= 0 ? `Вариант ${index + 1}` : "Название вида"} placeholderTextColor={c.tertiary} style={[styles.vInput, { color: c.label, backgroundColor: c.cell }]} />
                  </View>
                  {index >= 0 && <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Switch accessibilityLabel={`Доступен ${names[img.id] || `Вариант ${index + 1}`}`} value={availability[img.id] !== false} onValueChange={value => setAvailability(a => ({ ...a, [img.id]: value }))} /><Text style={{ color: c.secondary }}>Доступен</Text>
                    {index > 0 && <ActionButton label="Выше" onPress={() => setSelected(ids => { const next = [...ids]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} />}
                    {index < selected.length - 1 && <ActionButton label="Ниже" onPress={() => setSelected(ids => { const next = [...ids]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} />}
                  </View>}
                </View>;
              })}
            </>}
            <ActionButton label="Сохранить ассортимент" loading={busy === "variants"} onPress={saveVariants} />
          </Card>
          {busy === "photo" ? <ActivityIndicator color={VIOLET} /> : null}
        </>
      )}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Фото товара">
        <SheetOptions
          options={[
            { value: "camera", label: "Сфотографировать" },
            { value: "library", label: "Выбрать из галереи" },
          ]}
          value=""
          onSelect={upload}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoBox: { width: 140, height: 140, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  photo: { width: "92%", height: "92%" },
  variant: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  vImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: "#fff" },
  vInput: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});

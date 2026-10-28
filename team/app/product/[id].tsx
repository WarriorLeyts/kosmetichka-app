import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
import { del, get, imageUrl, put, request } from "@/api";
import { useIOS } from "@/ios";

type Product = { id: number; name: string; barcode: string | null; article: string | null; guid: string; stock?: number | null; images: { id: number; path: string }[]; prices?: { priceType: string; price: number }[] };
type Variants = { variants: { id: number; imageId: number; imageUrl: string; name: string; sortOrder: number }[]; images: { id: number; path: string; url: string }[] };

const PRICE_NAMES: Record<string, string> = { retail: "Розница", discount: "Скидка по карте", wholesale: "Опт", big_wholesale: "Крупный опт" };

/** Товар: data from 1C, photo (replace / delete — as the site), variant names per photo. */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState("");
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
      form.append("image", { uri: jpg.uri, name: `product-${id}.jpg`, type: "image/jpeg" } as unknown as Blob);
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
      const variants = data.images.filter((img) => names[img.id]?.trim()).map((img, i) => ({ imageId: img.id, name: names[img.id].trim(), sortOrder: i }));
      await put(`/api/admin/products/${id}/variants`, { variants });
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
            <StockLine stock={p.stock ?? null} big />
            <KV k="Артикул" v={p.article} />
            <KV k="Штрихкод" v={p.barcode} />
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

          {data.images.length > 1 ? (
            <>
              <SectionTitle>Варианты (цвет, оттенок)</SectionTitle>
              <Card>
                {data.images.map((img) => (
                  <View key={img.id} style={styles.variant}>
                    <Image source={{ uri: img.url }} style={styles.vImg} contentFit="contain" />
                    <TextInput
                      value={names[img.id] ?? ""}
                      onChangeText={(t) => setNames((n) => ({ ...n, [img.id]: t }))}
                      placeholder="Название варианта"
                      placeholderTextColor={c.tertiary}
                      style={[styles.vInput, { color: c.label, backgroundColor: dark ? "#2B193D" : "#F8F7FB" }]}
                    />
                  </View>
                ))}
                <ActionButton label="Сохранить варианты" loading={busy === "variants"} onPress={saveVariants} />
              </Card>
            </>
          ) : null}
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

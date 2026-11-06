import { useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import { TitleBar } from "@/components/iosui/TitleBar";
import { GradientButton } from "@/components/iosui/Buttons";
import { WholesaleProofForm, WholesaleTerms, uploadProofs, type ProofFile, type ShopType } from "@/components/WholesaleProof";
import { useIOS } from "@/ios";

const LABELS: Record<string, string> = { wholesale: "Опт", big_wholesale: "Крупный опт" };

/**
 * A retail customer asks for wholesale prices: the same conditions and proof as a wholesale
 * registration — where he resells and photos / videos of the shop or online orders.
 */
export default function WholesaleRequest() {
  const c = useIOS();
  const insets = useSafeAreaInsets();
  const { level } = useLocalSearchParams<{ level?: string }>();
  const target = level === "big_wholesale" ? "big_wholesale" : "wholesale";
  const customer = useAuth((s) => s.customer);
  const setCustomer = useAuth((s) => s.setCustomer);
  const [shopType, setShopType] = useState<ShopType | null>(null);
  const [files, setFiles] = useState<ProofFile[]>([]);
  const [errors, setErrors] = useState<{ shopType?: string; proofs?: string }>({});
  const [busy, setBusy] = useState("");

  const send = async () => {
    if (busy) return;
    const e: typeof errors = {};
    if (!shopType) e.shopType = "Выберите, где вы продаёте";
    if (!files.length) e.proofs = "Добавьте хотя бы одно фото или видео";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy("Отправляем…");
    try {
      // the files first — the request needs at least one on the site
      const up = await uploadProofs(files, null, (d, t) => setBusy(d < t ? `Загружаем файлы: ${d + 1} из ${t}` : "Отправляем заявку…"));
      if (up.failed.length === files.length) throw new Error(up.error || "Файлы не загрузились");
      if (up.failed.length) setFiles(up.failed);
      const r = await api.roleSet(target, { shopType: shopType! });
      if (customer) setCustomer({ ...customer, priceType: r.priceType, wholesaleAccess: r.wholesaleAccess, roleRequest: r.roleRequest, roleRequestStatus: r.roleRequestStatus });
      Alert.alert(
        "Заявка отправлена",
        up.failed.length
          ? `Менеджер проверит её и свяжется с вами. Не загрузилось файлов: ${up.failed.length} — их можно отправить менеджеру в чате заказа.`
          : "Менеджер проверит её и свяжется с вами. Пока действуют прежние цены.",
        [{ text: "Понятно", onPress: () => (router.canGoBack() ? router.back() : router.replace("/profile")) }]
      );
    } catch (err) {
      Alert.alert("Не отправлено", err instanceof Error ? err.message : "Попробуйте ещё раз");
    } finally {
      setBusy("");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "transparent" }} behavior="padding">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 18, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <TitleBar title="" />
          <Text style={[styles.h1, { color: c.label }]}>Заявка на «{LABELS[target]}»</Text>
          <WholesaleTerms />
          <View style={[styles.panel, { backgroundColor: c.cell }]}>
            <WholesaleProofForm
              shopType={shopType}
              setShopType={(t) => {
                setShopType(t);
                setErrors((p) => ({ ...p, shopType: undefined }));
              }}
              files={files}
              setFiles={(f) => {
                setFiles(f);
                setErrors((p) => ({ ...p, proofs: undefined }));
              }}
              errors={errors}
            />
          </View>
          <GradientButton title={busy || "Отправить заявку"} loading={!!busy} onPress={send} style={{ marginTop: 18 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 560, alignSelf: "center" },
  h1: { fontSize: 32, fontWeight: "800", marginTop: 4 },
  panel: { borderRadius: 20, padding: 16, marginTop: 16 },
});

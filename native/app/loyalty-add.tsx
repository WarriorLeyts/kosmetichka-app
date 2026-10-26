import { useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { TitleBar } from "@/components/iosui/TitleBar";
import { IOSField } from "@/components/iosui/Field";
import { GradientButton } from "@/components/iosui/Buttons";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";

/**
 * «Добавить карту»: phone or card number → MAXMA texts a code to the card owner's phone →
 * the code links the card to this account. Without the code anyone could attach a stranger's card.
 */
export default function LoyaltyAdd() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const customer = useAuth((s) => s.customer);
  const [query, setQuery] = useState(customer?.phone ?? "");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null | undefined>(undefined); // undefined = step 1
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const run = async (fn: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось. Попробуйте ещё раз.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const find = () =>
    run(async () => {
      if (!query.trim()) throw new Error("Введите номер телефона или карты");
      const r = await api.loyaltyFind(query.trim());
      setCode("");
      setSentTo(r.phone);
    });

  const confirm = () =>
    run(async () => {
      if (!code.replace(/\D/g, "")) throw new Error("Введите код из СМС");
      await api.loyaltyConfirm(code);
      router.back(); // the profile reloads the card when it comes back into view
    });

  const step2 = sentTo !== undefined;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "transparent" }} behavior="padding">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <TitleBar title="" />
          <Text style={[styles.h1, { color: c.label }]}>Добавить карту</Text>
          <Text style={[styles.lead, { color: c.secondary }]}>
            {step2
              ? `Мы отправили код в СМС${sentTo ? ` на ${sentTo}` : " на телефон, указанный в карте"}.`
              : "Укажите телефон, на который оформлена карта лояльности, или номер карты."}
          </Text>

          <View style={[styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow]}>
            {error ? (
              <View style={[styles.note, { backgroundColor: "rgba(255,59,48,0.08)" }]}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={{ color: "#FF3B30", fontSize: 15, flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            {!step2 ? (
              <>
                <IOSField
                  label="Телефон или номер карты"
                  placeholder="+7 900 000-00-00"
                  value={query}
                  onChangeText={(v) => {
                    setQuery(v);
                    if (error) setError("");
                  }}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={find}
                />
                <GradientButton title="Найти карту" loading={loading} onPress={find} style={{ marginBottom: 8 }} />
              </>
            ) : (
              <>
                <IOSField
                  label="Код из СМС"
                  placeholder="Код"
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/\D/g, "").slice(0, 8));
                    if (error) setError("");
                  }}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirm}
                />
                <GradientButton title="Добавить карту" loading={loading} onPress={confirm} style={{ marginBottom: 8 }} />
                <Text
                  onPress={() => {
                    if (loading) return;
                    setSentTo(undefined);
                    setError("");
                  }}
                  style={[styles.link, { color: "#8b3dff" }]}
                  accessibilityRole="button"
                >
                  Изменить номер или отправить код ещё раз
                </Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 520, alignSelf: "center" },
  h1: { fontSize: 34, fontWeight: "800", marginTop: 18, lineHeight: 40 },
  lead: { fontSize: 17, lineHeight: 24, marginTop: 8, marginBottom: 18 },
  panel: { borderRadius: 22, padding: 18, paddingBottom: 10 },
  shadow: { boxShadow: "0 6px 22px rgba(80,40,140,0.07)" },
  note: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12, marginBottom: 14 },
  link: { fontSize: 15, textAlign: "center", paddingVertical: 10 },
});

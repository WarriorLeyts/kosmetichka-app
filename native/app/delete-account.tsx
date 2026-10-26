import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import { TitleBar } from "@/components/iosui/TitleBar";
import { IOSField } from "@/components/iosui/Field";
import { useIOS } from "@/ios";

/** «Удалить аккаунт» (App Store / Google Play): password confirms, personal data is erased on the site. */
export default function DeleteAccount() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const logout = useAuth((s) => s.logout);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const remove = () => {
    if (!password || busy) return;
    Alert.alert("Удалить аккаунт навсегда?", "Восстановить его будет нельзя.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          setError("");
          try {
            await api.deleteAccount(password);
            await logout();
            if (router.canDismiss()) router.dismissAll();
            Alert.alert("Аккаунт удалён", "Ваши данные удалены. Спасибо, что были с нами.");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось удалить аккаунт");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <TitleBar title="Удаление аккаунта" />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow]}>
          <Text style={{ color: c.label, fontSize: 16, lineHeight: 22 }}>
            Будут удалены ваши имя, телефон, e-mail, адрес и привязанная карта лояльности. Войти в этот аккаунт больше не получится.
          </Text>
          <Text style={{ color: c.secondary, fontSize: 15, lineHeight: 21, marginTop: 10 }}>
            Оформленные заказы останутся у магазина для учёта, но без ваших данных. Бонусы на карте MAXMA сохраняются — карта остаётся у вас.
          </Text>
          <View style={{ height: 16 }} />
          <IOSField
            label="Пароль"
            password
            value={password}
            onChangeText={(v: string) => {
              setPassword(v);
              setError("");
            }}
            autoComplete="current-password"
            autoCapitalize="none"
            error={error || undefined}
          />
        </View>
        <Pressable
          onPress={remove}
          disabled={!password || busy}
          accessibilityRole="button"
          accessibilityLabel="Удалить аккаунт"
          style={({ pressed }) => [styles.btn, { opacity: !password ? 0.45 : pressed ? 0.85 : 1 }]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Удалить аккаунт</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 22, padding: 16, paddingBottom: 4 },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  btn: { marginTop: 20, minHeight: 54, borderRadius: 27, backgroundColor: "#FF3B30", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});

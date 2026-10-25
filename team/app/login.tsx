import { useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/store/auth";
import { IOSField } from "@/components/iosui/Field";
import { GradientButton } from "@/components/iosui/Buttons";
import { AuthBackdrop } from "@/components/iosui/AuthBackdrop";
import { TeamMark } from "@/components/TeamHeader";
import { useIOS } from "@/ios";

/** Staff sign-in: the same login and password as the site's admin panel (managers, admin, pickers). */
export default function Login() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const login = useAuth((s) => s.login);
  const [loginValue, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passRef = useRef<TextInput>(null);

  const submit = async () => {
    if (loading) return;
    if (!loginValue.trim() || !password) {
      setError("Введите логин и пароль");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(loginValue, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <AuthBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.wrap}>
          <TeamMark size={24} />
          <Text style={[styles.h1, { color: c.label }]}>Вход для сотрудников</Text>
          <Text style={[styles.lead, { color: c.secondary }]}>Логин и пароль те же, что в админке сайта</Text>
          <View style={[styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow]}>
            <IOSField
              label="Логин"
              placeholder="Логин"
              value={loginValue}
              onChangeText={setLogin}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
            />
            <IOSField
              ref={passRef}
              label="Пароль"
              placeholder="Пароль"
              password
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
            />
            {error ? (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                <Text style={{ color: "#FF3B30", fontSize: 14, flex: 1 }}>{error}</Text>
              </View>
            ) : null}
            <GradientButton title={loading ? "Входим…" : "Войти"} loading={loading} onPress={submit} style={{ marginTop: 4, marginBottom: 8 }} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 520, alignSelf: "center" },
  h1: { fontSize: 32, fontWeight: "800", marginTop: 28, textAlign: "center" },
  lead: { fontSize: 16, lineHeight: 22, marginTop: 6, marginBottom: 22, textAlign: "center" },
  panel: { borderRadius: 22, padding: 18, paddingBottom: 10 },
  shadow: { boxShadow: "0 6px 22px rgba(80,40,140,0.07)" },
  error: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,59,48,0.08)", borderRadius: 12, padding: 10, marginBottom: 12 },
});

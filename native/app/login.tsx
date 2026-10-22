import { useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/store/auth";
import { TitleBar } from "@/components/iosui/TitleBar";
import { IOSField } from "@/components/iosui/Field";
import { GradientButton, OutlineButton } from "@/components/iosui/Buttons";
import { AuthBackdrop } from "@/components/iosui/AuthBackdrop";
import { Wordmark } from "@/components/Wordmark";
import { useIOS } from "@/ios";
import { useReduceMotion } from "@/useReduceMotion";

/** «Вход» — iOS style; login by phone or email (existing auth). */
export default function Login() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const login = useAuth((s) => s.login);
  const [loginValue, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [error, setError] = useState("");
  const errAnim = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const passRef = useRef<TextInput>(null);

  const showError = (text: string) => {
    setError(text);
    errAnim.setValue(0);
    Animated.timing(errAnim, { toValue: 1, duration: reduce ? 0 : 200, useNativeDriver: true }).start();
  };

  const submit = async () => {
    if (busy.current) return; // no double submit
    const e: typeof errors = {};
    if (!loginValue.trim()) e.login = "Введите телефон или email";
    if (!password) e.password = "Введите пароль";
    setErrors(e);
    if (e.login || e.password) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      await login(loginValue, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Ошибка входа");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const panel = [styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: dark ? "#000" : "#F8F7FC" }} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />
      <AuthBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <TitleBar title="Вход" />
          <Wordmark size={22} style={{ marginTop: 18 }} />
          <Text style={[styles.h1, { color: c.label }]}>С возвращением!</Text>
          <Text style={[styles.lead, { color: c.secondary }]}>Войдите, чтобы видеть свои цены и заказы</Text>

          <View style={panel}>
            <IOSField
              label="Телефон или email"
              placeholder="Телефон или email"
              value={loginValue}
              onChangeText={(v) => {
                setLogin(v);
                if (errors.login) setErrors({ ...errors, login: undefined });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passRef.current?.focus()}
              error={errors.login}
            />
            <IOSField
              ref={passRef}
              label="Пароль"
              placeholder="Пароль"
              password
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={errors.password}
            />
            {error ? (
              <Animated.View style={[styles.error, { opacity: errAnim }]}>
                <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                <Text style={{ color: "#FF3B30", fontSize: 14, flex: 1 }}>{error}</Text>
              </Animated.View>
            ) : null}
            <GradientButton title={loading ? "Входим…" : "Войти"} loading={loading} onPress={submit} style={{ marginTop: 4 }} />
            <Pressable onPress={() => router.push("/forgot")} hitSlop={8} style={styles.forgot} accessibilityRole="link">
              {({ pressed }) => <Text style={[styles.forgotText, pressed && { opacity: 0.6 }]}>Забыли пароль?</Text>}
            </Pressable>
          </View>

          <View style={[panel, { marginTop: 16 }]}>
            <Text style={[styles.h2, { color: c.label }]}>Ещё нет аккаунта?</Text>
            <OutlineButton title="Зарегистрироваться" onPress={() => router.push("/register")} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 520, alignSelf: "center" },
  h1: { fontSize: 34, fontWeight: "800", marginTop: 18 },
  lead: { fontSize: 17, lineHeight: 23, marginTop: 6, marginBottom: 18 },
  panel: { borderRadius: 22, padding: 18, paddingBottom: 10 },
  shadow: { boxShadow: "0 6px 22px rgba(80,40,140,0.07)" },
  error: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,59,48,0.08)", borderRadius: 12, padding: 10, marginBottom: 12 },
  forgot: { alignSelf: "center", paddingVertical: 14 },
  forgotText: { color: "#7a12d4", fontSize: 17, fontWeight: "600" },
  h2: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
});

import { useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { TitleBar } from "@/components/iosui/TitleBar";
import { IOSField } from "@/components/iosui/Field";
import { GradientButton } from "@/components/iosui/Buttons";
import { AuthBackdrop } from "@/components/iosui/AuthBackdrop";
import { Wordmark } from "@/components/Wordmark";
import { useIOS } from "@/ios";
import { useReduceMotion } from "@/useReduceMotion";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Password reset request — the existing /api/auth/forgot-password. */
export default function Forgot() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const msg = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);

  const appear = () => {
    msg.setValue(0);
    Animated.timing(msg, { toValue: 1, duration: reduce ? 0 : 220, useNativeDriver: true }).start();
  };

  const submit = async () => {
    if (busy.current) return;
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) {
      setFieldError("Проверьте email — например, mail@example.com");
      return;
    }
    busy.current = true;
    setLoading(true);
    setError("");
    setDone(false);
    try {
      await api.forgotPassword(e);
      setDone(true); // only after the server answered
      appear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить. Попробуйте ещё раз.");
      appear();
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: dark ? "#170D25" : "transparent" }} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />
      <AuthBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          <TitleBar title="" />
          <Wordmark size={22} style={{ marginTop: 10 }} />
          <Text style={[styles.h1, { color: c.label }]}>Восстановление пароля</Text>
          <Text style={[styles.lead, { color: c.secondary }]}>
            Укажите email, с которым вы регистрировались. Пришлём ссылку для создания нового пароля.
          </Text>

          <View style={[styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow]}>
            {done ? (
              <Animated.View style={[styles.note, { backgroundColor: "rgba(52,199,89,0.12)", opacity: msg }]}>
                <Ionicons name="mail-open-outline" size={20} color="#1f8a3b" />
                <Text style={{ color: "#1f8a3b", fontSize: 15, flex: 1, lineHeight: 20 }}>
                  Если такой email зарегистрирован, письмо уже в пути. Проверьте почту и папку «Спам».
                </Text>
              </Animated.View>
            ) : null}
            {error ? (
              <Animated.View style={[styles.note, { backgroundColor: "rgba(255,59,48,0.08)", opacity: msg }]}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                <Text style={{ color: "#FF3B30", fontSize: 15, flex: 1 }}>{error}</Text>
              </Animated.View>
            ) : null}
            <IOSField
              label="Email"
              placeholder="mail@example.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (fieldError) setFieldError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={submit}
              error={fieldError}
            />
            <GradientButton
              title={loading ? "Отправляем…" : error ? "Отправить ещё раз" : "Отправить ссылку"}
              loading={loading}
              onPress={submit}
              style={{ marginBottom: 8 }}
            />
            {done ? (
              <GradientButton title="Вернуться ко входу" onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))} style={{ marginBottom: 8, opacity: 0.9 }} />
            ) : null}
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
});

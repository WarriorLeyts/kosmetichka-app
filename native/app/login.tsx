import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { colors } from "@/theme";
import { useAuth } from "@/store/auth";
import { Button, Field, Notice } from "@/components/ui";

export default function Login() {
  const login = useAuth((s) => s.login);
  const [loginValue, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!loginValue.trim() || !password) {
      setError("Введите телефон или email и пароль");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(loginValue, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>С возвращением!</Text>
        <Text style={{ color: colors.muted, marginTop: 6, marginBottom: 24 }}>Войдите, чтобы видеть свои цены и заказы</Text>
        {error ? <Notice tone="error" text={error} /> : null}
        <Field
          label="Телефон или email"
          value={loginValue}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="username"
          textContentType="username"
          placeholder="8 900 000 00 00 или mail@example.com"
        />
        <Field
          label="Пароль"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        <Button title="Войти" loading={loading} onPress={submit} />
        <Pressable onPress={() => router.push("/forgot")} style={{ alignSelf: "center", padding: 14 }}>
          <Text style={{ color: colors.violet, fontWeight: "700" }}>Забыли пароль?</Text>
        </Pressable>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
        <Text style={{ color: colors.muted, textAlign: "center", marginTop: 12, marginBottom: 10 }}>Ещё нет аккаунта?</Text>
        <Button title="Зарегистрироваться" variant="outline" onPress={() => router.push("/register")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

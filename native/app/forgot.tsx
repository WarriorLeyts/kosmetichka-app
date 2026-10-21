import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { api } from "@/api";
import { colors } from "@/theme";
import { Button, Field, Notice } from "@/components/ui";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await api.forgotPassword(email.trim());
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: colors.muted, marginBottom: 18, lineHeight: 20 }}>
        Укажите email, с которым вы регистрировались. Пришлём ссылку для создания нового пароля.
      </Text>
      {done ? <Notice tone="success" text="Если такой email зарегистрирован, письмо уже в пути. Проверьте почту и папку «Спам»." /> : null}
      {error ? <Notice tone="error" text={error} /> : null}
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Button title="Отправить ссылку" loading={loading} disabled={!email.includes("@")} onPress={submit} />
    </ScrollView>
  );
}

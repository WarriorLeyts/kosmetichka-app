import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { api } from "@/api";
import { colors } from "@/theme";
import { useAuth } from "@/store/auth";
import { Button, ErrorView, Field, Loading, Notice } from "@/components/ui";
import type { Customer } from "@/types";

const FIELDS: { key: keyof Customer & string; label: string; placeholder: string; keyboard?: "email-address" | "phone-pad" }[] = [
  { key: "name", label: "Имя", placeholder: "Иван Иванов" },
  { key: "companyName", label: "Компания", placeholder: "ООО «Название»" },
  { key: "phone", label: "Телефон", placeholder: "+7 900 000 00 00", keyboard: "phone-pad" },
  { key: "email", label: "Email", placeholder: "mail@example.com", keyboard: "email-address" },
  { key: "city", label: "Город", placeholder: "Москва" },
  { key: "address", label: "Адрес доставки", placeholder: "ул. Пушкина, д. 1" },
];

export default function EditProfile() {
  const setCustomer = useAuth((s) => s.setCustomer);
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [inn, setInn] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = async () => {
    setLoadError("");
    try {
      const { customer } = await api.profile();
      const f: Record<string, string> = { currentPassword: "", password: "", passwordConfirm: "" };
      for (const x of FIELDS) f[x.key] = String(customer[x.key] ?? "");
      setForm(f);
      setInn(customer.inn ?? null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loadError) return <ErrorView message={loadError} onRetry={load} />;
  if (!form) return <Loading />;

  const upd = (k: string) => (v: string) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const { customer } = await api.saveProfile(form);
      setCustomer(customer);
      setForm({ ...form, currentPassword: "", password: "", passwordConfirm: "" });
      setMsg({ tone: "success", text: "Данные сохранены" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Не удалось сохранить" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {msg && <Notice tone={msg.tone} text={msg.text} />}
        {inn ? <Text style={{ color: colors.muted, marginBottom: 14 }}>ИНН: {inn} (изменение через менеджера)</Text> : null}
        {FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            value={form[f.key]}
            onChangeText={upd(f.key)}
            keyboardType={f.keyboard}
            autoCapitalize={f.keyboard ? "none" : "sentences"}
            multiline={f.key === "address"}
          />
        ))}
        <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text, marginTop: 10 }}>Смена пароля</Text>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>Оставьте пустым, чтобы не менять</Text>
        <Field label="Текущий пароль" secureTextEntry value={form.currentPassword} onChangeText={upd("currentPassword")} autoComplete="current-password" />
        <Field label="Новый пароль" secureTextEntry value={form.password} onChangeText={upd("password")} placeholder="Минимум 6 символов" autoComplete="new-password" />
        <Field label="Повтор нового пароля" secureTextEntry value={form.passwordConfirm} onChangeText={upd("passwordConfirm")} autoComplete="new-password" />
        <Button title="Сохранить" loading={saving} onPress={save} style={{ marginTop: 6 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

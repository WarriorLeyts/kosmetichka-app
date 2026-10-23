import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import { ErrorView } from "@/components/ui";
import { TitleBar } from "@/components/iosui/TitleBar";
import { IOSField } from "@/components/iosui/Field";
import { VIOLET_PINK } from "@/components/TabBar";
import { useIOS } from "@/ios";
import { useReduceMotion } from "@/useReduceMotion";
import type { Customer } from "@/types";

const FIELDS: { key: keyof Customer & string; label: string; placeholder: string; keyboard?: "email-address" | "phone-pad" }[] = [
  { key: "name", label: "Имя", placeholder: "Иван Иванов" },
  { key: "companyName", label: "Компания", placeholder: "ООО «Название»" },
  { key: "phone", label: "Телефон", placeholder: "+7 900 000 00 00", keyboard: "phone-pad" },
  { key: "email", label: "Email", placeholder: "mail@example.com", keyboard: "email-address" },
  { key: "city", label: "Город", placeholder: "Москва" },
  { key: "address", label: "Адрес доставки", placeholder: "ул. Пушкина, д. 1" },
];

type Errors = Partial<Record<string, string>>;

/** Server messages (same rules as the site) → the field they belong to. */
function fieldOf(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes("email")) return "email";
  if (m.includes("текущий пароль")) return "currentPassword";
  if (m.includes("не совпадают")) return "passwordConfirm";
  if (m.includes("короче")) return "password";
  return null;
}

export default function EditProfile() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const setCustomer = useAuth((s) => s.setCustomer);
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [inn, setInn] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const msgAnim = useRef(new Animated.Value(0)).current;
  const savingRef = useRef(false);

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

  // banner fades in, success fades out by itself
  useEffect(() => {
    if (!msg) return;
    msgAnim.setValue(0);
    Animated.timing(msgAnim, { toValue: 1, duration: reduce ? 0 : 200, useNativeDriver: true }).start();
    if (msg.tone === "success") {
      const t = setTimeout(() => Animated.timing(msgAnim, { toValue: 0, duration: reduce ? 0 : 250, useNativeDriver: true }).start(() => setMsg(null)), 3000);
      return () => clearTimeout(t);
    }
  }, [msg, msgAnim, reduce]);

  const bg = "transparent";
  const panel = [styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow];

  if (loadError || !form) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top, paddingHorizontal: 16 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TitleBar title="Мои данные" />
        {loadError ? <ErrorView message={loadError} onRetry={load} /> : <ActivityIndicator style={{ flex: 1 }} color="#8b3dff" />}
      </View>
    );
  }

  const upd = (k: string) => (v: string) => {
    setForm({ ...form, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const save = async () => {
    if (savingRef.current) return; // no double submit
    // same checks as the server, shown next to the fields before sending
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Укажите имя";
    if (!form.email.trim()) e.email = "Укажите email — он нужен для входа";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Проверьте email";
    const digits = form.phone.replace(/\D/g, "");
    if (form.phone.trim() && digits.length < 10) e.phone = "Проверьте номер телефона";
    if (form.password.trim()) {
      if (!form.currentPassword.trim()) e.currentPassword = "Введите текущий пароль для смены пароля";
      if (form.password.length < 6) e.password = "Пароль должен быть не короче 6 символов";
      else if (form.password !== form.passwordConfirm) e.passwordConfirm = "Пароли не совпадают";
    }
    setErrors(e);
    if (Object.keys(e).length) {
      setMsg({ tone: "error", text: "Проверьте выделенные поля" });
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMsg(null);
    try {
      // empty password block → nothing about the password is sent as a change
      // phone and email in the same form as registration stores them (so login by phone/email keeps working)
      const d = form.phone.replace(/\D/g, "");
      const phone = d.length === 11 && d.startsWith("7") ? "8" + d.slice(1) : d.length === 10 ? "8" + d : d;
      const clean: Record<string, string> = { ...form, phone, email: form.email.trim().toLowerCase(), name: form.name.trim() };
      const body = clean.password.trim() ? clean : { ...clean, currentPassword: "", password: "", passwordConfirm: "" };
      const { customer } = await api.saveProfile(body);
      setCustomer(customer);
      setForm({ ...clean, currentPassword: "", password: "", passwordConfirm: "" });
      setMsg({ tone: "success", text: "Данные сохранены" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      const text = err instanceof Error ? err.message : "Не удалось сохранить";
      const f = fieldOf(text);
      if (f) setErrors({ [f]: text });
      setMsg({ tone: "error", text });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const buttonArea = 56 + 20 + Math.max(insets.bottom, 12);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior="padding">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <View style={styles.wrap}>
          <TitleBar title="Мои данные" />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: buttonArea + 16 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrap}>
          {msg ? (
            <Animated.View
              style={[
                styles.banner,
                { backgroundColor: msg.tone === "success" ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.1)", opacity: msgAnim },
              ]}
            >
              <Ionicons name={msg.tone === "success" ? "checkmark-circle" : "alert-circle"} size={20} color={msg.tone === "success" ? "#1f8a3b" : "#FF3B30"} />
              <Text style={{ flex: 1, color: msg.tone === "success" ? "#1f8a3b" : "#FF3B30", fontSize: 15 }}>{msg.text}</Text>
            </Animated.View>
          ) : null}

          <View style={panel}>
            {FIELDS.map((f) => (
              <IOSField
                key={f.key}
                label={f.label}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChangeText={upd(f.key)}
                keyboardType={f.keyboard}
                autoCapitalize={f.keyboard ? "none" : "sentences"}
                multiline={f.key === "address"}
                error={errors[f.key]}
              />
            ))}
            {inn ? <Text style={{ color: c.secondary, fontSize: 13, marginTop: -4 }}>ИНН: {inn} (изменение через менеджера)</Text> : null}
          </View>

          <View style={panel}>
            <Text style={[styles.h, { color: c.label }]}>Смена пароля</Text>
            <Text style={{ color: c.secondary, fontSize: 15, marginBottom: 14 }}>Оставьте пустым, чтобы не менять</Text>
            <IOSField
              label="Текущий пароль"
              password
              value={form.currentPassword}
              onChangeText={upd("currentPassword")}
              autoComplete="current-password"
              autoCapitalize="none"
              error={errors.currentPassword}
            />
            <IOSField
              label="Новый пароль"
              password
              value={form.password}
              onChangeText={upd("password")}
              placeholder="Минимум 6 символов"
              autoComplete="new-password"
              autoCapitalize="none"
              error={errors.password}
            />
            {/* the site requires a repeat of the new password — shown only once a new one is typed */}
            {form.password ? (
              <IOSField
                label="Повтор нового пароля"
                password
                value={form.passwordConfirm}
                onChangeText={upd("passwordConfirm")}
                autoComplete="new-password"
                autoCapitalize="none"
                error={errors.passwordConfirm}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* pinned save button */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: dark ? "rgba(23,13,37,0.92)" : "rgba(247,245,251,0.94)" }]}>
        <Pressable
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Сохранить изменения"
          accessibilityState={{ busy: saving }}
          style={({ pressed }) => [styles.wrap, { opacity: saving ? 0.85 : pressed ? 0.9 : 1 }]}
        >
          <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
            {saving ? <ActivityIndicator color="#fff" /> : null}
            <Text style={styles.ctaText}>{saving ? "Сохранение…" : "Сохранить изменения"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 640, alignSelf: "center" },
  panel: { borderRadius: 22, padding: 16, paddingBottom: 4, marginTop: 10 },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  h: { fontSize: 22, fontWeight: "700" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 12, marginTop: 4 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 10, paddingHorizontal: 16 },
  cta: { height: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 8px 20px rgba(139,61,255,0.3)" },
  ctaText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});

import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, BASE_URL } from "@/api";
import { colors, radius } from "@/theme";
import { useAuth } from "@/store/auth";
import { Captcha } from "@/components/Captcha";
import { Button, Field, Notice, tap } from "@/components/ui";

const TYPES = [
  { value: "retail", label: "Розница", desc: "Покупаю для себя", auto: true },
  { value: "discount", label: "Скидка", desc: "Постоянный покупатель", auto: true },
  { value: "wholesale", label: "Опт", desc: "Владелец магазина", auto: false },
  { value: "big_wholesale", label: "Крупный опт", desc: "Крупные закупки", auto: false },
];

export default function Register() {
  const refresh = useAuth((s) => s.refresh);
  const [f, setF] = useState({ name: "", companyName: "", phone: "", email: "", password: "" });
  const [priceType, setPriceType] = useState("wholesale");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"" | "sms" | "submit">("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const upd = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const wholesale = priceType === "wholesale" || priceType === "big_wholesale";

  const sendSms = async () => {
    if (!captcha) {
      setError("Сначала отметьте «Я не робот»");
      return;
    }
    if (f.phone.replace(/\D/g, "").length < 10) {
      setError("Введите номер телефона");
      return;
    }
    setBusy("sms");
    setError("");
    try {
      await api.sendSms(f.phone);
      setSmsSent(true);
      setCooldown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить SMS");
    } finally {
      setBusy("");
    }
  };

  const submit = async () => {
    if (!f.name.trim() || !f.email.trim() || !f.password) {
      setError("Заполните имя, телефон, email и пароль");
      return;
    }
    if (f.password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    setBusy("submit");
    setError("");
    try {
      const r = await api.register({ ...f, captchaToken: captcha ?? "", smsCode: smsCode.trim(), priceType });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (r.autoLogin) {
        await refresh();
        Alert.alert("Готово!", r.message, [{ text: "Перейти в каталог", onPress: () => router.replace("/catalog") }]);
      } else {
        Alert.alert("Заявка отправлена", r.message, [{ text: "Понятно", onPress: () => router.replace("/") }]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка регистрации");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy("");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h}>Кто вы?</Text>
        <View style={styles.types}>
          {TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => { tap(); setPriceType(t.value); }}
              style={[styles.type, priceType === t.value && styles.typeActive]}
            >
              <Text style={[styles.typeLabel, priceType === t.value && { color: colors.pink }]}>{t.label}</Text>
              <Text style={styles.typeDesc}>{t.desc}</Text>
            </Pressable>
          ))}
        </View>
        {wholesale && <Notice tone="info" text="Оптовые аккаунты подтверждает менеджер — мы свяжемся с вами после регистрации." />}

        <Field label="Имя" value={f.name} onChangeText={upd("name")} placeholder="Иван Иванов" autoComplete="name" />
        {wholesale && <Field label="Компания" value={f.companyName} onChangeText={upd("companyName")} placeholder="ООО «Название» или ИП" />}
        <Field label="Email" value={f.email} onChangeText={upd("email")} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Пароль" value={f.password} onChangeText={upd("password")} secureTextEntry placeholder="Минимум 6 символов" autoComplete="new-password" />
        <Field label="Телефон" value={f.phone} onChangeText={upd("phone")} keyboardType="phone-pad" placeholder="+7 900 000 00 00" autoComplete="tel" />

        <Captcha onToken={setCaptcha} />

        <Button
          title={cooldown > 0 ? `Отправить ещё раз через ${cooldown} с` : smsSent ? "Отправить код ещё раз" : "Получить код по SMS"}
          variant="outline"
          icon="chatbox-ellipses-outline"
          loading={busy === "sms"}
          disabled={cooldown > 0 || !captcha}
          onPress={sendSms}
        />
        {smsSent && (
          <View style={{ marginTop: 14 }}>
            <Field label="Код из SMS" value={smsCode} onChangeText={setSmsCode} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} />
          </View>
        )}

        <Pressable onPress={() => setConsent(!consent)} style={styles.consent}>
          <Ionicons name={consent ? "checkbox" : "square-outline"} size={22} color={consent ? colors.pink : colors.faint} />
          <Text style={styles.consentText}>
            Согласен с{" "}
            <Text style={styles.link} onPress={() => Linking.openURL(`${BASE_URL}/privacy`)}>политикой конфиденциальности</Text> и{" "}
            <Text style={styles.link} onPress={() => Linking.openURL(`${BASE_URL}/agreement`)}>пользовательским соглашением</Text>
          </Text>
        </Pressable>

        {error ? <Notice tone="error" text={error} /> : null}
        <Button
          title={wholesale ? "Отправить заявку" : "Зарегистрироваться"}
          loading={busy === "submit"}
          disabled={!captcha || !smsSent || smsCode.trim().length < 4 || !consent}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: 17, fontWeight: "900", color: colors.text, marginBottom: 10 },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  type: { width: "48%", flexGrow: 1, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff", padding: 12 },
  typeActive: { borderColor: colors.pink, backgroundColor: "#fdf2f8" },
  typeLabel: { fontWeight: "900", color: colors.text, fontSize: 15 },
  typeDesc: { color: colors.muted, fontSize: 12, marginTop: 2 },
  consent: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginVertical: 16 },
  consentText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 },
  link: { color: colors.violet, fontWeight: "700" },
});

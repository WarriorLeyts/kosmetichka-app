import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { api, BASE_URL } from "@/api";
import { useAuth } from "@/store/auth";
import { Captcha } from "@/components/Captcha";
import { tap } from "@/components/ui";
import { IOSField } from "@/components/iosui/Field";
import { GRAD, OutlineButton } from "@/components/iosui/Buttons";
import { Curtain, CurtainHeader, curtainEase, Dots } from "@/components/Curtain";
import { AuthBackdrop } from "@/components/iosui/AuthBackdrop";
import { useIOS } from "@/ios";
import { useReduceMotion } from "@/useReduceMotion";

const VIOLET = "#8b1ee6";

// strictly three customer types (no «Скидка» at registration)
const TYPES: { value: string; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "retail", label: "Розница", desc: "Покупаю для себя", icon: "bag-handle-outline" },
  { value: "wholesale", label: "Опт", desc: "Владелец магазина", icon: "storefront-outline" },
  { value: "big_wholesale", label: "Крупный опт", desc: "Крупные закупки", icon: "business-outline" },
];

type Errors = Partial<Record<"name" | "email" | "password" | "phone" | "smsCode" | "captcha" | "consent", string>>;

/** Fades/slides its children in when mounted (dependent fields, hints). */
function Appear({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: reduce ? 0 : 220, useNativeDriver: true }).start();
  }, [v, reduce]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }}>{children}</Animated.View>;
}

/** One customer type card; the selection look changes smoothly. */
function TypeCard({ t, selected, onPress }: { t: (typeof TYPES)[number]; selected: boolean; onPress: () => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const reduce = useReduceMotion();
  const a = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: selected ? 1 : 0, duration: reduce ? 0 : 200, useNativeDriver: false }).start();
  }, [selected, a, reduce]);
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${t.label}, ${t.desc}`}>
      <Animated.View
        style={[
          styles.type,
          !dark && styles.shadow,
          {
            backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [c.cell, dark ? "#2A1F38" : "#F7EDFC"] }),
            borderColor: a.interpolate({ inputRange: [0, 1], outputRange: [dark ? "#352044" : "#EFEAF5", VIOLET] }),
          },
        ]}
      >
        <Ionicons name={t.icon} size={34} color={VIOLET} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.typeLabel, { color: c.label }]}>{t.label}</Text>
          <Text style={[styles.typeDesc, { color: c.secondary }]}>{t.desc}</Text>
        </View>
        {selected ? (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={18} color="#fff" />
          </View>
        ) : (
          <View style={[styles.radio, { borderColor: dark ? "#5A3D73" : "#C7C7CC" }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Section that slides up into place when its value goes 0 → 1 (staggered after the curtain lifts). */
function Rise({ v, children }: { v: Animated.Value; children: ReactNode }) {
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] }}>{children}</Animated.View>
  );
}

/** White text on the curtain header: back chevron and title (same in the overlay and in the static header). */
function HeaderContent({ top, onBack }: { top: number; onBack: () => void }) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ paddingTop: top, paddingHorizontal: 20 }}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Назад" style={styles.back}>
        <Ionicons name="chevron-back" size={30} color="#fff" />
      </Pressable>
      <Text style={styles.heroTitle} accessibilityRole="header">
        Регистрация
      </Text>
      <Text style={[styles.heroSub, { maxWidth: width * 0.56 }]}>Пара минут — и вам откроются ваши цены</Text>
    </View>
  );
}

/** «Зарегистрироваться» that shrinks into a round pill with bouncing dots while the form is being sent. */
function MorphButton({ title, busy, onPress }: { title: string; busy: boolean; onPress: () => void }) {
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const m = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // width can't use the native driver
    Animated.timing(m, { toValue: busy ? 1 : 0, duration: reduce ? 0 : 380, easing: curtainEase, useNativeDriver: false }).start();
  }, [busy, m, reduce]);
  const width = w ? m.interpolate({ inputRange: [0, 1], outputRange: [w, 92] }) : "100%";
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ alignItems: "center", marginTop: 6 }}>
      <Pressable
        onPress={() => {
          if (busy) return;
          tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ busy }}
      >
        <Animated.View style={[styles.morph, { width }]}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          {busy ? (
            <Dots />
          ) : (
            <Animated.Text style={[styles.morphText, { opacity: m.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: "clamp" }) }]} numberOfLines={1}>
              {title}
            </Animated.Text>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

type Done = { title: string; message: string; button: string; to: "/catalog" | "/" };

export default function Register() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const refresh = useAuth((s) => s.refresh);
  const [f, setF] = useState({ name: "", companyName: "", phone: "", email: "", password: "" });
  const [priceType, setPriceType] = useState("wholesale"); // the project's initial state
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"" | "sms" | "submit">("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const reduce = useReduceMotion();
  const { width } = useWindowDimensions();
  // lowest point of the curved header (left side); the right side is much higher
  const rest = insets.top + Math.max(250, width * 0.66);
  const scrollY = useRef(0);
  const [onCurtain, setOnCurtain] = useState(true);
  /** curtain overlay: "intro" lifts it into the header, "exit" drops it over the screen after success */
  const [overlay, setOverlay] = useState<"intro" | "exit" | null>("intro");
  const [overlayRest, setOverlayRest] = useState(rest);
  const [done, setDone] = useState<Done | null>(null);
  const progress = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const result = useRef(new Animated.Value(0)).current;
  const sections = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(reduce ? 1 : 0))).current;

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  // opening: the screen comes in covered by the curtain, it lifts into the header, then the form comes in section by section
  useEffect(() => {
    if (reduce) {
      setOverlay(null);
      return;
    }
    Animated.sequence([
      Animated.delay(260),
      Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 950, easing: curtainEase, useNativeDriver: true }),
        Animated.stagger(
          90,
          sections.map((v) => Animated.timing(v, { toValue: 1, duration: 520, delay: 420, easing: curtainEase, useNativeDriver: true }))
        ),
      ]),
    ]).start(() => setOverlay((o) => (o === "intro" ? null : o)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** success: the header drops back over the whole screen and shows the result on it */
  const finish = (d: Done) => {
    Keyboard.dismiss();
    setDone(d);
    if (reduce) {
      progress.setValue(0);
      result.setValue(1);
      setOverlay("exit");
      return;
    }
    progress.setValue(1);
    setOverlayRest(rest - scrollY.current);
    setOverlay("exit");
    Animated.sequence([
      Animated.timing(progress, { toValue: 0, duration: 850, easing: curtainEase, useNativeDriver: true }),
      Animated.timing(result, { toValue: 1, duration: 420, easing: curtainEase, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // entered values are kept when the customer type changes (one shared form state)
  const upd = (k: keyof typeof f) => (v: string) => {
    setF({ ...f, [k]: v });
    if (errors[k as keyof Errors]) setErrors({ ...errors, [k]: undefined });
  };
  const wholesale = priceType === "wholesale" || priceType === "big_wholesale";

  const sendSms = async () => {
    const e: Errors = {};
    if (!captcha) e.captcha = "Сначала отметьте «Я не робот»";
    if (f.phone.replace(/\D/g, "").length < 10) e.phone = "Введите номер телефона";
    if (e.captcha || e.phone) {
      setErrors({ ...errors, ...e });
      return;
    }
    setBusy("sms");
    setError("");
    try {
      await api.sendSms(f.phone);
      setSmsSent(true);
      setCooldown(60);
    } catch (err) {
      setErrors({ ...errors, phone: err instanceof Error ? err.message : "Не удалось отправить SMS" });
    } finally {
      setBusy("");
    }
  };

  const submit = async () => {
    if (submitting.current) return; // no double submit
    const e: Errors = {};
    if (!f.name.trim()) e.name = "Укажите имя";
    if (!f.email.trim()) e.email = "Укажите email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Проверьте email";
    if (f.password.length < 6) e.password = "Пароль должен быть не короче 6 символов";
    if (f.phone.replace(/\D/g, "").length < 10) e.phone = "Введите номер телефона";
    if (!captcha) e.captcha = "Отметьте «Я не робот»";
    if (!smsSent) e.smsCode = "Получите код по SMS";
    else if (smsCode.trim().length < 4) e.smsCode = "Введите код из SMS";
    if (!consent) e.consent = "Нужно согласие с документами";
    setErrors(e);
    if (Object.keys(e).length) {
      setError("Проверьте выделенные поля");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    submitting.current = true;
    Keyboard.dismiss();
    setBusy("submit");
    setError("");
    try {
      const r = await api.register({ ...f, captchaToken: captcha ?? "", smsCode: smsCode.trim(), priceType });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (r.autoLogin) {
        await refresh();
        finish({ title: "Готово!", message: r.message, button: "Перейти в каталог", to: "/catalog" });
      } else {
        // wholesale: account waits for the manager — no wholesale prices until approved (server side)
        finish({ title: "Заявка отправлена", message: r.message, button: "Понятно", to: "/" });
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Ошибка регистрации";
      const m = text.toLowerCase();
      if (m.includes("email")) setErrors({ email: text });
      else if (m.includes("код") || m.includes("sms")) setErrors({ smsCode: text });
      else if (m.includes("телефон")) setErrors({ phone: text });
      else if (m.includes("капч")) setErrors({ captcha: text });
      setError(text);
      // the captcha token is single-use (the site resets it too) — ask for a new one
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      submitting.current = false;
      setBusy("");
    }
  };

  const panel = [styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: dark ? "#170D25" : c.bg }} behavior="padding">
      <StatusBar style={onCurtain || overlay ? "light" : dark ? "light" : "dark"} />
      <AuthBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollY.current = y;
          const on = y < rest - insets.top - 120;
          if (on !== onCurtain) setOnCurtain(on);
        }}
      >
        <CurtainHeader rest={rest}>
          <View style={StyleSheet.absoluteFill}>
            <HeaderContent top={insets.top} onBack={back} />
          </View>
        </CurtainHeader>
        <View style={[styles.wrap, { paddingHorizontal: 18 }]}>
          <Rise v={sections[0]}>
            <Text style={[styles.h1, { color: c.label }]}>Кто вы?</Text>
            <View style={{ gap: 12 }}>
              {TYPES.map((t) => (
                <TypeCard
                  key={t.value}
                  t={t}
                  selected={priceType === t.value}
                  onPress={() => {
                    tap();
                    setPriceType(t.value);
                  }}
                />
              ))}
            </View>
            {wholesale ? (
              <Appear>
                <View style={[styles.hint, { backgroundColor: dark ? "#2A1F38" : "#F5EEFB" }]}>
                  <View style={styles.hintIcon}>
                    <Ionicons name="information-outline" size={20} color={VIOLET} />
                  </View>
                  <Text style={[styles.hintText, { color: c.label }]}>
                    Оптовые аккаунты подтверждает менеджер — мы свяжемся с вами после регистрации.
                  </Text>
                </View>
              </Appear>
            ) : null}
          </Rise>

          <Rise v={sections[1]}>
            <View style={[panel, { marginTop: 16 }]}>
              <IOSField label="Имя" placeholder="Имя и фамилия" value={f.name} onChangeText={upd("name")} autoComplete="name" error={errors.name} />
              {wholesale ? (
                <Appear>
                  <IOSField label="Компания" placeholder="ООО «Название» или ИП" value={f.companyName} onChangeText={upd("companyName")} />
                </Appear>
              ) : null}
              <IOSField
                label="Email"
                placeholder="mail@example.com"
                value={f.email}
                onChangeText={upd("email")}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                error={errors.email}
              />
              <IOSField
                label="Пароль"
                placeholder="Минимум 6 символов"
                password
                value={f.password}
                onChangeText={upd("password")}
                autoCapitalize="none"
                autoComplete="new-password"
                error={errors.password}
              />
              <IOSField
                label="Телефон"
                placeholder="+7 900 000 00 00"
                value={f.phone}
                onChangeText={upd("phone")}
                keyboardType="phone-pad"
                autoComplete="tel"
                error={errors.phone}
              />
              {/* real Yandex SmartCaptcha (same key as the site) */}
              <Captcha
                key={captchaKey}
                onToken={(t) => {
                  setCaptcha(t);
                  if (errors.captcha) setErrors({ ...errors, captcha: undefined });
                }}
                onExpired={() => setCaptcha(null)}
              />
              {errors.captcha ? <Text style={[styles.err, { marginTop: -8, marginBottom: 10 }]}>{errors.captcha}</Text> : null}
            </View>
          </Rise>

          {/* phone confirmation (existing SMS flow) */}
          <Rise v={sections[2]}>
            <View style={[panel, { marginTop: 16 }]}>
              <Text style={[styles.h2, { color: c.label }]}>Подтверждение телефона</Text>
              <Text style={[styles.sub, { color: c.secondary }]}>На ваш номер будет отправлен код из SMS</Text>
              <View style={styles.smsRow}>
                <View style={{ flex: 1 }}>
                  <IOSField
                    label="Код из SMS"
                    placeholder="Код из SMS"
                    value={smsCode}
                    onChangeText={(v) => {
                      setSmsCode(v);
                      if (errors.smsCode) setErrors({ ...errors, smsCode: undefined });
                    }}
                    keyboardType="number-pad"
                    autoComplete="sms-otp"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    error={errors.smsCode}
                  />
                </View>
                <OutlineButton
                  title={cooldown > 0 ? `Ещё раз · ${cooldown} с` : smsSent ? "Ещё раз" : "Получить код"}
                  loading={busy === "sms"}
                  disabled={cooldown > 0}
                  onPress={sendSms}
                  style={{ marginTop: 29, minWidth: 140 }}
                />
              </View>
              {smsSent ? <Text style={[styles.sub, { color: "#1f8a3b", marginTop: -6, marginBottom: 10 }]}>Код отправлен на {f.phone}</Text> : null}
            </View>
          </Rise>

          {/* consent; documents open separately */}
          <Rise v={sections[3]}>
            <Pressable
              onPress={() => {
                tap();
                setConsent(!consent);
                if (errors.consent) setErrors({ ...errors, consent: undefined });
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              style={styles.consent}
            >
              <View style={[styles.box, { borderColor: errors.consent ? "#FF3B30" : consent ? VIOLET : dark ? "#5A3D73" : "#C7C7CC" }, consent && { backgroundColor: VIOLET }]}>
                {consent ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
              </View>
              <Text style={[styles.consentText, { color: c.label }]}>
                Согласен с{" "}
                <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(`${BASE_URL}/privacy`)}>
                  политикой конфиденциальности
                </Text>{" "}
                и{" "}
                <Text style={styles.link} onPress={() => WebBrowser.openBrowserAsync(`${BASE_URL}/agreement`)}>
                  пользовательским соглашением
                </Text>
              </Text>
            </Pressable>
          </Rise>

          {error ? (
            <Appear key={error}>
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#FF3B30" />
                <Text style={[styles.err, { flex: 1 }]}>{error}</Text>
              </View>
            </Appear>
          ) : null}

          <Rise v={sections[4]}>
            <MorphButton title={wholesale ? "Отправить заявку" : "Зарегистрироваться"} busy={busy === "submit" || !!done} onPress={submit} />
          </Rise>
        </View>
      </ScrollView>

      {overlay ? (
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "auto" }]}>
          <Curtain progress={progress} rest={overlay === "exit" ? overlayRest : rest}>
            {overlay === "intro" ? (
              <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0.65, 1], outputRange: [0, 1], extrapolate: "clamp" }) }}>
                <HeaderContent top={insets.top} onBack={back} />
              </Animated.View>
            ) : null}
          </Curtain>
          {overlay === "exit" && done ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.result,
                { opacity: result, transform: [{ translateY: result.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
              ]}
            >
              <View style={styles.resultIcon}>
                <Ionicons name={done.to === "/catalog" ? "checkmark" : "time-outline"} size={44} color="#8b1ee6" />
              </View>
              <Text style={styles.resultTitle} accessibilityRole="header">
                {done.title}
              </Text>
              {done.message ? <Text style={styles.resultText}>{done.message}</Text> : null}
              <Pressable
                onPress={() => {
                  tap();
                  router.replace(done.to);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.resultBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.resultBtnText}>{done.button}</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 596, alignSelf: "center" },
  h1: { fontSize: 30, fontWeight: "800", marginTop: 14, marginBottom: 14 },
  back: { width: 40, height: 44, justifyContent: "center", marginLeft: -8 },
  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 14 },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 15, lineHeight: 20, marginTop: 4 },
  morph: { height: 56, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  morphText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  result: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  resultIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 22 },
  resultTitle: { color: "#fff", fontSize: 30, fontWeight: "800", textAlign: "center" },
  resultText: { color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 22, textAlign: "center", marginTop: 10, maxWidth: 420 },
  resultBtn: { marginTop: 28, height: 54, minWidth: 230, borderRadius: 27, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  resultBtnText: { color: "#7a12d4", fontSize: 17, fontWeight: "700" },
  h2: { fontSize: 21, fontWeight: "700" },
  sub: { fontSize: 15, marginTop: 4, marginBottom: 12 },
  panel: { borderRadius: 22, padding: 16, paddingBottom: 6 },
  shadow: { boxShadow: "0 4px 18px rgba(80,40,140,0.06)" },
  type: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 16, minHeight: 84 },
  typeLabel: { fontSize: 20, fontWeight: "600" },
  typeDesc: { fontSize: 15, marginTop: 3 },
  radio: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  check: { width: 30, height: 30, borderRadius: 15, backgroundColor: VIOLET, alignItems: "center", justifyContent: "center" },
  hint: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14, marginTop: 12 },
  hintIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: VIOLET, alignItems: "center", justifyContent: "center" },
  hintText: { flex: 1, fontSize: 15, lineHeight: 21 },
  smsRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  consent: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 18, marginBottom: 12 },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  consentText: { flex: 1, fontSize: 16, lineHeight: 23 },
  link: { color: VIOLET, textDecorationLine: "underline" },
  err: { color: "#FF3B30", fontSize: 13 },
  errorBox: { flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "rgba(255,59,48,0.08)", borderRadius: 12, padding: 12, marginBottom: 10 },
});

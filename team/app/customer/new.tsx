import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, ErrorState, Loading, VIOLET } from "@/components/kit";
import { post } from "@/api";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";

const PRICES = [{ value: "franchise", label: "Франшиза" }, { value: "retail", label: "Розница" }, { value: "wholesale", label: "Опт" }, { value: "big_wholesale", label: "Крупный опт" }];
const INITIAL = { name: "", companyName: "", phone: "", email: "", address: "", password: "", priceType: "retail", isApproved: true };

/** Admin-created customer accounts work in the existing customer website, Android and iPhone apps. */
export default function NewCustomer() {
  const c = useIOS();
  const admin = useAuth(s => s.user?.role === "admin");
  const loading = useAuth(s => s.loading);
  const [form, setForm] = useState(INITIAL);
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const set = (patch: Partial<typeof INITIAL>) => { setForm(previous => ({ ...previous, ...patch })); setError(""); };
  const wholesale = form.priceType !== "retail";
  const field = (key: "name" | "companyName" | "phone" | "email" | "address" | "password", label: string, placeholder: string, maxLength: number, keyboardType?: "phone-pad" | "email-address") => <View style={{ marginBottom: 14 }}>
    <Text style={[styles.label, { color: c.label }]}>{label}</Text>
    <TextInput accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={c.secondary} value={form[key]} onChangeText={value => set({ [key]: value })}
      editable={!busy} keyboardType={keyboardType} autoCapitalize={key === "email" || key === "password" ? "none" : "sentences"} autoCorrect={false}
      autoComplete="off" textContentType={key === "password" ? "newPassword" : "none"} secureTextEntry={key === "password" && !visiblePassword} maxLength={maxLength}
      style={[styles.input, { color: c.label, backgroundColor: c.bg, borderColor: c.separator }]} />
  </View>;
  const create = async () => {
    if (running.current || !admin) return;
    if (!form.name.trim() || !form.phone.trim() || form.password.length < 6) { setError("Заполните имя, телефон и пароль не короче 6 символов."); return; }
    if (wholesale && form.address.trim().length < 5) { setError("Укажите адрес доставки оптового клиента."); return; }
    running.current = true; setBusy(true); setError("");
    try {
      const result = await post<{ customer: { id: number } }>("/api/admin/customers", form);
      setForm(previous => ({ ...previous, password: "" }));
      router.replace({ pathname: "/customer/[id]", params: { id: String(result.customer.id) } });
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось создать аккаунт."); }
    finally { running.current = false; setBusy(false); }
  };
  return <Screen title="Новый клиент">
    {loading ? <Loading /> : !admin ? <ErrorState text="Создавать клиентов может только администратор" /> : <>
      <Card>
        <Text style={{ color: c.secondary, marginBottom: 16 }}>Создайте аккаунт и передайте клиенту телефон или email и пароль для входа на сайт и в приложение.</Text>
        {field("name", "Имя и фамилия *", "Контактное лицо", 160)}
        {field("phone", "Телефон *", "+7 900 000 00 00", 32, "phone-pad")}
        {field("email", "Email", "Необязательно", 120, "email-address")}
        {field("password", "Пароль *", "Не короче 6 символов", 72)}
        <Pressable accessibilityRole="button" accessibilityLabel={visiblePassword ? "Скрыть пароль" : "Показать пароль"} disabled={busy} onPress={() => setVisiblePassword(value => !value)} style={{ alignSelf: "flex-start", marginBottom: 18, paddingVertical: 5 }}>
          <Text style={{ color: c.blurTint === "dark" ? "#D7B8FF" : VIOLET, fontWeight: "600" }}>{visiblePassword ? "Скрыть пароль" : "Показать пароль"}</Text>
        </Pressable>
        <Text style={[styles.label, { color: c.label }]}>Тип цен</Text>
        <View pointerEvents={busy ? "none" : "auto"}><Chips items={PRICES} value={form.priceType} onChange={priceType => set({ priceType })} /></View>
        {field("companyName", "Компания или магазин", "Название", 250)}
        {field("address", wholesale ? "Адрес доставки *" : "Адрес доставки", "Город, улица, дом", 500)}
        <Text style={[styles.label, { color: c.label }]}>Подтверждение аккаунта</Text>
        <View pointerEvents={busy ? "none" : "auto"}><Chips items={[{ value: "yes", label: "Подтверждён" }, { value: "no", label: "Ожидает" }]} value={form.isApproved ? "yes" : "no"} onChange={value => set({ isApproved: value === "yes" })} /></View>
        <Text style={{ color: c.secondary }}>{form.isApproved ? "Клиент сможет сразу войти и оформлять заказы." : "Вход станет доступен после подтверждения администратором."}</Text>
      </Card>
      <Card>
        <Text style={{ color: c.secondary }}>{wholesale ? "После создания назначьте менеджера 1С в карточке клиента, чтобы заказы выгружались в 1С." : "Карту «Косметичка» можно привязать отдельно в карточке клиента."} Пароль не отправляется автоматически.</Text>
      </Card>
      {error ? <Text accessibilityRole="alert" style={{ color: "#DC2626", marginBottom: 12 }}>{error}</Text> : null}
      <ActionButton label="Создать аккаунт" icon="person-add-outline" loading={busy} disabled={busy} onPress={create} />
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, minHeight: 48 },
});

import { useState } from "react";
import { Text, View } from "react-native";
import { IOSField } from "./iosui/Field";
import { GradientButton } from "./iosui/Buttons";
import { Chips } from "./kit";
import { useIOS } from "../ios";

export type UserDraft = { name: string; login: string; password: string; role: "admin" | "manager" | "picker" };
const ROLES = [
  { value: "manager", label: "Менеджер" },
  { value: "picker", label: "Сборщик" },
  { value: "admin", label: "Администратор" },
] as const;

/** staff form with the checks the site's API doesn't do itself (password ≥ 6, role) */
export function UserForm({ initial, isNew, onSubmit, busy }: { initial: UserDraft; isNew: boolean; onSubmit: (d: UserDraft) => void; busy: boolean }) {
  const c = useIOS();
  const [d, setD] = useState(initial);
  const [err, setErr] = useState<Partial<Record<keyof UserDraft, string>>>({});
  const submit = () => {
    const e: typeof err = {};
    if (!d.name.trim()) e.name = "Введите имя";
    if (!d.login.trim()) e.login = "Введите логин";
    if (isNew && !d.password) e.password = "Введите пароль";
    if (d.password && d.password.length < 6) e.password = "Минимум 6 символов";
    setErr(e);
    if (Object.keys(e).length) return;
    onSubmit({ ...d, name: d.name.trim(), login: d.login.trim() });
  };
  return (
    <View>
      <IOSField label="Имя" value={d.name} onChangeText={(v) => setD({ ...d, name: v })} error={err.name} placeholder="Имя и фамилия" />
      <IOSField label="Логин" value={d.login} onChangeText={(v) => setD({ ...d, login: v })} error={err.login} autoCapitalize="none" autoCorrect={false} placeholder="Логин для входа" />
      <IOSField label={isNew ? "Пароль" : "Новый пароль"} value={d.password} onChangeText={(v) => setD({ ...d, password: v })} error={err.password} password autoCapitalize="none" placeholder={isNew ? "Минимум 6 символов" : "Оставьте пустым, чтобы не менять"} />
      <Text style={{ color: c.label, fontSize: 15, fontWeight: "600", marginBottom: 8 }}>Роль</Text>
      <Chips items={ROLES.map((r) => ({ value: r.value, label: r.label }))} value={d.role} onChange={(v) => setD({ ...d, role: v as UserDraft["role"] })} />
      <GradientButton title={isNew ? "Добавить" : "Сохранить"} loading={busy} onPress={submit} style={{ marginTop: 8 }} />
    </View>
  );
}

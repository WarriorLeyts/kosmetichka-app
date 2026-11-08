import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { IOSField } from "./iosui/Field";
import { GradientButton } from "./iosui/Buttons";
import { Chips, VIOLET } from "./kit";
import { useIOS } from "../ios";

export type UserDraft = { name: string; login: string; password: string; role: "admin" | "manager"; oneCGroup: string };
const ROLES = [
  { value: "manager", label: "Менеджер" },
  { value: "admin", label: "Администратор" },
] as const;

/** staff form with the checks the site's API doesn't do itself (password ≥ 6, role) */
export function UserForm({ initial, isNew, onSubmit, busy, groups }: { initial: UserDraft; isNew: boolean; onSubmit: (d: UserDraft) => void; busy: boolean; groups: string[] }) {
  const c = useIOS();
  const [d, setD] = useState(initial);
  const [err, setErr] = useState<Partial<Record<keyof UserDraft, string>>>({});
  const submit = () => {
    const e: typeof err = {};
    if (!d.name.trim()) e.name = "Введите имя";
    if (!d.login.trim()) e.login = "Введите логин";
    if (isNew && !d.password) e.password = "Введите пароль";
    if (d.password && d.password.length < 6) e.password = "Минимум 6 символов";
    if (d.role === "manager" && !d.oneCGroup) e.oneCGroup = "Выберите группу в 1С";
    setErr(e);
    if (Object.keys(e).length) return;
    onSubmit({ ...d, name: d.name.trim(), login: d.login.trim(), oneCGroup: d.role === "manager" ? d.oneCGroup : "" });
  };
  return (
    <View>
      <IOSField label="Имя" value={d.name} onChangeText={(v) => setD({ ...d, name: v })} error={err.name} placeholder="Имя и фамилия" />
      <IOSField label="Логин" value={d.login} onChangeText={(v) => setD({ ...d, login: v })} error={err.login} autoCapitalize="none" autoCorrect={false} placeholder="Логин для входа" />
      <IOSField label={isNew ? "Пароль" : "Новый пароль"} value={d.password} onChangeText={(v) => setD({ ...d, password: v })} error={err.password} password autoCapitalize="none" placeholder={isNew ? "Минимум 6 символов" : "Оставьте пустым, чтобы не менять"} />
      <Text style={{ color: c.label, fontSize: 15, fontWeight: "600", marginBottom: 8 }}>Роль</Text>
      <Chips items={ROLES.map((r) => ({ value: r.value, label: r.label }))} value={d.role} onChange={(v) => setD({ ...d, role: v as UserDraft["role"] })} />
      {d.role === "manager" ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={{ color: c.label, fontSize: 15, fontWeight: "600" }}>Группа в 1С</Text>
          <Text style={{ color: c.secondary, fontSize: 13, marginTop: 2, marginBottom: 8 }}>
            Менеджер видит только клиентов этой группы и их заказы
          </Text>
          {[...new Set([...groups, ...(d.oneCGroup ? [d.oneCGroup] : [])])].map((g, i) => {
            const on = d.oneCGroup === g;
            return (
              <Pressable
                key={g}
                onPress={() => setD({ ...d, oneCGroup: g })}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: i ? 0.5 : 0, borderTopColor: c.separator }}
              >
                <Ionicons name={on ? "checkmark-circle" : "ellipse-outline"} size={22} color={on ? VIOLET : c.tertiary} />
                <Text style={{ color: c.label, fontSize: 16, fontWeight: on ? "600" : "400", flex: 1 }}>{g}</Text>
              </Pressable>
            );
          })}
          {groups.length === 0 && !d.oneCGroup ? <Text style={{ color: c.secondary }}>Группы загружаются…</Text> : null}
          {err.oneCGroup ? <Text style={{ color: "#D92D20", fontSize: 13, marginTop: 4 }}>{err.oneCGroup}</Text> : null}
        </View>
      ) : null}
      <GradientButton title={isNew ? "Добавить" : "Сохранить"} loading={busy} onPress={submit} style={{ marginTop: 8 }} />
    </View>
  );
}

import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Sheet } from "@/components/iosui/Sheet";
import { tap } from "@/components/ui";
import { iosText, useIOS } from "@/ios";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import type { RoleInfo, RoleOption } from "@/types";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

const LABELS: Record<string, string> = { retail: "Розница", wholesale: "Опт", big_wholesale: "Крупный опт" };
const HINTS: Record<string, string> = {
  retail: "Розничные цены, бонусы по карте",
  wholesale: "Оптовые цены, заказ от 5 000 ₽",
  big_wholesale: "Цены крупного опта, заказ от 50 000 ₽",
};

/**
 * «Тип цен»: wholesale customers switch to retail and back by themselves (a full role change:
 * prices, bonuses, 1C); a retail customer sends a request that a manager approves.
 */
export function RoleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useIOS();
  const customer = useAuth((s) => s.customer);
  const setCustomer = useAuth((s) => s.setCustomer);
  const [info, setInfo] = useState<RoleInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError("");
    api
      .role()
      .then((r) => alive && setInfo(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Не удалось загрузить"));
    return () => {
      alive = false;
    };
  }, [open]);

  const apply = (r: RoleInfo) => {
    setInfo(r);
    if (customer) {
      setCustomer({ ...customer, priceType: r.priceType, wholesaleAccess: r.wholesaleAccess, roleRequest: r.roleRequest, roleRequestStatus: r.roleRequestStatus });
    }
  };

  const send = async (o: RoleOption) => {
    setBusy(o.value);
    try {
      const r = await api.roleSet(o.value);
      apply(r);
      if (r.switched) {
        onClose();
        Alert.alert("Готово", `Теперь у вас «${o.label}». Цены в каталоге и корзине пересчитаны.`);
      } else if (r.requested) {
        Alert.alert("Заявка отправлена", "Менеджер проверит её и откроет доступ. Пока действуют прежние цены.");
      }
    } catch (e) {
      Alert.alert("Не получилось", e instanceof Error ? e.message : "");
    } finally {
      setBusy("");
    }
  };

  const pick = (o: RoleOption) => {
    if (busy || o.state === "current") return;
    tap();
    if (o.state === "pending") {
      Alert.alert("Заявка на рассмотрении", `Заявка на «${o.label}» ждёт подтверждения менеджера.`, [
        { text: "Закрыть", style: "cancel" },
        {
          text: "Отозвать",
          style: "destructive",
          onPress: () => {
            api.roleWithdraw().then(apply).catch((e) => Alert.alert("Не получилось", e instanceof Error ? e.message : ""));
          },
        },
      ]);
      return;
    }
    if (o.state === "request") {
      Alert.alert(`Заявка на «${o.label}»`, "Доступ откроется после подтверждения менеджером — так же, как при оптовой регистрации.", [
        { text: "Отмена", style: "cancel" },
        { text: "Отправить", onPress: () => send(o) },
      ]);
      return;
    }
    Alert.alert(`Перейти на «${o.label}»?`, o.value === "retail"
      ? "Будут розничные цены и бонусы по карте. Вернуться на опт можно здесь же в любой момент."
      : "Будут оптовые цены, бонусы по карте не начисляются и не списываются. Вернуться на розницу можно здесь же.", [
      { text: "Отмена", style: "cancel" },
      { text: "Перейти", onPress: () => send(o) },
    ]);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Тип цен">
      {!info ? (
        <View style={{ height: 150, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          {error ? <Text style={[iosText.body, { color: c.secondary, textAlign: "center" }]}>{error}</Text> : <ActivityIndicator color={VIOLET} />}
        </View>
      ) : (
        <>
          <View style={[styles.group, { backgroundColor: c.cell }]}>
            {info.roleOptions.map((o, i) => (
              <Pressable
                key={o.value}
                onPress={() => pick(o)}
                accessibilityRole="button"
                accessibilityState={{ selected: o.state === "current" }}
                style={({ pressed }) => [
                  styles.option,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
                  pressed && o.state !== "current" && { backgroundColor: c.cellPressed },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[iosText.body, { color: c.label }]}>{o.label}</Text>
                  {HINTS[o.value] ? <Text style={[iosText.footnote, { color: c.secondary, marginTop: 1 }]}>{HINTS[o.value]}</Text> : null}
                </View>
                {busy === o.value ? (
                  <ActivityIndicator color={VIOLET} />
                ) : o.state === "current" ? (
                  <Ionicons name="checkmark" size={22} color={VIOLET} />
                ) : o.state === "available" ? (
                  <Text style={[iosText.subhead, { color: VIOLET, fontWeight: "600" }]}>Перейти</Text>
                ) : o.state === "pending" ? (
                  <Text style={[iosText.subhead, { color: "#FF9500", fontWeight: "600" }]}>На рассмотрении</Text>
                ) : (
                  <Text style={[iosText.subhead, { color: PINK, fontWeight: "600" }]}>Заявка</Text>
                )}
              </Pressable>
            ))}
          </View>
          {info.roleRequestStatus === "rejected" && info.roleRequest ? (
            <Text style={[iosText.footnote, styles.note, { color: "#FF3B30" }]}>
              Заявка на «{LABELS[info.roleRequest] ?? info.roleRequest}» отклонена. Можно отправить новую или написать менеджеру.
            </Text>
          ) : (
            <Text style={[iosText.footnote, styles.note, { color: c.secondary }]}>
              {info.wholesaleAccess
                ? "Между розницей и оптом переключайтесь сами. Уже оформленные заказы не меняются."
                : "Оптовые цены открываются после подтверждения менеджером."}
            </Text>
          )}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { marginHorizontal: 16, borderRadius: 10, overflow: "hidden" },
  option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingHorizontal: 16, paddingVertical: 8 },
  note: { marginHorizontal: 28, marginTop: 10, lineHeight: 18 },
});

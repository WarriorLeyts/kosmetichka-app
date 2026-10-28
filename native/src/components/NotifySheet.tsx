import { useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Sheet } from "@/components/iosui/Sheet";
import { iosText, useIOS } from "@/ios";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import { registerPush } from "@/push";
import { WebPushCard } from "@/components/WebPushCard";

/** Profile → «Уведомления»: promo consent and whether the phone allows push. */
export function NotifySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useIOS();
  const customer = useAuth((s) => s.customer);
  const setCustomer = useAuth((s) => s.setCustomer);
  const [promo, setPromo] = useState(!!customer?.pushPromo);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    setPromo(!!customer?.pushPromo);
    if (Platform.OS !== "android") return;
    Notifications.getPermissionsAsync()
      .then((p) => setAllowed(p.granted))
      .catch(() => setAllowed(null));
  }, [open, customer?.pushPromo]);

  const toggle = (v: boolean) => {
    setPromo(v);
    api
      .setPushPromo(v)
      .then(() => customer && setCustomer({ ...customer, pushPromo: v }))
      .catch(() => setPromo(!v));
  };

  const enable = async () => {
    const p = await Notifications.getPermissionsAsync().catch(() => null);
    if (p && !p.granted && p.canAskAgain) {
      await registerPush();
      const after = await Notifications.getPermissionsAsync().catch(() => null);
      setAllowed(!!after?.granted);
    } else {
      Linking.openSettings().catch(() => {});
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Уведомления">
      <View style={[styles.group, { backgroundColor: c.cell }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[iosText.body, { color: c.label }]}>Заказы, чат и бонусы</Text>
            <Text style={[iosText.footnote, { color: c.secondary }]}>Статусы заказов, ответы менеджера, бонусы, поступления — всегда</Text>
          </View>
        </View>
        <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator }]}>
          <View style={{ flex: 1 }}>
            <Text style={[iosText.body, { color: c.label }]}>Акции и новости</Text>
            <Text style={[iosText.footnote, { color: c.secondary }]}>Скидки, подборки и новинки</Text>
          </View>
          <Switch value={promo} onValueChange={toggle} trackColor={{ true: "#8b3dff" }} accessibilityLabel="Акции и новости" />
        </View>
      </View>
      {Platform.OS === "android" && allowed === false ? (
        <Pressable onPress={enable} accessibilityRole="button" style={styles.warn}>
          <Text style={[iosText.footnote, { color: "#FF3B30" }]}>
            Уведомления выключены в настройках телефона — нажмите, чтобы включить. Пока они видны только в приложении (колокольчик).
          </Text>
        </Pressable>
      ) : (
        <Text style={[iosText.footnote, styles.note, { color: c.secondary }]}>
          {Platform.OS === "ios"
            ? "На iPhone уведомления видны в приложении — по колокольчику вверху экрана."
            : Platform.OS === "web"
              ? "Все уведомления сохраняются на сайте — по колокольчику вверху экрана."
              : "Уведомления приходят на телефон и сохраняются в приложении — по колокольчику вверху экрана."}
        </Text>
      )}
      {Platform.OS === "web" ? (
        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <WebPushCard />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { marginHorizontal: 16, borderRadius: 10, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingHorizontal: 16, paddingVertical: 8 },
  note: { marginHorizontal: 28, marginTop: 10, lineHeight: 18 },
  warn: { marginHorizontal: 28, marginTop: 10 },
});

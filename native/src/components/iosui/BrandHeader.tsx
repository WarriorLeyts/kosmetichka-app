import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api";
import { useAuth } from "../../store/auth";
import { iosText, useIOS } from "../../ios";
import { LOGO } from "../PageTitle";
import { tap } from "../ui";

/**
 * Compact iOS top bar used on tab screens: brand logo + «КОСМЕТИЧКА» and a bell.
 * The bell shows a dot when there are unread manager messages (existing /api/orders/status).
 */
export function BrandHeader({ title }: { title?: string }) {
  const c = useIOS();
  const customer = useAuth((s) => s.customer);
  const [unread, setUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!customer) {
        setUnread(false);
        return;
      }
      api.orderStatus().then((r) => setUnread(r.managerMessages.length > 0)).catch(() => {});
    }, [customer])
  );

  return (
    <View>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
          <Text style={[styles.brandText, { color: c.label }]}>КОСМЕТИЧКА</Text>
        </View>
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={unread ? "Уведомления: есть новые сообщения" : "Уведомления"}
          onPress={() => {
            tap();
            router.navigate(customer ? "/orders" : "/login");
          }}
          style={styles.bell}
        >
          <Ionicons name="notifications-outline" size={27} color={c.label} />
          {unread ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>
      {title ? (
        <Text style={[iosText.largeTitle, styles.title, { color: c.label }]} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: { width: 32, height: 32 },
  brandText: { fontSize: 19, letterSpacing: 3.2, fontWeight: "400" },
  bell: { width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" },
  bellDot: { position: "absolute", top: 8, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: "#e82c87", borderWidth: 1.5, borderColor: "#fff" },
  title: { marginTop: 12, marginBottom: 14 },
});

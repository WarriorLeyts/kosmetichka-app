import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { orderStatus } from "../../unread";
import { useAuth } from "../../store/auth";
import { useNotifications } from "../../store/notifications";
import { iosText, useIOS } from "../../ios";
import { Wordmark } from "../Wordmark";
import { tap } from "../ui";
import { useDesktop } from "../../useDesktop";

/**
 * Top bar used on all tab screens: «КОСМЕТИЧКА» centred (same font and place as on the product page), bell on the right.
 * The bell opens «Уведомления»; a dot when there are unread notifications or manager messages.
 */
export function BrandHeader({ title }: { title?: string }) {
  const c = useIOS();
  const customer = useAuth((s) => s.customer);
  const [chatUnread, setChatUnread] = useState(false);
  const notifUnread = useNotifications((s) => s.unread);
  const unread = !!customer && (chatUnread || notifUnread > 0);
  const desktop = useDesktop();

  useFocusEffect(
    useCallback(() => {
      if (!customer) {
        setChatUnread(false);
        return;
      }
      useNotifications.getState().refresh();
      orderStatus().then((r) => setChatUnread(r.managerMessages.length > 0)).catch(() => {});
    }, [customer])
  );

  return (
    <View>
      {desktop ? <View style={{ height: 20 }} /> : <View style={styles.topRow}>
        <BrandWord color={c.label} />
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={unread ? "Уведомления: есть новые сообщения" : "Уведомления"}
          onPress={() => {
            tap();
            router.push(customer ? "/notifications" : "/login");
          }}
          style={styles.bell}
        >
          <Ionicons name="notifications-outline" size={27} color={c.label} />
          {unread ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>}
      {title ? (
        <Text style={[iosText.largeTitle, styles.title, { color: c.label }]} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { height: 50, alignItems: "center", justifyContent: "center" },
  bell: { position: "absolute", right: 0, top: 3, width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" },
  bellDot: { position: "absolute", top: 8, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: "#e82c87", borderWidth: 1.5, borderColor: "#fff" },
  title: { marginTop: 4, marginBottom: 14 },
});

/** «КОСМЕТИЧКА» — brand wordmark for the top of every page (no logo). */
export function BrandWord({ color, style }: { color: string; style?: object }) {
  // white text = on the gradient hero (home)
  return <Wordmark light={color === "#fff" || color === "#ffffff"} style={style as never} />;
}

const wordStyle = StyleSheet.create({
  bar: { height: 50, alignItems: "center", justifyContent: "center" },
  back: { position: "absolute", left: -6, top: 3, width: 44, height: 44, justifyContent: "center" },
  word: { fontSize: 19, letterSpacing: 3.2, fontWeight: "400", textAlign: "center" },
});

/** Top bar for inner screens: back chevron on the left, «КОСМЕТИЧКА» centred. */
export function BackBar({ onBack, color, tint = "#8b3dff" }: { onBack: () => void; color: string; tint?: string }) {
  return (
    <View style={wordStyle.bar}>
      <BrandWord color={color} />
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Назад" style={wordStyle.back}>
        <Ionicons name="chevron-back" size={28} color={tint} />
      </Pressable>
    </View>
  );
}

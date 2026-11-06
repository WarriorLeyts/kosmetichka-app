import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../store/auth";
import { useIOS } from "../ios";
import { tap } from "./ui";
import { SITE_RETAIL_DISCOUNT } from "../siteMode";
import { money } from "../format";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

/**
 * A retail customer («Розница») without a linked loyalty card pays the retail price; with the card —
 * «Скидка по карте». The hint is shown only to them: it goes away once the card is linked and comes back
 * if it is unlinked (customer.hasCard, reloaded after linking / unlinking).
 */
export function useCardHint(): boolean {
  const customer = useAuth((s) => s.customer);
  return SITE_RETAIL_DISCOUNT && customer?.priceType === "retail" && !customer.hasCard;
}

const openLink = () => {
  tap();
  router.push("/loyalty-add");
};

/** Home: a calm white tile under the search (as the profile's rows) */
export function CardHintTile() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  if (!useCardHint()) return null;
  return (
    <Pressable
      onPress={openLink}
      accessibilityRole="button"
      accessibilityLabel="Есть карта лояльности? Привяжите её и покупайте по скидочным ценам"
      style={({ pressed }) => [styles.tile, { backgroundColor: c.cell, opacity: pressed ? 0.85 : 1 }, !dark && styles.shadow]}
    >
      <View style={[styles.icon, { backgroundColor: dark ? "rgba(139,61,255,0.22)" : "#F3ECFA" }]}>
        <Ionicons name="card-outline" size={22} color={VIOLET} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: c.label }]}>Есть карта лояльности?</Text>
        <Text style={[styles.sub, { color: c.secondary }]}>
          Привяжите её — и покупайте по <Text style={{ color: PINK, fontWeight: "700" }}>скидочным ценам</Text>
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.chevron} />
    </Pressable>
  );
}

/** Catalog: one gradient line above the goods, explaining the second price */
export function CardHintStrip() {
  if (!useCardHint()) return null;
  return (
    <Pressable onPress={openLink} accessibilityRole="button" accessibilityLabel="Скидка по карте — после привязки карты в профиле" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <LinearGradient colors={[VIOLET, PINK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.strip}>
        <Ionicons name="card-outline" size={19} color="#fff" />
        <Text style={styles.stripText} numberOfLines={2}>
          <Text style={{ fontWeight: "800" }}>Скидка по карте</Text> — после привязки карты в профиле
        </Text>
        <Ionicons name="chevron-forward" size={17} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

/** Cart: under «Итого» — the same order with the card, and the link to add it */
export function CardHintTotal({ withCard, now }: { withCard: number; now: number }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const show = useCardHint();
  if (!show || !(withCard > 0 && withCard < now)) return null;
  const tint = dark ? "#C9A8FF" : "#6B2BD9";
  return (
    <View style={{ marginTop: 6 }}>
      <View style={styles.totalRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
          <Ionicons name="card-outline" size={17} color={tint} />
          <Text style={[styles.totalText, { color: tint }]} numberOfLines={1}>С картой лояльности</Text>
        </View>
        <Text style={[styles.totalText, { color: tint, fontWeight: "800" }]}>{money(withCard)}</Text>
      </View>
      <Pressable onPress={openLink} accessibilityRole="link" hitSlop={6} style={{ alignSelf: "flex-start", marginTop: 4 }}>
        <Text style={[styles.link, { color: dark ? "#D8B4FE" : VIOLET }]}>Привязать карту в профиле ›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 14, marginTop: 12 },
  shadow: { boxShadow: "0 4px 16px rgba(31,41,55,0.06)" },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 13, lineHeight: 17, marginTop: 2 },
  strip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  stripText: { flex: 1, color: "#fff", fontSize: 13, lineHeight: 17 },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  totalText: { fontSize: 15, fontWeight: "600" },
  link: { fontSize: 15, fontWeight: "700" },
});

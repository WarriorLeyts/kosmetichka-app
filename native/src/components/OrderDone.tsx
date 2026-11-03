import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { VIOLET_PINK } from "./TabBar";
import { useIOS } from "../ios";

const STEPS = ["Оформлен", "Сборка", "Проверка", "Оплата", "Выполнен"];

/** «Выполнен» shown big (three looks to choose from): a = gradient banner, b = card with the steps, c = big status block. */
export function OrderDone({ look, date }: { look: string; date: string }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  if (look === "a")
    return (
      <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.banner}>
        <View style={st.bigIcon}>
          <Ionicons name="sparkles" size={34} color="#b832e0" />
        </View>
        <Text style={st.bannerTitle}>Заказ выполнен!</Text>
        <Text style={st.bannerText}>Спасибо за покупку. Будем рады видеть вас снова 💜</Text>
      </LinearGradient>
    );
  if (look === "b")
    return (
      <View style={[st.card, { backgroundColor: c.cell }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <LinearGradient colors={VIOLET_PINK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.round}>
            <Ionicons name="checkmark" size={30} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[st.cardTitle, { color: c.label }]}>Заказ выполнен</Text>
            <Text style={{ color: c.secondary, fontSize: 15 }}>{date}</Text>
          </View>
        </View>
        <View style={st.steps}>
          {STEPS.map((s, i) => (
            <View key={s} style={st.step}>
              <View style={st.lineRow}>
                <View style={[st.line, { opacity: i ? 1 : 0 }]} />
                <View style={st.dot}>
                  <Ionicons name={i === STEPS.length - 1 ? "sparkles" : "checkmark"} size={12} color="#fff" />
                </View>
                <View style={[st.line, { opacity: i < STEPS.length - 1 ? 1 : 0 }]} />
              </View>
              <Text style={[st.stepText, { color: i === STEPS.length - 1 ? "#b832e0" : c.secondary, fontWeight: i === STEPS.length - 1 ? "800" : "500" }]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  return (
    <View style={[st.block, { backgroundColor: dark ? "rgba(184,50,224,0.22)" : "rgba(184,50,224,0.1)", borderColor: dark ? "rgba(215,124,242,0.5)" : "rgba(184,50,224,0.35)" }]}>
      <Ionicons name="sparkles" size={40} color={dark ? "#d77cf2" : "#b832e0"} />
      <View style={{ flex: 1 }}>
        <Text style={[st.blockTitle, { color: dark ? "#d77cf2" : "#b832e0" }]}>Выполнен</Text>
        <Text style={{ color: c.secondary, fontSize: 15, marginTop: 2 }}>Заказ передан и закрыт · {date}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  banner: { alignItems: "center", borderRadius: 24, paddingVertical: 24, paddingHorizontal: 18, marginTop: 14, gap: 8, boxShadow: "0 10px 26px rgba(139,61,255,0.35)" },
  bigIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: "#fff", fontSize: 26, fontWeight: "800" },
  bannerText: { color: "rgba(255,255,255,0.95)", fontSize: 16, textAlign: "center", lineHeight: 21 },
  card: { borderRadius: 22, padding: 18, marginTop: 14, gap: 16 },
  round: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 22, fontWeight: "800" },
  steps: { flexDirection: "row" },
  step: { flex: 1, alignItems: "center", gap: 6 },
  lineRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  line: { flex: 1, height: 3, backgroundColor: "#b832e0" },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#b832e0", alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 11.5, textAlign: "center" },
  block: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 22, borderWidth: 1.5, paddingVertical: 18, paddingHorizontal: 18, marginTop: 12 },
  blockTitle: { fontSize: 26, fontWeight: "800" },
});

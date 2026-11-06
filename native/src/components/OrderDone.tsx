import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { VIOLET_PINK } from "./TabBar";

/** «Выполнен» on the order screen: a big brand-gradient banner the customer can't miss. */
export function OrderDone() {
  return (
    <LinearGradient
      colors={VIOLET_PINK}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={st.banner}
      accessible
      accessibilityRole="summary"
      accessibilityLabel="Заказ выполнен. Спасибо за покупку"
    >
      <View style={st.bigIcon}>
        <Ionicons name="sparkles" size={34} color="#b832e0" />
      </View>
      <Text style={st.title}>Заказ выполнен!</Text>
      <Text style={st.text}>Спасибо за покупку. Будем рады видеть вас снова 💜</Text>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  banner: { alignItems: "center", borderRadius: 24, paddingVertical: 24, paddingHorizontal: 18, marginTop: 14, gap: 8, boxShadow: "0 10px 26px rgba(139,61,255,0.35)" },
  bigIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", textAlign: "center" },
  text: { color: "rgba(255,255,255,0.95)", fontSize: 17, textAlign: "center", lineHeight: 22 },
});

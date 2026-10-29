import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KV } from "./kit";

/** 8 900 123-45-67 / +7 (900) … / 9001234567 → 79001234567 (for wa.me); null when it isn't a phone */
export function waNumber(phone: string | null | undefined): string | null {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10) d = "7" + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** «Телефон» row + «Позвонить» (an ordinary call) and «WhatsApp» (opens the chat with the customer). */
export function PhoneKV({ phone }: { phone: string | null | undefined }) {
  if (!phone?.trim()) return null;
  const wa = waNumber(phone);
  const tel = phone.replace(/[^\d+]/g, "");
  return (
    <View>
      <KV k="Телефон" v={phone} onPress={() => Linking.openURL(`tel:${tel}`).catch(() => {})} />
      <View style={styles.row}>
        <Pressable
          onPress={() => Linking.openURL(`tel:${tel}`).catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel={`Позвонить ${phone}`}
          style={({ pressed }) => [styles.btn, { backgroundColor: "rgba(139,61,255,0.12)", opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="call" size={16} color="#8b3dff" />
          <Text style={[styles.text, { color: "#8b3dff" }]}>Позвонить</Text>
        </Pressable>
        {wa ? (
          <Pressable
            onPress={() => Linking.openURL(`https://wa.me/${wa}`).catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel={`Написать в WhatsApp ${phone}`}
            style={({ pressed }) => [styles.btn, { backgroundColor: "rgba(37,211,102,0.14)", opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="logo-whatsapp" size={17} color="#128C4A" />
            <Text style={[styles.text, { color: "#128C4A" }]}>WhatsApp</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 2, marginBottom: 6, justifyContent: "flex-end" },
  btn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17 },
  text: { fontSize: 14, fontWeight: "700" },
});

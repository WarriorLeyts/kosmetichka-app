import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { BASE_URL } from "@/api";
import { colors, radius } from "@/theme";

const REQUISITES: [string, string][] = [
  ["Организация", "ООО «ВЕДУЧИ-1»"],
  ["ИНН / КПП", "2004008212 / 201501001"],
  ["ОГРН", "1152036001193"],
  ["Адрес", "364037, Чеченская Республика, г. Грозный, р-н Ахматовский, ул. им. М.Н. Нурбагандова, 1А"],
];

const LINKS: { label: string; path: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Сайт kosmetichka-opt.ru", path: "/", icon: "globe-outline" },
  { label: "Контакты и реквизиты", path: "/contacts", icon: "business-outline" },
  { label: "Политика конфиденциальности", path: "/privacy", icon: "shield-checkmark-outline" },
  { label: "Пользовательское соглашение", path: "/agreement", icon: "document-text-outline" },
];

export default function Info() {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: "О компании" }} />
      <Text style={styles.lead}>
        По вопросам заказов и сотрудничества обращайтесь к вашему менеджеру — в чате любого заказа или в личном кабинете.
      </Text>
      <View style={styles.box}>
        {REQUISITES.map(([k, v], i) => (
          <View key={k} style={[styles.row, i > 0 && styles.sep]}>
            <Text style={styles.k}>{k}</Text>
            <Text style={styles.v} selectable>{v}</Text>
          </View>
        ))}
      </View>
      <View style={styles.box}>
        {LINKS.map((l, i) => (
          <Pressable key={l.path} onPress={() => WebBrowser.openBrowserAsync(BASE_URL + l.path)} style={[styles.link, i > 0 && styles.sep]}>
            <Ionicons name={l.icon} size={20} color={colors.violet} />
            <Text style={styles.linkText}>{l.label}</Text>
            <Ionicons name="open-outline" size={16} color={colors.faint} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.version}>Версия приложения {Constants.expoConfig?.version ?? ""}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  lead: { color: colors.muted, lineHeight: 21, marginBottom: 4 },
  box: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: 14, overflow: "hidden" },
  row: { padding: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.soft },
  k: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  v: { color: colors.text, fontSize: 14, marginTop: 3, lineHeight: 19 },
  link: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 54 },
  linkText: { flex: 1, color: colors.text, fontWeight: "700", fontSize: 15 },
  version: { color: colors.faint, textAlign: "center", marginTop: 24, fontSize: 12 },
});

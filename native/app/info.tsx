import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { api, BASE_URL } from "@/api";
import { TitleBar } from "@/components/iosui/TitleBar";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";
import { useReduceMotion } from "@/useReduceMotion";
import { colors } from "@/theme";

const REQUISITES: [string, string][] = [
  ["Организация", "ООО «ВЕДУЧИ-1»"],
  ["ИНН / КПП", "2004008212 / 201501001"],
  ["ОГРН", "1152036001193"],
  ["Адрес", "364037, Чеченская Республика, г. Грозный, р-н Ахматовский, ул. им. М.Н. Нурбагандова, 1А"],
];

type Link = { label: string; path: string; icon: keyof typeof Ionicons.glyphMap };
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = { contacts: "business-outline", privacy: "shield-checkmark-outline", agreement: "document-text-outline" };

/** shown until the site answers (and if it doesn't): what the admin panel's «Страницы» had before */
const LINKS: Link[] = [
  { label: "Сайт kosmetichka-opt.ru", path: "/", icon: "globe-outline" },
  { label: "Контакты и реквизиты", path: "/contacts", icon: "business-outline" },
  { label: "Политика конфиденциальности", path: "/privacy", icon: "shield-checkmark-outline" },
  { label: "Пользовательское соглашение", path: "/agreement", icon: "document-text-outline" },
];

/** «О компании» — iOS grouped panels: requisites and links. */
export default function Info() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const appear = useRef(new Animated.Value(0)).current;
  // requisites and the pages' menu as edited in the admin panel (Страницы)
  const [requisites, setRequisites] = useState<[string, string][]>(REQUISITES);
  const [links, setLinks] = useState<Link[]>(LINKS);
  useEffect(() => {
    let alive = true;
    api
      .sitePages()
      .then((r) => {
        if (!alive) return;
        const req = r.requisites.filter((x) => x.label && x.value).map((x) => [x.label, x.value] as [string, string]);
        if (req.length) setRequisites(req);
        if (r.menu.length) setLinks([LINKS[0], ...r.menu.map((m) => ({ label: m.title, path: m.path, icon: ICONS[m.slug] ?? "reader-outline" }))]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: reduce ? 0 : 240, useNativeDriver: true }).start();
  }, [appear, reduce]);

  const panel = [styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow];
  const sep = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator };

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <View style={styles.wrap}>
          <TitleBar title="О компании" />
          <Animated.View style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
            <Text style={[styles.lead, { color: c.secondary }]}>
              По вопросам заказов и сотрудничества обращайтесь к вашему менеджеру — в чате любого заказа или в личном кабинете.
            </Text>

            <View style={panel}>
              {requisites.map(([k, v], i) => (
                <View key={k} style={[styles.row, i > 0 && sep]}>
                  <Text style={[styles.k, { color: c.secondary }]}>{k}</Text>
                  <Text style={[styles.v, { color: c.label }]} selectable>
                    {v}
                  </Text>
                </View>
              ))}
            </View>

            <View style={panel}>
              {links.map((l, i) => (
                <Pressable
                  key={l.path}
                  onPress={() => {
                    tap();
                    WebBrowser.openBrowserAsync(BASE_URL + l.path);
                  }}
                  accessibilityRole="link"
                  accessibilityLabel={l.label}
                  style={({ pressed }) => [styles.link, i > 0 && sep, pressed && { backgroundColor: c.cellPressed }]}
                >
                  <Ionicons name={l.icon} size={26} color={colors.brand} />
                  <Text style={[styles.linkText, { color: c.label }]}>{l.label}</Text>
                  <Ionicons name="open-outline" size={20} color={c.secondary} />
                </Pressable>
              ))}
            </View>

            <Text style={[styles.version, { color: c.secondary }]}>Версия приложения {Constants.expoConfig?.version ?? ""}</Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 640, alignSelf: "center" },
  lead: { fontSize: 17, lineHeight: 24, marginBottom: 6 },
  panel: { borderRadius: 22, marginTop: 14, overflow: "hidden" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  row: { paddingHorizontal: 18, paddingVertical: 14 },
  k: { fontSize: 15, fontWeight: "500" },
  v: { fontSize: 17, marginTop: 4, lineHeight: 23 },
  link: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, minHeight: 60 },
  linkText: { flex: 1, fontSize: 17, fontWeight: "600" },
  version: { textAlign: "center", marginTop: 22, fontSize: 13 },
});

import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { categoryIcon } from "./CategoryDrawer";
import { useIOS } from "../ios";
import { tap } from "./ui";
import { childCategories, topCategories } from "../store/catalog";
import type { Category } from "../types";
import { colors } from "@/theme";

/** active text on the dark theme's violet highlight (audit UX-01) */
const PINK = "#e82c87";

/** width of the left column on the computer (home and catalog) */
export const DESKTOP_SIDEBAR_W = 280;

/** the top-level category that holds `guid` (itself when it is top-level) */
function topOf(all: Category[], tops: Category[], guid: string | null): string | null {
  if (!guid) return null;
  const topSet = new Set(tops.map((t) => t.guid));
  let g: string | null | undefined = guid;
  for (let i = 0; i < 6 && g; i++) {
    if (topSet.has(g)) return g;
    g = all.find((c) => c.guid === g)?.parentGuid;
  }
  return null;
}

/**
 * Computer: categories always shown on the left — every section with its picture, the chosen one opened
 * with its subcategories. `selected` — the catalogue's category (null: all goods).
 */
function DesktopCategoriesBase({ categories, selected, onSelect }: { categories: Category[]; selected: string | null; onSelect: (guid: string | null) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const tops = useMemo(() => topCategories(categories), [categories]);
  const open = topOf(categories, tops, selected);
  const activeBg = dark ? "rgba(139,61,255,0.22)" : "#F4EBFF";
  const pick = (guid: string | null) => {
    tap();
    onSelect(guid);
  };

  return (
    <View style={[styles.box, { backgroundColor: c.cell }, !dark && styles.shadow]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
        <Text style={[styles.title, { color: c.label }]}>Категории</Text>
        <Pressable
          onPress={() => pick(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: !selected }}
          style={(st: { pressed: boolean; hovered?: boolean }) => [styles.top, !selected && { backgroundColor: activeBg }, st.hovered && selected ? { backgroundColor: dark ? "rgba(255,255,255,0.05)" : "#FAF6FE" } : null]}
        >
          <View style={[styles.iconBox, { backgroundColor: dark ? "rgba(139,61,255,0.2)" : "#F3ECFA" }]}>
            <Ionicons name="grid-outline" size={17} color={colors.brand} />
          </View>
          <Text style={[styles.topText, { color: !selected ? (dark ? colors.brandOnDark : colors.brand) : c.label }]} numberOfLines={1}>
            Все товары
          </Text>
        </Pressable>
        {tops.map((t) => {
          const isOpen = open === t.guid;
          const on = selected === t.guid;
          const kids = isOpen ? childCategories(categories, t.guid) : [];
          const icon = categoryIcon(t);
          return (
            <View key={t.guid}>
              <Pressable
                onPress={() => pick(t.guid)}
                accessibilityRole="button"
                accessibilityState={{ selected: on, expanded: isOpen }}
                accessibilityLabel={t.name}
                style={(st: { pressed: boolean; hovered?: boolean }) => [styles.top, (on || isOpen) && { backgroundColor: activeBg }, st.hovered && !on && !isOpen ? { backgroundColor: dark ? "rgba(255,255,255,0.05)" : "#FAF6FE" } : null]}
              >
                {icon ? <Image source={icon} style={styles.icon} contentFit="contain" /> : <View style={styles.icon} />}
                <Text style={[styles.topText, { color: isOpen ? (dark ? colors.brandOnDark : colors.brand) : c.label }]} numberOfLines={2}>
                  {t.name}
                </Text>
                <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={15} color={isOpen ? colors.brand : c.chevron} />
              </Pressable>
              {kids.map((k) => {
                const kOn = selected === k.guid;
                return (
                  <Pressable
                    key={k.guid}
                    onPress={() => pick(k.guid)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: kOn }}
                    style={(st: { pressed: boolean; hovered?: boolean }) => [styles.sub, st.hovered && !kOn ? { backgroundColor: dark ? "rgba(255,255,255,0.05)" : "#FAF6FE" } : null]}
                  >
                    <Text style={[styles.subText, { color: kOn ? PINK : c.secondary }, kOn && { fontWeight: "700" }]} numberOfLines={2}>
                      {k.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const DesktopCategories = memo(DesktopCategoriesBase);

const styles = StyleSheet.create({
  // its own scroll: the column stays on screen while the goods scroll beside it
  box: { width: DESKTOP_SIDEBAR_W, maxHeight: "100%", borderRadius: 22, paddingVertical: 12, paddingHorizontal: 8, alignSelf: "flex-start" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.06)" },
  title: { fontSize: 17, fontWeight: "800", paddingHorizontal: 10, paddingTop: 2, paddingBottom: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 12, minHeight: 44 },
  icon: { width: 30, height: 30 },
  iconBox: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  topText: { flex: 1, fontSize: 15, fontWeight: "600" },
  sub: { paddingLeft: 48, paddingRight: 8, paddingVertical: 6, borderRadius: 10 },
  subText: { fontSize: 13, lineHeight: 17 },
});

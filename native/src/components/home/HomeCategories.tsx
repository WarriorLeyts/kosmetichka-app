import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { iconFor } from "../CategoryDrawer";
import { useIOS } from "../../ios";
import { tap } from "../ui";
import type { Category } from "../../types";

/** «Категории товаров» — two-column grid with the prepared category images (no emoji). */
export function HomeCategories({ categories, onOpen }: { categories: Category[]; onOpen: (guid: string | null) => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.h, { color: c.label }]}>Категории товаров</Text>
        <Pressable
          onPress={() => {
            tap();
            onOpen(null);
          }}
          hitSlop={8}
          accessibilityRole="link"
          style={styles.all}
        >
          <Text style={styles.allText}>Все категории</Text>
          <Ionicons name="arrow-forward" size={18} color="#8b2be0" />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {categories.map((cat) => {
          const icon = iconFor(cat.name);
          return (
            <View key={cat.guid} style={styles.cell}>
              <Pressable
                onPress={() => {
                  tap();
                  onOpen(cat.guid);
                }}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                style={({ pressed }) => [styles.card, { backgroundColor: c.cell, transform: [{ scale: pressed ? 0.98 : 1 }] }, !dark && styles.shadow]}
              >
                <View style={[styles.pic, { backgroundColor: dark ? "#2C2C2E" : "#F6EFFB" }]}>
                  {icon ? <Image source={icon} style={styles.img} contentFit="contain" /> : <Ionicons name="sparkles-outline" size={40} color="#c28be8" />}
                </View>
                <View style={styles.label}>
                  <Text style={[styles.name, { color: c.label }]} numberOfLines={2}>
                    {cat.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#8b2be0" />
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, marginTop: 8 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, marginBottom: 8 },
  h: { fontSize: 22, fontWeight: "700" },
  all: { flexDirection: "row", alignItems: "center", gap: 6 },
  allText: { color: "#8b2be0", fontSize: 15, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", padding: 5 },
  card: { borderRadius: 20, overflow: "hidden" },
  shadow: { boxShadow: "0 4px 16px rgba(120,60,180,0.08)" },
  pic: { height: 118, alignItems: "center", justifyContent: "center" },
  img: { width: "78%", height: "92%" },
  label: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 12, minHeight: 56 },
  name: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 19 },
});

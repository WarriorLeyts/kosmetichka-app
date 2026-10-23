import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { iconFor } from "../CategoryDrawer";
import { useIOS } from "../../ios";
import { tap } from "../ui";
import type { Category } from "../../types";

/** «Категории товаров» — two-column grid as on the mockup: picture on top, white label with a chevron over its bottom. */
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
                <View style={[styles.pic, { backgroundColor: dark ? "#2C2C2E" : "#F3ECFA" }]}>
                  {icon ? (
                    <Image source={icon} style={styles.img} contentFit="contain" />
                  ) : (
                    <Ionicons name="sparkles-outline" size={40} color="#c28be8" />
                  )}
                </View>
                <View style={[styles.label, { backgroundColor: dark ? "rgba(28,28,30,0.92)" : "rgba(255,255,255,0.94)" }]}>
                  <Text style={[styles.name, { color: c.label }]} numberOfLines={2}>
                    {cat.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#8b2be0" />
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
  h: { fontSize: 24, fontWeight: "700" },
  all: { flexDirection: "row", alignItems: "center", gap: 6 },
  allText: { color: "#7a1ee8", fontSize: 17, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", padding: 5 },
  card: { borderRadius: 22, overflow: "hidden", height: 176 },
  shadow: { boxShadow: "0 4px 16px rgba(120,60,180,0.08)" },
  pic: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingBottom: 50 },
  img: { width: "78%", height: "92%" },
  label: { position: "absolute", left: 6, right: 6, bottom: 6, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, minHeight: 50, borderRadius: 16 },
  name: { flex: 1, fontSize: 17, fontWeight: "600", lineHeight: 21 },
});

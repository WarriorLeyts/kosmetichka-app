import { memo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { brandLogo } from "@/brandLogos";
import { useIOS } from "@/ios";
import { tap } from "@/components/ui";

type Brand = { guid: string; name: string };

/**
 * The brands chosen in «Бренд», above the products: each as a card with its logo (or the name set as a
 * wordmark) and a cross to remove it; «Сбросить» when there are several.
 */
export const BrandChips = memo(function BrandChips({ brands, onRemove, onClear, onOpen }: { brands: Brand[]; onRemove: (guid: string) => void; onClear: () => void; onOpen: () => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  if (!brands.length) return null;
  const web = Platform.OS === "web";
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {brands.map((b) => {
        const logo = brandLogo(b.name);
        return (
          <View key={b.guid} style={[styles.chip, dark ? styles.chipDark : styles.chipLight]}>
            <Pressable
              onPress={() => {
                tap();
                onOpen();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Бренд ${b.name}`}
              style={[styles.body, web && ({ cursor: "pointer" } as object)]}
            >
              <View style={styles.logoBox}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" transition={120} cachePolicy="memory-disk" accessibilityIgnoresInvertColors />
                ) : (
                  <Text style={styles.wordmark} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {b.name.toUpperCase()}
                  </Text>
                )}
              </View>
              {logo ? (
                <Text style={[styles.name, { color: dark ? "#FAF7FD" : "#2A1745" }]} numberOfLines={1}>
                  {b.name}
                </Text>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => {
                tap();
                onRemove(b.guid);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Убрать бренд ${b.name}`}
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }, web && ({ cursor: "pointer" } as object)]}
            >
              <Ionicons name="close" size={15} color="#fff" />
            </Pressable>
          </View>
        );
      })}
      {brands.length > 1 ? (
        <Pressable
          onPress={() => {
            tap();
            onClear();
          }}
          accessibilityRole="button"
          style={[styles.clear, web && ({ cursor: "pointer" } as object)]}
        >
          <Text style={styles.clearText}>Сбросить</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 5, paddingVertical: 4 },
  chip: { flexDirection: "row", alignItems: "center", height: 52, borderRadius: 16, borderWidth: 1.5, paddingLeft: 8, paddingRight: 8, gap: 8 },
  chipLight: { backgroundColor: "#FFFFFF", borderColor: "#C9B2FF", boxShadow: "0 4px 14px rgba(103,47,190,0.12)" },
  chipDark: { backgroundColor: "#2B193D", borderColor: "#8b3dff" },
  body: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoBox: { width: 72, height: 36, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: 66, height: 30 },
  wordmark: { color: "#3B1F66", fontSize: 12, fontWeight: "800", letterSpacing: 1, paddingHorizontal: 4, maxWidth: 72 },
  name: { fontSize: 14.5, fontWeight: "700", maxWidth: 160 },
  close: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#8b3dff", alignItems: "center", justifyContent: "center" },
  clear: { height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: "center" },
  clearText: { color: "#8b3dff", fontSize: 15, fontWeight: "600" },
});

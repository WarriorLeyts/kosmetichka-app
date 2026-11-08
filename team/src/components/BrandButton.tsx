import { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { brandLogo } from "@/brandLogos";
import { useIOS } from "@/ios";
import { tap } from "@/components/ui";

type Brand = { guid: string; name: string };
const VIOLET = "#8b3dff";

/**
 * «Бренд» next to the filters. Nothing chosen — the word; brands chosen — their logos right on the
 * button (two at most — one on a phone — then «+N»), a brand without a logo — its name.
 */
export const BrandButton = memo(function BrandButton({ brands, count, onPress, max = 2 }: { brands: Brand[]; count: number; onPress: () => void; max?: number }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const shown = brands.slice(0, max);
  const more = count - shown.length;
  const label = count ? `Бренд: ${brands.map((b) => b.name).join(", ") || count}` : "Бренд";
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        count
          ? { backgroundColor: dark ? "#2B193D" : "#FFFFFF", borderColor: VIOLET, borderWidth: 1.5, paddingLeft: 5 }
          : { backgroundColor: c.cell, borderColor: "transparent", borderWidth: 1.5 },
        pressed && { opacity: 0.85 },
        Platform.OS === "web" && ({ cursor: "pointer" } as object),
      ]}
    >
      {count === 0 ? (
        <Text style={[styles.text, { color: c.label }]}>Бренд</Text>
      ) : shown.length === 0 ? (
        <Text style={[styles.text, { color: VIOLET, fontWeight: "600" }]}>Бренд · {count}</Text>
      ) : (
        <>
          {shown.map((b) => {
            const logo = brandLogo(b.name);
            return (
              <View key={b.guid} style={styles.tile}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" transition={100} cachePolicy="memory-disk" accessibilityIgnoresInvertColors />
                ) : (
                  <Text style={styles.name} numberOfLines={1}>
                    {b.name}
                  </Text>
                )}
              </View>
            );
          })}
          {more > 0 ? (
            <View style={styles.more}>
              <Text style={styles.moreText}>+{more}</Text>
            </View>
          ) : null}
        </>
      )}
      <Ionicons name="chevron-down" size={16} color={count ? VIOLET : c.label} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 4, height: 38, borderRadius: 19, paddingLeft: 13, paddingRight: 11, flexShrink: 0, boxShadow: "0 1px 6px rgba(0,0,0,0.07)" },
  text: { fontSize: 15 },
  tile: { height: 28, minWidth: 40, maxWidth: 74, paddingHorizontal: 5, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  logo: { width: 62, height: 20 },
  name: { fontSize: 12.5, fontWeight: "800", color: "#3B1F66", letterSpacing: 0.3 },
  more: { height: 24, minWidth: 28, paddingHorizontal: 6, borderRadius: 12, backgroundColor: VIOLET, alignItems: "center", justifyContent: "center" },
  moreText: { color: "#fff", fontSize: 12.5, fontWeight: "700" },
});

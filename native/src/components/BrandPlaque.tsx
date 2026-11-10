import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "@/api";
import { brandLogo } from "@/brandLogos";
import { useCatalog } from "@/store/catalog";
import { tap } from "@/components/ui";
import { useIOS } from "@/ios";

const VIOLET = "#8B3DFF";
const counts = new Map<string, number>();

/**
 * In the product card (owner's choice «1Б», 2026-11-10): the brand as a plaque — logo, name, «Все товары
 * бренда · N». A tap opens the catalogue filtered by this brand.
 */
export function BrandPlaque({ guid, name }: { guid: string | null | undefined; name: string }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const logo = brandLogo(name);
  const [count, setCount] = useState<number | null>(guid ? counts.get(guid) ?? null : null);

  useEffect(() => {
    if (!guid || counts.has(guid)) return;
    let alive = true;
    api
      .catalog({ page: 1, brandGuids: [guid], sort: "popularity" })
      .then((r) => {
        counts.set(guid, r.total);
        if (alive) setCount(r.total);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [guid]);

  if (!guid) {
    return (
      <Text style={[styles.plain, { color: VIOLET }]} numberOfLines={1}>
        {name.toUpperCase()}
      </Text>
    );
  }

  const open = () => {
    tap();
    useCatalog.getState().set({ brandGuids: [guid], categoryGuid: null, search: "", typeLabel: null, quick: [] });
    router.navigate("/catalog");
  };

  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`Все товары бренда ${name}`}
      style={({ pressed }) => [styles.box, { borderColor: dark ? "#43295A" : "#E4E2EC", backgroundColor: c.cell, opacity: pressed ? 0.7 : 1 }]}
    >
      {logo ? (
        <View style={styles.logoBox}>
          <Image source={{ uri: logo }} style={styles.logo} contentFit="contain" />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: c.label, fontWeight: "700", fontSize: 16 }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ color: c.secondary, fontSize: 13 }} numberOfLines={1}>
          Все товары бренда{count != null ? ` · ${count}` : ""}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={VIOLET} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  logoBox: { width: 52, height: 36, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logo: { width: 48, height: 32 },
  plain: { fontSize: 15, letterSpacing: 0.4, marginBottom: 4 },
});

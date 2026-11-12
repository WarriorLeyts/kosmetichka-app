import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { promoLeft, useLivePromo } from "@/promo";
import { useCatalog } from "@/store/catalog";
import { openSiteLink } from "@/components/home/HomeBlocks";

/** The promotion strip (admin panel → Акция): its text, the time left, a tap opens its link. */
export function PromoStrip({ rounded = false }: { rounded?: boolean }) {
  const promo = useLivePromo();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const strip = promo?.strip;
  if (!promo || !strip) return null;
  const left = strip.countdown ? promoLeft(promo, now) : null;
  const open = () =>
    openSiteLink(strip.link, (patch) => {
      useCatalog.getState().reset();
      useCatalog.getState().set(patch);
      router.navigate("/catalog");
    });
  return (
    <Pressable
      onPress={strip.link ? open : undefined}
      disabled={!strip.link}
      accessibilityRole={strip.link ? "link" : "text"}
      style={({ pressed }) => [
        { backgroundColor: promo.accent, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
        rounded && { borderRadius: 14 },
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700", textAlign: "center" }} numberOfLines={2}>
        {strip.text}
        {left ? <Text style={{ fontWeight: "500", opacity: 0.9 }}>{`  ·  ${left}`}</Text> : null}
      </Text>
    </Pressable>
  );
}

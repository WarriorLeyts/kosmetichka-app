import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ean13Modules, runs } from "../ean13";
import type { LoyaltyCard as Card } from "../loyalty";
import { useIOS } from "../ios";
import { tap } from "./ui";

const BANNER = require("../../assets/card-banner.png");
const LOGO = require("../../assets/card-logo.png");
const VIOLET = "#8b3dff";

// geometry of the real card (measured on the 232 × 322 original); k = width / 232
const CARD_W = 232;
const CARD_H = 322;
const COLLAPSED_H = 176; // header + picture + cashback / bonuses

function Barcode({ code, width, height }: { code: string; width: number; height: number }) {
  const mods = ean13Modules(code);
  if (!mods) return <Text style={{ color: "#000" }}>{code}</Text>;
  return (
    <View style={{ flexDirection: "row", width, height }} accessible accessibilityLabel={`Штрихкод ${code}`}>
      {runs(mods).map(([bar, w], i) => (
        <View key={i} style={{ flex: w, backgroundColor: bar ? "#000" : "#fff" }} />
      ))}
    </View>
  );
}

/** «Моя карта» — exact copy of the loyalty card; «Показать штрихкод» opens it with an animation. */
export function LoyaltyCardPanel({ card, width }: { card: Card; width: number }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [open, setOpen] = useState(false);
  const [reduce, setReduce] = useState(false);
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  const toggle = () => {
    tap();
    const to = open ? 0 : 1;
    setOpen(!open);
    if (reduce) {
      p.setValue(to);
      return;
    }
    if (to === 1) Animated.spring(p, { toValue: 1, useNativeDriver: false, damping: 16, stiffness: 120, mass: 0.9 }).start();
    else Animated.timing(p, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };

  const k = width / CARD_W;
  const height = p.interpolate({ inputRange: [0, 1], outputRange: [COLLAPSED_H * k, CARD_H * k] });
  const barOpacity = p.interpolate({ inputRange: [0.35, 1], outputRange: [0, 1], extrapolate: "clamp" });
  const barShift = p.interpolate({ inputRange: [0, 1], outputRange: [28 * k, 0] });
  const barScale = p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const chevron = p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] });
  const shine = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-width, width * 0.2, width * 1.6] });

  return (
    <View style={[styles.panel, { backgroundColor: c.cell }, !dark && styles.shadow]}>
      <Text style={[styles.title, { color: c.label }]}>Моя карта</Text>

      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={open ? "Скрыть штрихкод" : "Показать штрихкод"}>
        <Animated.View style={[styles.card, { width, height, borderRadius: 9 * k }]}>
          <LinearGradient colors={["#024697", "#004290"]} style={StyleSheet.absoluteFill} />

          {/* header: logo, name, level */}
          <View style={{ height: 41 * k, flexDirection: "row", alignItems: "center", paddingHorizontal: 9 * k }}>
            <Image source={LOGO} style={{ width: 36 * k, height: 33 * k, marginLeft: -2 * k }} contentFit="contain" />
            <Text style={[styles.brand, { fontSize: 13.5 * k, marginLeft: 4 * k }]}>КОСМЕТИЧКА</Text>
            <View style={{ flex: 1 }} />
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.small, { fontSize: 7 * k }]}>{card.level}</Text>
              <Text style={[styles.value, { fontSize: 11.5 * k, lineHeight: 13 * k }]}>{card.name}</Text>
            </View>
          </View>

          {/* picture */}
          <Image source={BANNER} style={{ width, height: 90 * k }} contentFit="cover" />

          {/* cashback / bonuses */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10 * k, marginTop: 6 * k }}>
            <View>
              <Text style={[styles.small, { fontSize: 7 * k }]}>КЕШБЭК</Text>
              <Text style={[styles.value, { fontSize: 12.5 * k, marginTop: 1 * k }]}>{card.cashback}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.small, { fontSize: 7 * k }]}>БОНУСЫ</Text>
              <Text style={[styles.value, { fontSize: 12.5 * k, marginTop: 1 * k }]}>{card.bonuses}</Text>
            </View>
          </View>

          {/* barcode, revealed by the animation */}
          <Animated.View
            style={[
              styles.barBox,
              {
                top: 244 * k,
                left: 34 * k,
                width: 165 * k,
                height: 58 * k,
                borderRadius: 3 * k,
                opacity: barOpacity,
                transform: [{ translateY: barShift }, { scale: barScale }],
              },
            ]}
          >
            <Barcode code={card.barcode} width={128 * k} height={34 * k} />
            <Text style={{ color: "#111", fontSize: 8.5 * k, marginTop: 3 * k, letterSpacing: 0.3 * k }}>{card.barcode}</Text>
          </Animated.View>

          {/* light sweep across the card while it opens */}
          {!reduce ? (
            <Animated.View style={[{ pointerEvents: "none" }, styles.shine, { width: width * 0.45, transform: [{ translateX: shine }, { rotate: "18deg" }] }]}>
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      </Pressable>

      <Pressable onPress={toggle} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]} accessibilityRole="button">
        <View style={[styles.rowIcon, { backgroundColor: "rgba(139,61,255,0.1)" }]}>
          <Ionicons name="barcode-outline" size={21} color={VIOLET} />
        </View>
        <Text style={styles.rowText}>{open ? "Скрыть штрихкод" : "Показать штрихкод"}</Text>
        <Animated.View style={{ transform: [{ rotate: chevron }] }}>
          <Ionicons name="chevron-forward" size={19} color={VIOLET} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 20, padding: 14, marginBottom: 16 },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.07)" },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 10, marginLeft: 2 },
  card: { overflow: "hidden", alignSelf: "center", boxShadow: "0 8px 22px rgba(10,70,142,0.35)" },
  brand: { color: "#fff", fontWeight: "700", letterSpacing: 0.2 },
  small: { color: "#fff", fontWeight: "700", letterSpacing: 0.2 },
  value: { color: "#fff", fontWeight: "400" },
  barBox: { position: "absolute", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  shine: { position: "absolute", top: -40, bottom: -40 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, minHeight: 44 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, color: VIOLET, fontSize: 17 },
});

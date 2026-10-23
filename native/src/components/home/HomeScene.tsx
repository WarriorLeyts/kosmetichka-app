import { useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useReduceMotion } from "../../useReduceMotion";
import { GradientText } from "../GradientText";
import { tap } from "../ui";
import { useIOS } from "../../ios";

/*
 * Home scene exactly as on the three mockups: the art of each stage is taken from the mockups
 * (flat box + products → products dropping into the open box → closed box), the texts, button,
 * hint and progress dots are real components. Everything follows the scroll position
 * (native-driver interpolations): stopping stops the scene, scrolling back plays it backwards.
 */

const ART = [
  { src: require("../../../assets/home2/stage1.png"), ratio: 1194 / 1050 },
  { src: require("../../../assets/home2/stage2.png"), ratio: 1194 / 1103 },
  { src: require("../../../assets/home2/stage3.png"), ratio: 1194 / 546 },
];

const TEXTS: { a: string; b: string; bColors: readonly [string, string, ...string[]]; sub: string }[] = [
  { a: "Всё для вашей", b: "красоты", bColors: ["#6a2bf0", "#b62ee6", "#f0388f"], sub: "Косметика и парфюмерия\nдля себя и бизнеса" },
  { a: "Собираем", b: "ваш заказ", bColors: ["#d81fa8", "#f0388f"], sub: "Любимые средства — вместе.\nКаждая деталь с заботой." },
  { a: "Выбирайте", b: "любимое", bColors: ["#6a2bf0", "#b62ee6", "#f0388f"], sub: "Для себя, в подарок\nи для вашего бизнеса" },
];

const BG = "#FAF9FD"; // page background = the mockups' background

function num(p: Animated.AnimatedInterpolation<number> | Animated.Value, input: number[], out: number[]) {
  return p.interpolate({ inputRange: input, outputRange: out, extrapolate: "clamp" });
}

export function HomeScene({
  scrollY, sectionTop, topInset, bottomSpace, onCatalog,
}: { scrollY: Animated.Value; sectionTop: number | null; topInset: number; bottomSpace: number; onCatalog: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReduceMotion();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const viewH = Math.max(600, H - topInset - bottomSpace);
  const RANGE = Math.round(H * 1.5);
  const pinned = !reduce && sectionTop !== null;

  const still = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const p = useMemo(() => {
    if (!pinned) return still;
    const start = (sectionTop ?? 0) - topInset;
    return scrollY.interpolate({ inputRange: [start, start + RANGE], outputRange: [0, 1], extrapolate: "clamp" });
  }, [pinned, sectionTop, topInset, RANGE, scrollY, still]);
  const pin = useMemo(() => {
    if (!pinned) return 0;
    const start = (sectionTop ?? 0) - topInset;
    return scrollY.interpolate({ inputRange: [start, start + RANGE], outputRange: [0, RANGE], extrapolate: "clamp" });
  }, [pinned, sectionTop, topInset, RANGE, scrollY]);

  // stage visibility: 1 → 2 at ~0.33, 2 → 3 at ~0.7; the closed box then gets a bit smaller and moves up
  const vis = [num(p, [0, 0.24, 0.36], [1, 1, 0]), num(p, [0.24, 0.36, 0.62, 0.74], [0, 1, 1, 0]), num(p, [0.62, 0.74], [0, 1])];
  const textShift = [num(p, [0.24, 0.36], [0, -12]), num(p, [0.24, 0.36, 0.62, 0.74], [12, 0, 0, -12]), num(p, [0.62, 0.74], [12, 0])];
  // the art: stage 1 sinks slightly, stage 2 settles, stage 3 (closed box) shrinks a little at the end
  const artMove = [
    { transform: [{ translateY: num(p, [0, 0.36], [0, 18]) }, { scale: num(p, [0, 0.36], [1, 0.96]) }] },
    { transform: [{ translateY: num(p, [0.24, 0.36, 0.62, 0.74], [-18, 0, 0, 10]) }, { scale: num(p, [0.24, 0.36, 0.62, 0.74], [1.04, 1, 1, 0.95]) }] },
    { transform: [{ translateY: num(p, [0.62, 0.74, 0.9, 1], [-10, 0, 0, -viewH * 0.03]) }, { scale: num(p, [0.62, 0.74, 0.9, 1], [1.05, 1, 1, 0.9]) }] },
  ];
  const hint = num(p, [0, 0.05], [1, 0]);
  const dots = num(p, [0.03, 0.08], [0, 1]);
  const dot = (i: number) =>
    num(p, i === 0 ? [0, 0.3, 0.36] : i === 1 ? [0.3, 0.36, 0.68, 0.74] : [0.68, 0.74, 1], i === 0 ? [1, 1, 0.3] : i === 1 ? [0.3, 1, 1, 0.3] : [0.3, 1, 1]);

  const textH = 170;
  const bottomH = 104;
  const artAreaH = viewH - textH - bottomH;

  return (
    <View style={{ height: pinned ? viewH + RANGE : viewH, backgroundColor: dark ? "#000" : BG }}>
      <Animated.View style={{ height: viewH, overflow: "hidden", transform: [{ translateY: pin as never }] }}>
        {/* titles of the three stages */}
        <View style={{ height: textH }}>
          {TEXTS.map((t, i) => (
            <Animated.View
              key={i}
              style={[StyleSheet.absoluteFill, styles.textBox, { opacity: reduce ? (i === 2 ? 1 : 0) : vis[i], transform: [{ translateY: textShift[i] }] }]}
            >
              <Text style={[styles.h1, { color: dark ? "#fff" : "#170f33" }]} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
                {t.a}
              </Text>
              <GradientText style={styles.h1} colors={t.bColors}>
                {t.b}
              </GradientText>
              <Text style={[styles.sub, { color: dark ? "#C7C7D1" : "#5b5d78" }]}>{t.sub}</Text>
            </Animated.View>
          ))}
        </View>

        {/* art of the three stages (from the mockups) */}
        <View style={{ height: artAreaH }}>
          {ART.map((a, i) => (
            <Animated.View
              key={i}
              style={[StyleSheet.absoluteFill, styles.artBox, { pointerEvents: "none", opacity: reduce ? (i === 2 ? 1 : 0) : vis[i] }, artMove[i]]}
            >
              <Image source={a.src} style={{ width: Math.min(W, artAreaH * a.ratio), aspectRatio: a.ratio, maxHeight: artAreaH }} contentFit="contain" />
            </Animated.View>
          ))}
        </View>

        {/* catalog is always one tap away */}
        <View style={[styles.bottom, { height: bottomH }]}>
          <Pressable
            onPress={() => {
              tap();
              onCatalog();
            }}
            accessibilityRole="button"
            accessibilityLabel="Перейти в каталог"
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient colors={["#6a2bf0", "#b62ee6", "#f0388f"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              <Text style={styles.ctaText}>Перейти в каталог</Text>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </LinearGradient>
          </Pressable>
          {pinned ? (
            <View style={styles.under}>
              <Animated.View style={[styles.hintRow, { opacity: hint }]}>
                <Ionicons name="chevron-down" size={18} color="#6b6f8a" />
                <Text style={styles.hint}>Листайте — соберём ваш заказ</Text>
              </Animated.View>
              <Animated.View style={[styles.dots, { opacity: dots }]}>
                {[0, 1, 2].map((i) => (
                  <Animated.View key={i} style={[styles.dot, { opacity: dot(i) }]} />
                ))}
              </Animated.View>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  textBox: { paddingHorizontal: 22, paddingTop: 14 },
  h1: { fontSize: 44, lineHeight: 50, fontWeight: "800", letterSpacing: -0.8 },
  sub: { fontSize: 19, lineHeight: 25, marginTop: 6 },
  artBox: { alignItems: "center", justifyContent: "center" },
  bottom: { paddingHorizontal: 36, paddingTop: 6 },
  cta: { height: 60, borderRadius: 30, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 12px 26px rgba(160,40,230,0.32)" },
  ctaText: { color: "#fff", fontSize: 20, fontWeight: "600" },
  under: { height: 30, alignItems: "center", justifyContent: "center", marginTop: 8 },
  hintRow: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 10 },
  hint: { color: "#6b6f8a", fontSize: 16 },
  dots: { position: "absolute", flexDirection: "row", gap: 6 },
  dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: "#8b2be0" },
});

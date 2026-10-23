import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useReduceMotion } from "../../useReduceMotion";
import { GradientText } from "../GradientText";
import { tap } from "../ui";
import { useIOS } from "../../ios";
import { BoxFlaps } from "./BoxFlaps";

/*
 * Home scene assembled from layers: the same box (flat → open, one colour, our white heart logo)
 * and the same four products in every stage. The products stand over the flat box, hover over the
 * open box and drop in one by one behind its front wall, then the flaps close the box where it
 * stands and the tape appears.
 * The scene plays by itself like a video and stops on the closed box; it plays again each time
 * the home tab is opened again or the app comes back.
 */

// all coordinates are in the mockup's pixels (853 wide); the frame covers y 630…1395 of it
const FW = 853;
const FY = 630;
const FH = 765;
const CLIP = 1335; // products are clipped here (hidden behind the box's front wall anyway)

const BOX = {
  flat: { src: require("../../../assets/home2/box-flat.png"), x: 0, y: 1056, w: 853, h: 306 },
  // the open box without its flaps (the flaps are drawn by BoxFlaps and close the box in place)
  body: { src: require("../../../assets/home2/box-body.png"), x: 0, y: 845, w: 853, h: 541 },
  // only the outer front and side walls — products sink behind them
  front: { src: require("../../../assets/home2/box-body-front.png"), x: 0, y: 845, w: 853, h: 541 },
};

type Pose = { cx: number; cy: number; r: number; k: number };
const PRODUCTS: { src: number; w: number; h: number; a: Pose; b: Pose; c: Pose; drop: [number, number] }[] = [
  // a = over the flat box, b = hovering over the open box, c = inside the box
  { src: require("../../../assets/home/tube.png"), w: 175, h: 366, a: { cx: 514, cy: 865, r: 0, k: 1 }, b: { cx: 478, cy: 930, r: 14, k: 0.85 }, c: { cx: 455, cy: 1270, r: 6, k: 0.8 }, drop: [0.36, 0.44] },
  { src: require("../../../assets/home/perfume.png"), w: 222, h: 331, a: { cx: 208, cy: 875, r: 0, k: 1 }, b: { cx: 290, cy: 800, r: -12, k: 0.85 }, c: { cx: 330, cy: 1260, r: -4, k: 0.8 }, drop: [0.42, 0.5] },
  { src: require("../../../assets/home/jar.png"), w: 285, h: 267, a: { cx: 689, cy: 928, r: 0, k: 1 }, b: { cx: 640, cy: 815, r: 12, k: 0.8 }, c: { cx: 560, cy: 1250, r: 4, k: 0.72 }, drop: [0.48, 0.56] },
  { src: require("../../../assets/home/lipstick.png"), w: 93, h: 285, a: { cx: 368, cy: 910, r: 0, k: 1 }, b: { cx: 515, cy: 790, r: 24, k: 0.8 }, c: { cx: 500, cy: 1250, r: 10, k: 0.8 }, drop: [0.54, 0.62] },
];

const TEXTS: { a: string; b: string; bColors: readonly [string, string, ...string[]]; sub: string }[] = [
  { a: "Всё для вашей", b: "красоты", bColors: ["#6a2bf0", "#b62ee6", "#f0388f"], sub: "Косметика и парфюмерия для себя и бизнеса" },
  { a: "Собираем", b: "ваш заказ", bColors: ["#d81fa8", "#f0388f"], sub: "Любимые средства — вместе. Каждая деталь с заботой" },
  { a: "Выбирайте", b: "любимое", bColors: ["#6a2bf0", "#b62ee6", "#f0388f"], sub: "Для себя, в подарок и для вашего бизнеса" },
];


function num(p: Animated.AnimatedInterpolation<number> | Animated.Value, input: number[], out: number[]) {
  return p.interpolate({ inputRange: input, outputRange: out, extrapolate: "clamp" });
}

export function HomeScene({
  topInset, bottomSpace, onCatalog,
}: { scrollY?: Animated.Value; sectionTop?: number | null; topInset: number; bottomSpace: number; onCatalog: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReduceMotion();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const viewH = Math.max(600, H - topInset - bottomSpace);

  // progress of the «video»: 0 = flat box, ~0.5 = products dropping in, 1 = closed box
  const p = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  // closing of the flaps (0 = open, 1 = closed with tape) — drawn with SVG, so JS-driven
  const cl = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const [closeT, setCloseT] = useState(reduce ? 1 : 0);
  useEffect(() => {
    const id = cl.addListener(({ value }) => setCloseT((v) => (Math.abs(v - value) > 0.004 || value === 0 || value === 1 ? value : v)));
    return () => cl.removeListener(id);
  }, [cl]);

  const play = useCallback(() => {
    anim.current?.stop();
    if (reduce) {
      p.setValue(1);
      cl.setValue(1);
      return;
    }
    p.setValue(0);
    cl.setValue(0);
    const step = (to: number, duration: number, easing = Easing.inOut(Easing.cubic)) =>
      Animated.timing(p, { toValue: to, duration, easing, useNativeDriver: true });
    anim.current = Animated.sequence([
      step(0.24, 1600, Easing.linear), // look at the flat box with products
      step(0.36, 1500), // → open box
      step(0.62, 2800, Easing.linear), // products dropping in one by one
      Animated.timing(cl, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: false }), // flaps close, tape
      step(0.74, 700), // last title; the closed box stays where it is
    ]);
    anim.current.start();
  }, [p, cl, reduce]);

  // play every time the home tab becomes active (coming from another section or opening the app);
  // staying on the home page does not replay it
  useFocusEffect(
    useCallback(() => {
      play();
      return () => anim.current?.stop();
    }, [play])
  );

  // coming back to the app from the background counts as a new visit
  useEffect(() => {
    let prev = AppState.currentState;
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active" && prev !== "active") play();
      prev = st;
    });
    return () => sub.remove();
  }, [play]);

  // stage visibility: 1 → 2 at 0.24…0.36, 2 → 3 at 0.62…0.74
  const vis = [num(p, [0, 0.24, 0.36], [1, 1, 0]), num(p, [0.24, 0.36, 0.62, 0.74], [0, 1, 1, 0]), num(p, [0.62, 0.74], [0, 1])];
  const boxIn = num(p, [0.24, 0.36], [0, 1]);
  const openScale = num(p, [0.24, 0.36], [0.55, 1]); // the walls rise from the flat box
  const textShift = [num(p, [0.24, 0.36], [0, -12]), num(p, [0.24, 0.36, 0.62, 0.74], [12, 0, 0, -12]), num(p, [0.62, 0.74], [12, 0])];
  const dot = (i: number) =>
    num(p, i === 0 ? [0, 0.3, 0.36] : i === 1 ? [0.3, 0.36, 0.68, 0.74] : [0.68, 0.74, 1], i === 0 ? [1, 1, 0.3] : i === 1 ? [0.3, 1, 1, 0.3] : [0.3, 1, 1]);

  // title size: the longest title fits the screen width on one line
  const titleFont = (t: { a: string; b: string }) => {
    const fs = Math.min(40, (W - 36) / ((t.a.length + 1 + t.b.length) * 0.6));
    return { fontSize: fs, lineHeight: fs * 1.2 };
  };
  const textH = 120;
  const bottomH = 104;
  const artAreaH = viewH - textH - bottomH;
  const k = Math.min((W - 24) / FW, artAreaH / FH); // mockup px → screen px
  // flaps grow with the box walls (same bottom line as the box photo)
  const flapsStyle = { opacity: boxIn, transformOrigin: [(FW * k) / 2, (1386 - FY) * k, 0] as [number, number, number], transform: [{ scaleY: openScale }] };

  return (
    <View style={{ height: viewH, backgroundColor: dark ? "#170D25" : "transparent" }}>
      <View style={{ height: viewH, overflow: "hidden" }}>
        {/* titles of the three stages */}
        <View style={{ height: textH }}>
          {TEXTS.map((t, i) => (
            <Animated.View
              key={i}
              style={[StyleSheet.absoluteFill, styles.textBox, { opacity: vis[i], transform: [{ translateY: textShift[i] }] }]}
            >
              {/* one centred line across the whole width, no wrapping */}
              <View style={styles.titleRow} accessible accessibilityRole="header" accessibilityLabel={`${t.a} ${t.b}`}>
                <Text style={[styles.h1, titleFont(t), { color: dark ? "#fff" : "#170f33" }]} numberOfLines={1}>
                  {t.a}{" "}
                </Text>
                <GradientText style={[styles.h1, titleFont(t)]} colors={t.bColors}>
                  {t.b}
                </GradientText>
              </View>
              <Text style={[styles.sub, { color: dark ? "#C3AECF" : "#5b5d78" }]} numberOfLines={1} adjustsFontSizeToFit>
                {t.sub}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* the box and the products */}
        <View style={{ height: artAreaH, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: FW * k, height: FH * k, pointerEvents: "none" }}>
            <Layer box={BOX.flat} k={k} opacity={vis[0]} scaleY={num(p, [0.24, 0.36], [1, 1.12])} />
            {/* the open box: body, flaps and products move together and never leave their place */}
            <View style={StyleSheet.absoluteFill}>
              <Layer box={BOX.body} k={k} opacity={boxIn} scaleY={openScale} />
              <Animated.View style={[StyleSheet.absoluteFill, flapsStyle]}>
                <BoxFlaps t={closeT} layer="back" width={FW * k} height={FH * k} viewBox={`0 ${FY} ${FW} ${FH}`} />
              </Animated.View>
              <View style={{ position: "absolute", left: -40 * k, right: -40 * k, top: -200 * k, height: (CLIP - FY + 200) * k, overflow: "hidden" }}>
                {PRODUCTS.map((it, i) => {
                  const [d0, d1] = it.drop;
                  const at = (f: (q: Pose) => number) => num(p, [0.24, 0.36, d0, d1], [f(it.a), f(it.b), f(it.b), f(it.c)]);
                  return (
                    <Animated.View
                      key={i}
                      style={{
                        position: "absolute",
                        left: (it.a.cx - it.w / 2 + 40) * k,
                        top: (it.a.cy - it.h / 2 - FY + 200) * k,
                        width: it.w * k,
                        height: it.h * k,
                        opacity: num(p, [d1 - 0.01, d1], [1, 0]),
                        transform: [
                          { translateX: at((q) => (q.cx - it.a.cx) * k) },
                          { translateY: at((q) => (q.cy - it.a.cy) * k) },
                          { rotate: num(p, [0.24, 0.36, d0, d1], [it.a.r, it.b.r, it.b.r, it.c.r]).interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] }) },
                          { scale: at((q) => q.k) },
                        ],
                      }}
                    >
                      <Image source={it.src} style={{ width: "100%", height: "100%" }} contentFit="contain" cachePolicy="memory" />
                    </Animated.View>
                  );
                })}
              </View>
              <Layer box={BOX.front} k={k} opacity={boxIn} scaleY={openScale} />
              <Animated.View style={[StyleSheet.absoluteFill, flapsStyle]}>
                <BoxFlaps t={closeT} layer="front" width={FW * k} height={FH * k} viewBox={`0 ${FY} ${FW} ${FH}`} />
              </Animated.View>
            </View>
          </View>
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
          <View style={styles.under}>
            <View style={styles.dots}>
              {[0, 1, 2].map((i) => (
                <Animated.View key={i} style={[styles.dot, { opacity: dot(i) }]} />
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function Layer({
  box, k, opacity, scaleY,
}: { box: { src: number; x: number; y: number; w: number; h: number }; k: number; opacity?: Animated.AnimatedInterpolation<number>; scaleY?: Animated.AnimatedInterpolation<number> }) {
  return (
    <Animated.View
      style={{
        position: "absolute", left: box.x * k, top: (box.y - FY) * k, width: box.w * k, height: box.h * k, opacity: opacity ?? 1,
        transformOrigin: "bottom", transform: scaleY ? [{ scaleY }] : [],
      }}
    >
      <Image source={box.src} style={{ width: "100%", height: "100%" }} contentFit="fill" cachePolicy="memory" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  textBox: { paddingHorizontal: 18, paddingTop: 18, alignItems: "center" },
  titleRow: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end" },
  h1: { fontSize: 44, lineHeight: 50, fontWeight: "800", letterSpacing: -0.8 },
  sub: { fontSize: 17, lineHeight: 23, marginTop: 8, textAlign: "center", alignSelf: "stretch" },
  bottom: { paddingHorizontal: 36, paddingTop: 6 },
  cta: { height: 60, borderRadius: 30, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 12px 26px rgba(160,40,230,0.32)" },
  ctaText: { color: "#fff", fontSize: 20, fontWeight: "600" },
  under: { height: 30, alignItems: "center", justifyContent: "center", marginTop: 8 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: "#8b2be0" },
});

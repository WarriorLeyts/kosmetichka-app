import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useReduceMotion } from "../../useReduceMotion";
import { tap } from "../ui";
import { useIOS } from "../../ios";

/*
 * Home scene: a flat box die-cut folds into a 3D box, the products drop in, the flaps close,
 * the tape appears and the box moves up — everything is driven by the scroll position
 * (native-driver interpolations, so stopping the scroll stops the scene and scrolling back reverses it).
 *
 * Each wall / flap is its own plane with its own fold axis (hinge) and two faces (inside / outside,
 * backface hidden), so the 3D geometry stays consistent in every state.
 */

const P = 1100; // camera perspective
const TILT = 56; // camera looks down at the box (deg)

const PRODUCTS = [
  { src: require("../../../assets/home/perfume.png"), ratio: 437 / 600, h: 1.0, x: -0.37, endX: -0.26, rot: -8 },
  { src: require("../../../assets/home/lipstick.png"), ratio: 185 / 600, h: 0.92, x: -0.12, endX: -0.04, rot: 10 },
  { src: require("../../../assets/home/tube.png"), ratio: 265 / 600, h: 1.08, x: 0.1, endX: 0.14, rot: -6 },
  { src: require("../../../assets/home/jar.png"), ratio: 600 / 504, h: 0.62, x: 0.36, endX: 0.3, rot: 7 },
];

const TEXTS = [
  { a: "Всё для вашей", b: "красоты", sub: "Косметика и парфюмерия для себя и бизнеса" },
  { a: "Собираем", b: "ваш заказ", sub: "Любимые средства — вместе. Каждая деталь с заботой" },
  { a: "Выбирайте", b: "любимое", sub: "Для себя, в подарок и для вашего бизнеса" },
];

function deg(p: Animated.AnimatedInterpolation<number> | Animated.Value, input: number[], out: number[]) {
  return p.interpolate({ inputRange: input, outputRange: out.map((d) => `${d}deg`), extrapolate: "clamp" });
}
function num(p: Animated.AnimatedInterpolation<number> | Animated.Value, input: number[], out: number[]) {
  return p.interpolate({ inputRange: input, outputRange: out, extrapolate: "clamp" });
}

/** Box print: violet with pink shapes (outside) / soft pink-lilac (inside). */
function Face({ w, h, outside, logo, children }: { w: number; h: number; outside?: boolean; logo?: boolean; children?: ReactNode }) {
  return (
    <View style={{ width: w, height: h, overflow: "hidden", borderRadius: 3 }}>
      {outside ? (
        <>
          <LinearGradient colors={["#6d22d6", "#5a17c2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[styles.blob, { width: h * 1.4, height: h * 1.4, borderRadius: h * 0.7, left: -h * 0.6, bottom: -h * 0.8 }]} />
          <View style={[styles.blob, { width: h * 1.1, height: h * 1.1, borderRadius: h * 0.55, right: -h * 0.45, top: -h * 0.5 }]} />
        </>
      ) : (
        <LinearGradient colors={["#c75bd8", "#9c4ee6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
      {logo ? (
        <View style={styles.logoWrap}>
          <Text style={[styles.logoText, { fontSize: Math.max(9, h * 0.16) }]}>КОСМЕТИЧКА</Text>
          <Ionicons name="heart" size={Math.max(9, h * 0.16)} color="#ff6fbf" />
        </View>
      ) : null}
      {/* cardboard edge */}
      <View style={[StyleSheet.absoluteFill, { borderWidth: 1.5, borderColor: outside ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.35)", borderRadius: 3 }]} />
      {children}
    </View>
  );
}

/** One plane = two faces with the same transform chain (the outside one flipped), backfaces hidden. */
function Plane({
  w, h, chain, inner, outer,
}: { w: number; h: number; chain: object[]; inner: ReactNode; outer: ReactNode }) {
  const pos = { position: "absolute" as const, left: -w / 2, top: -h / 2, width: w, height: h, backfaceVisibility: "hidden" as const };
  return (
    <>
      <Animated.View style={[pos, { transform: chain as never }]}>{inner}</Animated.View>
      <Animated.View style={[pos, { transform: [...chain, { rotateY: "180deg" }] as never }]}>{outer}</Animated.View>
    </>
  );
}

export function HomeScene({
  scrollY, sectionTop, topInset, bottomSpace, onCatalog,
}: { scrollY: Animated.Value; sectionTop: number | null; topInset: number; bottomSpace: number; onCatalog: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduce = useReduceMotion();
  const c = useIOS();
  const viewH = Math.max(560, H - topInset - bottomSpace);
  const RANGE = Math.round(H * 1.7);
  const pinned = !reduce && sectionTop !== null;

  // geometry of the box
  const BW = Math.min(W * 0.58, 270);
  const BD = BW * 0.62;
  const WH = BW * 0.42;
  const FL = BD / 2; // front/back flap length
  const SL = BW / 2; // side flap length

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

  // draw order of the closing flaps: under the products while open, over them once they close
  const [closing, setClosing] = useState(reduce);
  useEffect(() => {
    if (!pinned) {
      setClosing(true);
      return;
    }
    const start = (sectionTop ?? 0) - topInset;
    const id = scrollY.addListener(({ value }) => {
      const v = (value - start) / RANGE > 0.7;
      setClosing((c) => (c === v ? c : v));
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, pinned, sectionTop, topInset, RANGE]);

  const base = [{ perspective: P }, { rotateX: `${TILT}deg` }];
  const fFront = deg(p, [0.18, 0.34], [0, 90]);
  const fBack = deg(p, [0.1, 0.26], [0, -90]);
  const fLeft = deg(p, [0.14, 0.3], [0, 90]);
  const fRight = deg(p, [0.14, 0.3], [0, -90]);
  // flaps: flat → leaning outward when the walls stand → closed
  const flapF = deg(p, [0, 0.2, 0.34, 0.74, 0.84], [0, 0, -35, -35, 90]);
  const flapB = deg(p, [0, 0.12, 0.26, 0.74, 0.84], [0, 0, 35, 35, -90]);
  const flapL = deg(p, [0, 0.16, 0.3, 0.7, 0.8], [0, 0, -35, -35, 90]);
  const flapR = deg(p, [0, 0.16, 0.3, 0.7, 0.8], [0, 0, 35, 35, -90]);
  const tape = num(p, [0.84, 0.9], [0, 1]);

  const chainFront = [...base, { translateY: BD / 2 }, { rotateX: fFront }, { translateY: WH / 2 }];
  const chainBack = [...base, { translateY: -BD / 2 }, { rotateX: fBack }, { translateY: -WH / 2 }];
  const chainLeft = [...base, { translateX: -BW / 2 }, { rotateY: fLeft }, { translateX: -WH / 2 }];
  const chainRight = [...base, { translateX: BW / 2 }, { rotateY: fRight }, { translateX: WH / 2 }];
  const chainFlapF = [...chainFront, { translateY: WH / 2 }, { rotateX: flapF }, { translateY: FL / 2 }];
  const chainFlapB = [...chainBack, { translateY: -WH / 2 }, { rotateX: flapB }, { translateY: -FL / 2 }];
  const chainFlapL = [...chainLeft, { translateX: -WH / 2 }, { rotateY: flapL }, { translateX: -SL / 2 }];
  const chainFlapR = [...chainRight, { translateX: WH / 2 }, { rotateY: flapR }, { translateX: SL / 2 }];

  const inner = (w: number, h: number) => <Face w={w} h={h} />;
  const tapeStrip = (w: number, h: number) => (
    <Animated.View style={{ position: "absolute", left: w / 2 - w * 0.09, width: w * 0.18, top: 0, bottom: 0, backgroundColor: "#ff4fa8", transform: [{ scaleY: tape }] }} />
  );

  const wallsBack = (
    <>
      <Plane w={BW} h={WH} chain={chainBack} inner={inner(BW, WH)} outer={<Face w={BW} h={WH} outside />} />
      <Plane w={WH} h={BD} chain={chainLeft} inner={inner(WH, BD)} outer={<Face w={WH} h={BD} outside />} />
      <Plane w={WH} h={BD} chain={chainRight} inner={inner(WH, BD)} outer={<Face w={WH} h={BD} outside />} />
    </>
  );
  const flaps = (
    <>
      <Plane w={SL} h={BD} chain={chainFlapL} inner={inner(SL, BD)} outer={<Face w={SL} h={BD} outside />} />
      <Plane w={SL} h={BD} chain={chainFlapR} inner={inner(SL, BD)} outer={<Face w={SL} h={BD} outside />} />
      <Plane w={BW} h={FL} chain={chainFlapB} inner={inner(BW, FL)} outer={<Face w={BW} h={FL} outside>{tapeStrip(BW, FL)}</Face>} />
      <Plane w={BW} h={FL} chain={chainFlapF} inner={inner(BW, FL)} outer={<Face w={BW} h={FL} outside>{tapeStrip(BW, FL)}</Face>} />
    </>
  );

  // products: standing over the flat box → dropping in one after another
  const products = PRODUCTS.map((pr, i) => {
    const t0 = 0.38 + i * 0.075;
    const t1 = t0 + 0.12;
    const ph = BW * 0.5 * pr.h;
    const pw = ph * pr.ratio;
    const startY = -BD * 0.18 - ph / 2;
    const endY = WH * 0.25 - ph * 0.32;
    return (
      <Animated.View
        key={i}
        style={{
          position: "absolute",
          left: -pw / 2,
          top: -ph / 2,
          width: pw,
          height: ph,
          transform: [
            { translateX: num(p, [0, t0, t1], [pr.x * BW, pr.x * BW, pr.endX * BW]) },
            { translateY: num(p, [0, t0, t0 + 0.03, t1], [startY, startY, startY - 14, endY]) },
            { rotate: deg(p, [t0, (t0 + t1) / 2, t1], [0, pr.rot, pr.rot * 0.4]) },
            { scale: num(p, [t0, t1], [1, 0.78]) },
          ],
        }}
      >
        <Image source={pr.src} style={{ width: "100%", height: "100%" }} contentFit="contain" />
      </Animated.View>
    );
  });

  const boxScale = num(p, [0.9, 1], [1, 0.82]);
  const boxUp = num(p, [0.9, 1], [0, -viewH * 0.04]);
  const textOpacity = [num(p, [0, 0.24, 0.3], [1, 1, 0]), num(p, [0.28, 0.34, 0.8, 0.86], [0, 1, 1, 0]), num(p, [0.86, 0.92], [0, 1])];
  const textShift = [num(p, [0.24, 0.3], [0, -10]), num(p, [0.28, 0.34], [10, 0]), num(p, [0.86, 0.92], [10, 0])];
  const hint = num(p, [0, 0.06], [1, 0]);
  const dot = (i: number) => num(p, i === 0 ? [0, 0.28, 0.34] : i === 1 ? [0.28, 0.34, 0.8, 0.86] : [0.8, 0.86, 1], i === 0 ? [1, 1, 0.3] : i === 1 ? [0.3, 1, 1, 0.3] : [0.3, 1, 1]);

  const cx = W / 2;
  const cy = viewH * 0.56;

  return (
    <View style={{ height: pinned ? viewH + RANGE : viewH }}>
      <Animated.View style={{ height: viewH, overflow: "hidden", transform: [{ translateY: pin as never }] }}>
        {/* soft translucent violet-pink shapes */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[styles.bg, { width: W * 1.2, height: W * 1.2, borderRadius: W * 0.6, right: -W * 0.55, top: viewH * 0.18, backgroundColor: "rgba(232,44,135,0.07)" }]} />
          <View style={[styles.bg, { width: W, height: W, borderRadius: W * 0.5, left: -W * 0.5, top: viewH * 0.42, backgroundColor: "rgba(139,61,255,0.07)" }]} />
        </View>

        {/* texts of the three stages */}
        <View style={{ height: viewH * 0.3, paddingHorizontal: 20, paddingTop: 18 }}>
          {TEXTS.map((t, i) => (
            <Animated.View key={i} style={[StyleSheet.absoluteFill, { paddingHorizontal: 20, paddingTop: 18, opacity: textOpacity[i], transform: [{ translateY: textShift[i] }] }]}>
              <Text style={[styles.h1, { color: c.label }]} accessibilityRole="header">
                {t.a}
              </Text>
              <Text style={[styles.h1, { color: i === 1 ? "#e82c87" : "#8b2be0" }]}>{t.b}</Text>
              <Text style={[styles.sub, { color: c.secondary }]}>{t.sub}</Text>
            </Animated.View>
          ))}
        </View>

        {/* the box + products */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: boxUp }, { scale: boxScale }] }]}>
          <View style={{ position: "absolute", left: cx, top: cy }}>
            <Animated.View style={{ position: "absolute", left: -BW / 2, top: -BD / 2, width: BW, height: BD, transform: base as never }}>
              <Face w={BW} h={BD} logo />
            </Animated.View>
            {wallsBack}
            {!closing ? flaps : null}
            {products}
            <Plane w={BW} h={WH} chain={chainFront} inner={inner(BW, WH)} outer={<Face w={BW} h={WH} outside logo />} />
            {closing ? flaps : null}
          </View>
        </Animated.View>

        {/* catalog is always one tap away */}
        <View style={styles.bottom}>
          <Pressable
            onPress={() => {
              tap();
              onCatalog();
            }}
            accessibilityRole="button"
            accessibilityLabel="Перейти в каталог"
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient colors={["#7a1ee8", "#c21ad0", "#f0388f"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              <Text style={styles.ctaText}>Перейти в каталог</Text>
              <Ionicons name="arrow-forward" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
          {pinned ? (
            <View style={{ height: 26, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
              <Animated.View style={[styles.hintRow, { opacity: hint }]}>
                <Ionicons name="chevron-down" size={16} color="#6b6f8a" />
                <Text style={styles.hint}>Листайте — соберём ваш заказ</Text>
              </Animated.View>
              <Animated.View style={[styles.dots, { opacity: num(p, [0.04, 0.08], [0, 1]) }]}>
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
  bg: { position: "absolute" },
  blob: { position: "absolute", backgroundColor: "#e83e9c" },
  logoWrap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3 },
  logoText: { color: "#fff", fontWeight: "600", letterSpacing: 1.5 },
  h1: { fontSize: 38, lineHeight: 42, fontWeight: "800", color: "#16122e", letterSpacing: -0.5 },
  sub: { fontSize: 17, lineHeight: 23, color: "#5d6078", marginTop: 8, maxWidth: 320 },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 10, paddingHorizontal: 40, alignItems: "stretch" },
  cta: { height: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 10px 24px rgba(160,30,220,0.3)" },
  ctaText: { color: "#fff", fontSize: 19, fontWeight: "600" },
  hintRow: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 8 },
  hint: { color: "#6b6f8a", fontSize: 15 },
  dots: { position: "absolute", flexDirection: "row", gap: 6 },
  dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: "#8b2be0" },
});

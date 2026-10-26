import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";
import { getSplashTarget } from "../splashTarget";

/**
 * Launch animation (every cold start): the logo draws itself with a white line, «КОСМЕТИЧКА» appears
 * letter by letter, then the logo shrinks, turns red and flies to its place above «И» in the
 * home header while the home screen shows through. Light / dark versions follow the app theme.
 * The drawing is a sprite sheet (8 × 4 frames of 300 px) rendered from the real logo outline.
 */

const SHEET = require("../../assets/splash/draw-sheet.png");
const LOGO = require("../../assets/home2/logo-white.png");
const GLOW_LIGHT = require("../../assets/splash/glow-light.png");
const GLOW_DARK = require("../../assets/splash/glow-dark.png");
const WORD = "КОСМЕТИЧКА".split("");
const FRAMES = 32;
const COLS = 8;
const L = 124; // logo size on the splash
const RED = "#E8202A";

/** null = still deciding, false = skip today, true = play */
function useShouldPlay() {
  const [play, setPlay] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    const themeReady = new Promise<void>((resolve) => {
      if (useTheme.persist.hasHydrated()) resolve();
      else {
        const off = useTheme.persist.onFinishHydration(() => {
          off();
          resolve();
        });
        setTimeout(resolve, 600);
      }
    });
    Promise.all([AccessibilityInfo.isReduceMotionEnabled().catch(() => false), themeReady]).then(([reduce]) => {
      if (!alive) return;
      // every launch; only «reduce motion» in the phone settings turns it off
      const go = !reduce;
      console.log(`[splash] ${go ? "play" : "skip"} (reduce=${reduce})`);
      setPlay(go);
    });
    return () => {
      alive = false;
    };
  }, []);
  return play;
}

export function AnimatedSplash({ onReady }: { onReady: () => void }) {
  const play = useShouldPlay();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (play !== null) onReady(); // the system splash can go: our first frame (or nothing) is ready
  }, [play, onReady]);
  if (!play || done) return null;
  return <Scene onEnd={() => setDone(true)} />;
}

function Scene({ onEnd }: { onEnd: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const dark = useTheme((s) => s.mode) === "dark";
  const cx = W / 2;
  const cy = H * 0.44;

  const frame = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const letters = useRef(WORD.map(() => new Animated.Value(0))).current;
  const wordOut = useRef(new Animated.Value(1)).current;
  const bg = useRef(new Animated.Value(1)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const red = useRef(new Animated.Value(0)).current;
  const flyOn = useRef(new Animated.Value(0)).current;
  const [target, setTarget] = useState<{ dx: number; dy: number; s: number } | null>(null);

  useEffect(() => {
    const T = 2150;
    const t = (ms: number) => Animated.delay(ms);
    const ease = Easing.bezier(0.4, 0, 0.2, 1);
    const draw = Animated.sequence([
      t(250),
      Animated.timing(frame, { toValue: FRAMES - 1, duration: 1030, easing: Easing.linear, useNativeDriver: true }),
    ]);
    const breathe = Animated.sequence([t(1280), Animated.timing(breath, { toValue: 1, duration: 380, easing: ease, useNativeDriver: true })]);
    const glowA = Animated.sequence([
      t(1250),
      Animated.timing(glow, { toValue: 0.55, duration: 250, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.25, duration: 350, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]);
    const word = Animated.parallel(
      letters.map((v, i) => Animated.sequence([t(1350 + i * 45), Animated.timing(v, { toValue: 1, duration: 320, easing: ease, useNativeDriver: true })]))
    );
    Animated.parallel([draw, breathe, glowA, word]).start();

    let cancelled = false;
    const timer = setTimeout(async () => {
      const r = await getSplashTarget();
      if (cancelled) return;
      console.log(`[splash] fly to ${r ? `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.w)}px` : "nowhere (no header)"}`);
      // no home header on screen (e.g. opened from a link): the logo just fades in place
      setTarget(r ? { dx: r.x + r.w / 2 - cx, dy: r.y + r.h / 2 - cy, s: r.w / L } : { dx: 0, dy: 0, s: 0.6 });
      flyOn.setValue(1);
      Animated.parallel([
        Animated.timing(wordOut, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fly, { toValue: 1, duration: 950, easing: Easing.bezier(0.65, 0, 0.25, 1), useNativeDriver: true }),
        Animated.sequence([t(150), Animated.timing(red, { toValue: 1, duration: 350, useNativeDriver: true })]),
        Animated.sequence([t(200), Animated.timing(bg, { toValue: 0, duration: 650, easing: ease, useNativeDriver: true })]),
        Animated.sequence([t(1020), Animated.timing(flyOn, { toValue: 0, duration: 180, useNativeDriver: true })]),
      ]).start(() => {
        console.log("[splash] end");
        if (!cancelled) onEnd();
      });
    }, T);
    // never stay on screen
    const safety = setTimeout(() => !cancelled && onEnd(), T + 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sprite sheet: step to frame i
  const steps = Array.from({ length: FRAMES }, (_, i) => i);
  const inRange = steps.flatMap((i) => [i, i + 0.999]);
  const tx = frame.interpolate({ inputRange: inRange, outputRange: steps.flatMap((i) => [-(i % COLS) * L, -(i % COLS) * L]) });
  const ty = frame.interpolate({ inputRange: inRange, outputRange: steps.flatMap((i) => [-Math.floor(i / COLS) * L, -Math.floor(i / COLS) * L]) });
  const scale = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.06, 1] });

  const fdx = fly.interpolate({ inputRange: [0, 1], outputRange: [0, target?.dx ?? 0] });
  const fdy = fly.interpolate({ inputRange: [0, 1], outputRange: [0, target?.dy ?? 0] });
  const fs = fly.interpolate({ inputRange: [0, 1], outputRange: [1, target?.s ?? 1] });
  const fontSize = 25;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]} pointerEvents={target ? "none" : "auto"}>
      {/* background — fades out to the home screen */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bg }]}>
        {dark ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#170D25" }]}>
            <LinearGradient
              colors={["rgba(214,48,150,0.42)", "rgba(23,13,37,0)", "rgba(110,32,210,0.5)"]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0.65 }}
              end={{ x: 1, y: 0.35 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(23,13,37,0)", "rgba(23,13,37,0.35)", "rgba(23,13,37,0)"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          <LinearGradient colors={["#a020f0", "#c21ae8", "#e82c87"]} locations={[0, 0.45, 1]} start={{ x: 0.32, y: 0 }} end={{ x: 0.68, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <Animated.View style={{ position: "absolute", left: cx - 210, top: cy - 210, width: 420, height: 420, opacity: glow }}>
          <Image source={dark ? GLOW_DARK : GLOW_LIGHT} style={{ width: 420, height: 420 }} />
        </Animated.View>

        {/* the logo drawing itself */}
        {!target ? (
          <Animated.View style={{ position: "absolute", left: cx - L / 2, top: cy - L / 2, width: L, height: L, overflow: "hidden", transform: [{ scale }] }}>
            <Animated.View style={{ width: L * COLS, height: L * (FRAMES / COLS), transform: [{ translateX: tx }, { translateY: ty }] }}>
              <Image source={SHEET} style={{ width: L * COLS, height: L * (FRAMES / COLS) }} />
            </Animated.View>
          </Animated.View>
        ) : null}

        {/* «КОСМЕТИЧКА» letter by letter */}
        <Animated.View style={{ position: "absolute", left: 0, right: 0, top: cy + 92 - fontSize * 0.6, flexDirection: "row", justifyContent: "center", opacity: wordOut }}>
          {WORD.map((ch, i) => (
            <Animated.Text
              key={i}
              style={{
                color: dark ? "#FAF7FD" : "#fff",
                fontSize,
                letterSpacing: fontSize * 0.17,
                opacity: letters[i],
                transform: [{ translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
              }}
            >
              {ch}
            </Animated.Text>
          ))}
        </Animated.View>
      </Animated.View>

      {/* the logo flies to its place above «И», turning red */}
      {target ? (
        <Animated.View
          style={{
            position: "absolute",
            left: cx - L / 2,
            top: cy - L / 2,
            width: L,
            height: L,
            opacity: flyOn,
            transform: [{ translateX: fdx }, { translateY: fdy }, { scale: fs }],
          }}
        >
          <Image source={LOGO} style={StyleSheet.absoluteFill} contentFit="contain" />
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: red }]}>
            <Image source={LOGO} tintColor={RED} style={StyleSheet.absoluteFill} contentFit="contain" />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

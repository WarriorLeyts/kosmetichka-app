import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useReduceMotion } from "@/useReduceMotion";
import { disabled } from "@/debugFlags";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useAuth } from "@/store/auth";
import { colors, useTheme } from "@/theme";
import { PageLayout } from "@/components/PageBackdrop";
import { Curtain, curtainEase } from "@/components/Curtain";
import { Image } from "expo-image";
import { iosFont } from "@/ios";

// In Expo Go don't hold the splash: Expo Go shows its own developer-menu intro right after
// the app loads, and a splash kept on screen at that moment pushes that intro under the app
// (it then blocks all taps). In the real app (APK) the splash waits for the login check as before.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
if (!inExpoGo) SplashScreen.preventAutoHideAsync().catch(() => {});

// diagnostics for the Expo Go build only: is JS alive, do touches reach it, any hidden errors
if (inExpoGo) {
  let n = 0;
  setInterval(() => console.log(`[kos] alive ${++n}`), 3000);
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, f?: boolean) => void; setGlobalHandler: (h: (e: unknown, f?: boolean) => void) => void } };
  const prev = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((e, fatal) => {
    console.log(`[kos] ERROR ${fatal ? "fatal " : ""}${e instanceof Error ? e.message + " " + e.stack : String(e)}`);
    prev?.(e, fatal);
  });
}

/** Debug build «app» off: a single button counter — checks that taps work in Expo Go at all. */
function TouchTest() {
  const [n, setN] = useState(0);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
      <Pressable onPress={() => setN((x) => x + 1)} style={{ backgroundColor: "#8b3dff", padding: 30, borderRadius: 20 }}>
        <Text style={{ color: "#fff", fontSize: 28 }}>TAP TEST {n}</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  if (disabled("app")) return <TouchTest />;
  return <AppRoot />;
}

function AppRoot() {
  const refresh = useAuth((s) => s.refresh);
  const loading = useAuth((s) => s.loading);
  // re-mount the whole UI when the theme changes so every screen re-reads the palette
  const mode = useTheme((s) => s.mode);
  // Inter is the Android stand-in for Apple's SF Pro in iOS-style screens (iPhone uses the system font)
  useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    refresh();
  }, [refresh]);


  return (
    <SafeAreaProvider
      onTouchStart={inExpoGo ? () => console.log("[kos] touch") : undefined}
    >
      <StatusBar style={colors.statusBar} />
      <Stack
        key={mode}
        screenLayout={({ children }) => <PageLayout>{children}</PageLayout>}
        screenOptions={{
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: mode === "dark" ? colors.bg : "#FFFFFF" },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: "Назад",
          // smooth slide between screens
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: "" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Заказ" }} />
        <Stack.Screen name="filters" options={{ title: "Фильтры", presentation: "modal" }} />
        <Stack.Screen name="scanner" options={{ title: "Сканер штрихкода", presentation: "fullScreenModal", headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Вход", presentation: "modal" }} />
        <Stack.Screen name="register" options={{ title: "Регистрация", headerShown: false, animation: "fade" }} />
        <Stack.Screen name="forgot" options={{ title: "Восстановление пароля" }} />
        <Stack.Screen name="waitlist" options={{ title: "Лист ожидания" }} />
        <Stack.Screen name="favorites" options={{ title: "Избранное" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Мои данные" }} />
        <Stack.Screen name="info" options={{ title: "" }} />
      </Stack>
      <ThemeFade mode={mode} />
      <AppIntro ready={!loading} />
    </SafeAreaProvider>
  );
}

/**
 * Smooth theme switch: the UI re-mounts with the new palette under a layer of the old background,
 * which fades out in ~220 ms (no movement, no size changes; instant with «reduce motion»).
 */
function ThemeFade({ mode }: { mode: string }) {
  const reduce = useReduceMotion();
  const prev = useRef({ mode, bg: colors.bg });
  const op = useRef(new Animated.Value(0)).current;
  // the layer exists only while it fades; it can never stay on screen
  const [fade, setFade] = useState<string | null>(null);
  // layout effect: the old-colour layer is in place before the re-mounted screens are painted
  useLayoutEffect(() => {
    if (prev.current.mode === mode) return;
    const old = prev.current.bg;
    prev.current = { mode, bg: colors.bg };
    if (reduce) return;
    op.setValue(1);
    setFade(old);
    // JS driver: the layer re-renders while fading, a native-driven value would be reset by that re-render
    Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => setFade(null));
    const t = setTimeout(() => setFade(null), 800); // safety net
    return () => clearTimeout(t);
  }, [mode, reduce, op]);
  if (!fade) return null;
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: fade, opacity: op, pointerEvents: "none" }]} />;
}

/**
 * Opening screen, as on the reference: the native splash is plain black, then the white heart,
 * «КОСМЕТИЧКА» in wide light capitals and a small line under it fade in; when the login check is done the black
 * curtain lifts away with its curved edge (the words ride up with it), revealing the home screen.
 */
function AppIntro({ ready }: { ready: boolean }) {
  const reduce = useReduceMotion();
  const { height } = useWindowDimensions();
  const title = useRef(new Animated.Value(0)).current;
  const sub = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(true);
  const [minDone, setMinDone] = useState(false);
  const lifting = useRef(false);

  useEffect(() => {
    // the intro is painted over the native splash (same plain black), which can go now
    if (!inExpoGo) SplashScreen.hideAsync().catch(() => {});
    const d = reduce ? 0 : 1;
    Animated.sequence([
      Animated.delay(250 * d),
      Animated.timing(title, { toValue: 1, duration: 900 * d, easing: curtainEase, useNativeDriver: true }),
      Animated.timing(sub, { toValue: 1, duration: 600 * d, easing: curtainEase, useNativeDriver: true }),
    ]).start();
    const min = setTimeout(() => setMinDone(true), reduce ? 0 : 2100);
    // never keep the intro forever if the network is slow
    const max = setTimeout(() => setShown(false), 7000);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, [title, sub, reduce]);

  useEffect(() => {
    if (!shown || lifting.current) return;
    if (!minDone || !ready) return;
    lifting.current = true;
    if (reduce) {
      setShown(false);
      return;
    }
    Animated.timing(progress, { toValue: 2, duration: 1150, easing: curtainEase, useNativeDriver: true }).start(() => setShown(false));
  }, [ready, minDone, shown, reduce, progress]);

  if (disabled("intro") || !shown) return null;
  const rise = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-only" }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <StatusBar style="light" />
      <Curtain
        progress={progress}
        rest={height * 0.4}
        colors={["#000000", "#000000"]}
        riding={
          <Animated.View style={[StyleSheet.absoluteFill, introStyles.center, { opacity: progress.interpolate({ inputRange: [0, 0.8, 2], outputRange: [1, 0, 0] }) }]}>
            <Animated.View style={{ opacity: title }}>
              <Image source={require("../assets/home2/logo-white.png")} style={introStyles.heart} contentFit="contain" />
            </Animated.View>
            <View style={introStyles.words}>
              <Animated.Text
                style={[
                  introStyles.title,
                  {
                    opacity: title,
                    transform: [
                      { translateY: title.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                      { scale: title.interpolate({ inputRange: [0, 1], outputRange: [1.06, 1] }) },
                    ],
                  },
                ]}
              >
                КОСМЕТИЧКА
              </Animated.Text>
              <Animated.Text style={[introStyles.sub, rise(sub)]}>Сеть магазинов косметики и парфюмерии</Animated.Text>
            </View>
          </Animated.View>
        }
      />
    </View>
  );
}

const HEART = 72;
const introStyles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  // heart and words together are centred on the screen
  heart: { width: HEART, height: HEART },
  words: { marginTop: 24, alignItems: "center" },
  title: { color: "#fff", fontSize: 28, fontWeight: "300", letterSpacing: 7, textAlign: "center", fontFamily: iosFont.regular },
  sub: { color: "rgba(255,255,255,0.65)", fontSize: 14, letterSpacing: 0.4, marginTop: 10, textAlign: "center", fontFamily: iosFont.regular },
});

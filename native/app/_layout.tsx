import "@/webAlert";
import "@/webIOS";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useReduceMotion } from "@/useReduceMotion";
import { disabled } from "@/debugFlags";
import { Stack, usePathname, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useAuth } from "@/store/auth";
import { onLiveHint, startLive, stopLive } from "@/live";
import { installCrashReporter, reportError, setCrashScreen } from "@/crash";
import { listenPush, registerPush } from "@/push";
import { useNotifications } from "@/store/notifications";
import { ErrorScreen } from "@/components/ErrorScreen";
import { colors, useTheme } from "@/theme";
import { PageLayout } from "@/components/PageBackdrop";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { DesktopHeader } from "@/components/DesktopHeader";
import { useDesktop } from "@/useDesktop";

installCrashReporter();

/** A screen crashed while rendering: report it and offer «Повторить» instead of a blank app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error, true);
  }, [error]);
  return <ErrorScreen onRetry={retry} />;
}

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
  // push: listen for taps from the start; register this phone once signed in
  const customerId = useAuth((s) => s.customer?.id);
  useEffect(() => {
    listenPush();
  }, []);
  useEffect(() => {
    if (!customerId) return;
    // after the launch animation, so the system permission dialog doesn't cover it
    const t = setTimeout(
      () =>
        registerPush({
          promoAsked: (yes) => {
            const c = useAuth.getState().customer;
            if (c && yes) useAuth.getState().setCustomer({ ...c, pushPromo: true });
          },
        }),
      4000
    );
    useNotifications.getState().refresh();
    // live hints: an order changed → the open order / list reloads at once; a new notification → the bell
    startLive();
    const offLive = onLiveHint((h) => {
      if (h.t === "order") useNotifications.getState().bump();
      if (h.t === "notify") useNotifications.getState().refresh();
    });
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") useNotifications.getState().refresh();
    });
    return () => {
      clearTimeout(t);
      sub.remove();
      offLive();
      stopLive();
    };
  }, [customerId]);
  const pathname = usePathname();
  useEffect(() => {
    setCrashScreen(pathname);
  }, [pathname]);
  const desktop = useDesktop();
  const refresh = useAuth((s) => s.refresh);
  const loading = useAuth((s) => s.loading);
  // re-mount the whole UI when the theme changes so every screen re-reads the palette
  const mode = useTheme((s) => s.mode);
  // Inter is the Android stand-in for Apple's SF Pro in iOS-style screens (iPhone uses the system font)
  useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    refresh();
  }, [refresh]);

  // the system splash goes once the account is known and the launch animation has its first frame
  const [splashReady, setSplashReady] = useState(false);
  const onSplashReady = useCallback(() => setSplashReady(true), []);
  useEffect(() => {
    if (!loading && splashReady && !inExpoGo) SplashScreen.hideAsync().catch(() => {});
  }, [loading, splashReady]);

  // Never keep the splash forever if the network is slow
  useEffect(() => {
    if (inExpoGo) return;
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaProvider
      onTouchStart={inExpoGo ? () => console.log("[kos] touch") : undefined}
    >
      <StatusBar style={colors.statusBar} />
      {desktop ? <DesktopHeader key={`dh-${mode}`} /> : null}
      <Stack
        key={mode}
        screenLayout={disabled("layout") ? undefined : ({ children }) => <PageLayout>{children}</PageLayout>}
        screenOptions={{
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: mode === "dark" ? "#1C0F2C" : "#FFFFFF" },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: "Назад",
          // smooth slide between screens
          animation: "slide_from_right",
        }}
      >
        {/* screens with their own top bar: the system header is off here, never toggled from inside
            a screen — on iOS toggling it on a modal re-creates the screen (typing was lost) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: "", headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ title: "Заказ", headerShown: false }} />
        <Stack.Screen name="filters" options={{ title: "Фильтры", presentation: "modal" }} />
        <Stack.Screen name="scanner" options={{ title: "Сканер штрихкода", presentation: "fullScreenModal", headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Вход", presentation: "modal", headerShown: false }} />
        <Stack.Screen name="register" options={{ title: "Регистрация", headerShown: false }} />
        <Stack.Screen name="forgot" options={{ title: "Восстановление пароля", headerShown: false }} />
        <Stack.Screen name="loyalty-add" options={{ title: "Добавить карту", headerShown: false }} />
        <Stack.Screen name="waitlist" options={{ title: "Лист ожидания", headerShown: false }} />
        <Stack.Screen name="order-add" options={{ title: "Добавить в заказ", headerShown: false }} />
        <Stack.Screen name="favorites" options={{ title: "Избранное", headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ title: "Мои данные", headerShown: false }} />
        <Stack.Screen name="info" options={{ title: "", headerShown: false }} />
      </Stack>
      <ThemeFade mode={mode} />
      {inExpoGo || desktop ? null : <AnimatedSplash onReady={onSplashReady} />}
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

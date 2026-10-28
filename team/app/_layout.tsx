import "@/webAlert";
import "@/webIOS";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Stack, usePathname, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useAuth } from "@/store/auth";
import { installCrashReporter, reportError, setCrashScreen } from "@/crash";
import { ErrorScreen } from "@/components/ErrorScreen";
import { colors, useTheme } from "@/theme";
import { PageLayout } from "@/components/PageBackdrop";
import { RoleGuard } from "@/components/RoleGuard";
import { useReduceMotion } from "@/useReduceMotion";
import { useDesktop } from "@/useDesktop";
import { Sidebar } from "@/components/Sidebar";
import { startLive, stopLive } from "@/live";
import { startWebPush } from "@/webPush";
import { InstallPrompt } from "@/components/InstallPrompt";

installCrashReporter();

/** A screen crashed while rendering: report it and offer «Повторить» instead of a blank app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError(error, true);
  }, [error]);
  return <ErrorScreen onRetry={retry} />;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const pathname = usePathname();
  useEffect(() => {
    setCrashScreen(pathname);
  }, [pathname]);
  const refresh = useAuth((s) => s.refresh);
  const loading = useAuth((s) => s.loading);
  const signedIn = useAuth((s) => !!s.user);
  const desktop = useDesktop();
  // re-mount the UI when the theme changes so every screen re-reads the palette
  const mode = useTheme((s) => s.mode);
  useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    refresh();
  }, [refresh]);
  // live hints from the site while signed in (orders change → open screens reload at once)
  useEffect(() => {
    if (!signedIn) return;
    startLive();
    // admin website: staff notifications (asks on the first tap; browser only)
    void startWebPush();
    return () => stopLive();
  }, [signedIn]);
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);
  useEffect(() => {
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={colors.statusBar} />
      {/* computer (browser): the admin site's menu on the left, the screens on the right */}
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.bg }}>
      {desktop && signedIn ? <Sidebar key={`sb-${mode}`} /> : null}
      <View style={{ flex: 1 }}>
      <Stack
        key={mode}
        screenLayout={({ children, route }) => (
          <PageLayout>
            <RoleGuard route={route.name}>{children}</RoleGuard>
          </PageLayout>
        )}
        screenOptions={{
          // every screen draws its own top bar (BackBar / large title); the system header stays off
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ animation: "fade" }} />
      </Stack>
      </View>
      </View>
      {signedIn ? <InstallPrompt /> : null}
      <ThemeFade mode={mode} />
    </SafeAreaProvider>
  );
}

/** smooth theme switch: the old background fades out over the re-mounted screens (~220 ms) */
function ThemeFade({ mode }: { mode: string }) {
  const reduce = useReduceMotion();
  const prev = useRef({ mode, bg: colors.bg });
  const op = useRef(new Animated.Value(0)).current;
  const [fade, setFade] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (prev.current.mode === mode) return;
    const old = prev.current.bg;
    prev.current = { mode, bg: colors.bg };
    if (reduce) return;
    op.setValue(1);
    setFade(old);
    Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => setFade(null));
    const t = setTimeout(() => setFade(null), 800);
    return () => clearTimeout(t);
  }, [mode, reduce, op]);
  if (!fade) return null;
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: fade, opacity: op, pointerEvents: "none" }]} />;
}

import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import { useAuth } from "@/store/auth";
import { useIntro } from "@/store/intro";
import { colors, useTheme } from "@/theme";
import { Splash } from "@/components/Splash";
import { Welcome } from "@/components/Welcome";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const refresh = useAuth((s) => s.refresh);
  const authLoading = useAuth((s) => s.loading);
  // re-mount the whole UI when the theme changes so every screen re-reads the palette
  const mode = useTheme((s) => s.mode);
  const introSeen = useIntro((s) => s.seen);
  const introHydrated = useIntro((s) => s.hydrated);
  const finishIntro = useIntro((s) => s.done);

  const [fontsLoaded] = useFonts({ CormorantGaramond_500Medium, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold });
  const [splashDone, setSplashDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // the native splash only covers the first frames; our animated splash takes over
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const t = setTimeout(() => setTimedOut(true), 4000); // never block on a slow network
    return () => clearTimeout(t);
  }, []);

  const onSplashFinish = useCallback(() => setSplashDone(true), []);
  const ready = (fontsLoaded && !authLoading && introHydrated) || timedOut;

  return (
    <SafeAreaProvider>
      <StatusBar style={splashDone && introSeen ? colors.statusBar : "light"} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {fontsLoaded || timedOut ? (
          <Stack
            key={mode}
            screenOptions={{
              headerShown: false,
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "700" },
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.bg },
              contentStyle: { backgroundColor: colors.bg },
              headerBackTitle: "Назад",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" />
            <Stack.Screen name="order/[id]" />
            <Stack.Screen name="stores" />
            <Stack.Screen name="filters" options={{ headerShown: true, title: "Фильтры", presentation: "modal" }} />
            <Stack.Screen name="scanner" options={{ presentation: "fullScreenModal" }} />
            <Stack.Screen name="login" options={{ headerShown: true, title: "", presentation: "modal" }} />
            <Stack.Screen name="register" options={{ headerShown: true, title: "Регистрация" }} />
            <Stack.Screen name="forgot" options={{ headerShown: true, title: "Восстановление пароля" }} />
            <Stack.Screen name="waitlist" options={{ headerShown: true, title: "Лист ожидания" }} />
            <Stack.Screen name="favorites" options={{ headerShown: true, title: "Избранное" }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: true, title: "Мои данные" }} />
            <Stack.Screen name="info" options={{ headerShown: true, title: "О компании" }} />
          </Stack>
        ) : null}

        {splashDone && introHydrated && !introSeen ? <Welcome onDone={finishIntro} /> : null}
        {!splashDone ? <Splash ready={ready} onFinish={onSplashFinish} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

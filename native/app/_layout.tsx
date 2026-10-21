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
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: "800" },
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.bg },
              contentStyle: { backgroundColor: colors.bg },
              headerBackTitle: "Назад",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ title: "" }} />
            <Stack.Screen name="order/[id]" options={{ title: "Заказ" }} />
            <Stack.Screen name="stores" options={{ headerShown: false }} />
            <Stack.Screen name="filters" options={{ title: "Фильтры", presentation: "modal" }} />
            <Stack.Screen name="scanner" options={{ title: "Сканер штрихкода", presentation: "fullScreenModal", headerShown: false }} />
            <Stack.Screen name="login" options={{ title: "Вход", presentation: "modal" }} />
            <Stack.Screen name="register" options={{ title: "Регистрация" }} />
            <Stack.Screen name="forgot" options={{ title: "Восстановление пароля" }} />
            <Stack.Screen name="waitlist" options={{ title: "Лист ожидания" }} />
            <Stack.Screen name="favorites" options={{ title: "Избранное" }} />
            <Stack.Screen name="edit-profile" options={{ title: "Мои данные" }} />
            <Stack.Screen name="info" options={{ title: "" }} />
          </Stack>
        ) : null}

        {splashDone && introHydrated && !introSeen ? <Welcome onDone={finishIntro} /> : null}
        {!splashDone ? <Splash ready={ready} onFinish={onSplashFinish} /> : null}
      </View>
    </SafeAreaProvider>
  );
}

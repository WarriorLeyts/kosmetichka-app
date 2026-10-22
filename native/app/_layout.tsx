import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { useAuth } from "@/store/auth";
import { colors, useTheme } from "@/theme";

// In Expo Go don't hold the splash: Expo Go shows its own developer-menu intro right after
// the app loads, and a splash kept on screen at that moment pushes that intro under the app
// (it then blocks all taps). In the real app (APK) the splash waits for the login check as before.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
if (!inExpoGo) SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const refresh = useAuth((s) => s.refresh);
  const loading = useAuth((s) => s.loading);
  // re-mount the whole UI when the theme changes so every screen re-reads the palette
  const mode = useTheme((s) => s.mode);
  // Inter is the Android stand-in for Apple's SF Pro in iOS-style screens (iPhone uses the system font)
  useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!loading && !inExpoGo) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  // Never keep the splash forever if the network is slow
  useEffect(() => {
    if (inExpoGo) return;
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={colors.statusBar} />
      <Stack
        key={mode}
        screenOptions={{
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
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
        <Stack.Screen name="register" options={{ title: "Регистрация" }} />
        <Stack.Screen name="forgot" options={{ title: "Восстановление пароля" }} />
        <Stack.Screen name="waitlist" options={{ title: "Лист ожидания" }} />
        <Stack.Screen name="favorites" options={{ title: "Избранное" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Мои данные" }} />
        <Stack.Screen name="info" options={{ title: "" }} />
      </Stack>
    </SafeAreaProvider>
  );
}

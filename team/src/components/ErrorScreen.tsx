import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Fallback when a screen crashed (see ErrorBoundary in app/_layout.tsx). Plain colors: the theme may be the broken part. */
export function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, paddingTop: insets.top + 24, backgroundColor: "#170D25" }}>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" }}>Что-то пошло не так</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 22, textAlign: "center", marginTop: 10 }}>
        Мы уже получили отчёт об ошибке. Попробуйте ещё раз.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={({ pressed }) => ({ marginTop: 24, backgroundColor: "#8b3dff", borderRadius: 28, minHeight: 52, paddingHorizontal: 32, justifyContent: "center", opacity: pressed ? 0.85 : 1 })}
      >
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "600" }}>Повторить</Text>
      </Pressable>
    </View>
  );
}

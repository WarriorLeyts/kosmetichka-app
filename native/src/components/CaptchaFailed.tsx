import { Pressable, Text, View } from "react-native";
import { colors } from "../theme";

/** «Я не робот» could not be loaded: the reason and a way to try again. */
export function CaptchaFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ minHeight: 102, marginBottom: 14, borderRadius: 14, padding: 14, justifyContent: "center", backgroundColor: colors.dangerBg }}>
      <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "600" }}>Проверка «Я не робот» не загрузилась</Text>
      <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>Проверьте интернет или отключите блокировщик рекламы для сайта.</Text>
      <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8} style={{ marginTop: 8, alignSelf: "flex-start" }}>
        <Text style={{ color: colors.violet, fontSize: 15, fontWeight: "700" }}>Повторить</Text>
      </Pressable>
    </View>
  );
}

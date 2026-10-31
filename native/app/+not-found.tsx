import { View } from "react-native";
import { router, Stack } from "expo-router";
import { Empty } from "@/components/ui";
import { colors } from "@/theme";

/** An address the app doesn't have (an old link, a typo): our own page instead of Expo's English «Unmatched Route». */
export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: "Страница не найдена" }} />
      <Empty
        icon="compass-outline"
        title="Страница не найдена"
        text="Возможно, ссылка устарела или в адресе опечатка."
        action="На главную"
        onAction={() => router.replace("/")}
      />
    </View>
  );
}

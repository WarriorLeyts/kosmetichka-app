import { View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Empty } from "@/components/kit";

/** An address the app doesn't have: our own page instead of Expo's English «Unmatched Route». */
export default function NotFound() {
  return (
    <Screen title="Страница не найдена">
      <Empty icon="compass-outline" text="Такой страницы нет. Возможно, ссылка устарела." />
      <View style={{ marginTop: 8 }}>
        <ActionButton label="На главную" icon="home-outline" onPress={() => router.replace("/")} />
      </View>
    </Screen>
  );
}

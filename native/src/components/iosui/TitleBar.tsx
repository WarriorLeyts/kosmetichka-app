import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../../ios";

/** Inner screen header: violet back chevron + large title on one row (as on the mockups). */
export function TitleBar({ title, onBack }: { title: string; onBack?: () => void }) {
  const c = useIOS();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));
  return (
    <View style={styles.row}>
      <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel="Назад" style={styles.back}>
        <Ionicons name="chevron-back" size={30} color="#8b3dff" />
      </Pressable>
      <Text style={[styles.title, { color: c.label }]} numberOfLines={2} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingTop: 6, paddingBottom: 8 },
  back: { width: 40, height: 44, justifyContent: "center", marginLeft: -6 },
  title: { flex: 1, fontSize: 30, fontWeight: "700" },
});

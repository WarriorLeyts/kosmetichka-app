import { Linking, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
export function PreviewVideo({ uri }: { uri: string }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><Pressable accessibilityRole="button" onPress={() => void Linking.openURL(uri).catch(() => {})} style={{ alignItems: "center", gap: 12, padding: 24 }}><Ionicons name="play-circle" size={64} color="#fff" /><Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Посмотреть видео</Text></Pressable></View>;
}

import { Linking, Modal, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { storyLink, storyMediaUrl, type StoryContent } from "@/stories";
import { PreviewVideo } from "./PreviewVideo";
export function StoryPreview({ story, onClose }: { story: StoryContent; onClose: () => void }) {
  const inset = useSafeAreaInsets(), media = storyMediaUrl(story.mediaUrl);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={{ flex: 1, backgroundColor: "rgba(8,3,15,0.96)", alignItems: "center" }}><View style={{ flex: 1, width: "100%", maxWidth: 480, paddingTop: inset.top + 8, paddingBottom: inset.bottom + 12 }}>
      <View style={{ height: 3, backgroundColor: "#fff", marginHorizontal: 14, borderRadius: 2 }} />
      <View style={{ flexDirection: "row", alignItems: "center", padding: 8 }}><Text style={{ color: "#fff", flex: 1, fontSize: 16, fontWeight: "700", paddingLeft: 8 }}>{story.title || "Предпросмотр"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Закрыть предпросмотр" onPress={onClose} style={{ padding: 12 }}><Ionicons name="close" color="#fff" size={25} /></Pressable></View>
      <View style={{ flex: 1, backgroundColor: "#12091c", borderRadius: 16, overflow: "hidden" }}>{!media ? <Text style={{ color: "#fff", padding: 24 }}>Сначала загрузите фото или видео</Text> : story.kind === "img" ? <Image source={{ uri: media }} contentFit="contain" style={{ width: "100%", height: "100%" }} /> : <PreviewVideo uri={media} />}</View>
      {story.link && storyLink(story.link) ? <Pressable accessibilityRole="link" accessibilityLabel={story.linkLabel || "Подробнее"} onPress={() => void Linking.openURL(new URL(story.link, "https://kosmetichka-opt.ru").href).catch(() => {})} style={{ backgroundColor: "#e82c87", marginHorizontal: 16, marginTop: 12, borderRadius: 28, minHeight: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, padding: 12 }}><Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>{story.linkLabel || "Подробнее"}</Text><Ionicons name="open-outline" color="#fff" size={20} /></Pressable> : null}
    </View></View>
  </Modal>;
}

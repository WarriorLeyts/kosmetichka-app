import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { imageUrl } from "../../api";
import { money } from "../../format";

const VIOLET = "#8b3dff";

export function fileSize(bytes: unknown): string {
  const b = typeof bytes === "number" ? bytes : 0;
  if (b <= 0) return "";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} КБ`;
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}

export function openUrl(url: string) {
  const u = imageUrl(url);
  if (u) WebBrowser.openBrowserAsync(u).catch(() => {});
}

/** short text for lists / previews */
export function messagePreview(text: string): string {
  try {
    const o = JSON.parse(text);
    if (o?._t === "img") return "📷 Фото";
    if (o?._t === "video") return "🎬 Видео";
    if (o?._t === "file") return `📎 ${o.name ?? "Файл"}`;
    if (o?._t === "product") return `📦 ${o.name ?? "Товар"}`;
    if (o?._t === "product-problem") return `⚠️ ${o.name ?? "Проблема с товаром"}`;
  } catch {}
  return text;
}

/** chat message: plain text or a JSON card (photo / video / file / product / problem) — same format as the site */
export function MessageBody({ text, color }: { text: string; color: string }) {
  try {
    const o = JSON.parse(text);
    if (o?._t === "img" && typeof o.url === "string") {
      return (
        <Pressable onPress={() => openUrl(o.url)} accessibilityRole="imagebutton" accessibilityLabel="Фото, открыть">
          <Image source={{ uri: imageUrl(o.url) ?? undefined }} style={styles.photo} contentFit="cover" />
        </Pressable>
      );
    }
    if (o?._t === "video" && typeof o.url === "string") {
      return (
        <Pressable onPress={() => openUrl(o.url)} accessibilityRole="button" accessibilityLabel="Видео, смотреть" style={styles.video}>
          <Ionicons name="play-circle" size={54} color="#fff" />
          <Text style={styles.videoText}>Видео{fileSize(o.size) ? ` · ${fileSize(o.size)}` : ""}</Text>
        </Pressable>
      );
    }
    if (o?._t === "file" && typeof o.url === "string") {
      const name = typeof o.name === "string" ? o.name : "Файл";
      const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 4);
      return (
        <Pressable onPress={() => openUrl(o.url)} accessibilityRole="button" accessibilityLabel={`Файл ${name}`} style={styles.file}>
          <View style={styles.fileIcon}>
            <Text style={styles.fileExt}>{ext || "FILE"}</Text>
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color, fontWeight: "600", fontSize: 15 }} numberOfLines={2}>
              {name}
            </Text>
            <Text style={{ color, opacity: 0.7, fontSize: 13, marginTop: 2 }}>{[fileSize(o.size), "Открыть"].filter(Boolean).join(" · ")}</Text>
          </View>
        </Pressable>
      );
    }
    if ((o?._t === "product" || o?._t === "product-problem") && typeof o.name === "string") {
      return (
        <View style={{ width: 210 }}>
          {o.imagePath ? <Image source={{ uri: imageUrl(o.imagePath) ?? undefined }} style={styles.product} contentFit="contain" /> : null}
          <Text style={{ fontWeight: "600", marginTop: 6, color }}>{o.name}</Text>
          {typeof o.price === "number" && o.price > 0 ? <Text style={{ color: "#e82c87", fontWeight: "700" }}>{money(o.price)}</Text> : null}
          {o._t === "product-problem" && o.problem ? (
            <View style={styles.problem}>
              <Text style={styles.problemText}>⚠️ {String(o.problem)}</Text>
            </View>
          ) : null}
        </View>
      );
    }
  } catch {
    /* plain text */
  }
  return <Text style={{ color, fontSize: 16, lineHeight: 21 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  photo: { width: 200, height: 200, borderRadius: 12 },
  video: { width: 210, height: 140, borderRadius: 12, backgroundColor: "#1b1030", alignItems: "center", justifyContent: "center", gap: 4 },
  videoText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  file: { flexDirection: "row", alignItems: "center", gap: 10, maxWidth: 240 },
  fileIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(139,61,255,0.16)", alignItems: "center", justifyContent: "center" },
  fileExt: { color: VIOLET, fontSize: 11, fontWeight: "800" },
  product: { width: 210, height: 120, borderRadius: 10, backgroundColor: "#fff" },
  problem: { marginTop: 6, borderRadius: 8, backgroundColor: "#FFF4E5", paddingHorizontal: 8, paddingVertical: 5 },
  problemText: { color: "#B45309", fontSize: 13, fontWeight: "600" },
});

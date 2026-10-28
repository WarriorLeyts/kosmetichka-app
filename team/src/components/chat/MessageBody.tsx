import { Pressable, StyleSheet, Text, View } from "react-native";
import { OrderChangeCard } from "./OrderChangeCard";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { chatFileUrl, imageUrl, safeOpenUrl } from "../../api";
import { money } from "../../format";
import { createContext, useContext, useState } from "react";

/** «Добавить товар» cards from the customer: what the order screen can do with them (no provider → no button) */
export type ProductRequest = { messageId: number | null; added: boolean; id: number; name: string; variantName: string | null; imagePath: string | null; quantity: number; price: number };
export const ProductRequestContext = createContext<{
  /** pieces of this product already in the order (0 = not there) */
  inOrder: (r: ProductRequest) => number;
  add: (r: ProductRequest) => Promise<void>;
} | null>(null);

function ProductRequestCard({ r, color }: { r: ProductRequest; color: string }) {
  const ctx = useContext(ProductRequestContext);
  const [busy, setBusy] = useState(false);
  const have = ctx?.inOrder(r) ?? 0;
  return (
    <View style={{ width: 230, gap: 4 }}>
      <Text style={{ color, fontSize: 13, opacity: 0.75 }}>🛒 Клиент просит добавить в заказ</Text>
      {r.imagePath ? <Image source={{ uri: imageUrl(r.imagePath, 320) ?? undefined }} style={styles.product} contentFit="contain" /> : null}
      <Text style={{ fontWeight: "600", color }}>{r.name}</Text>
      {r.variantName ? <Text style={{ color: VIOLET }}>{r.variantName}</Text> : null}
      <Text style={{ color, fontWeight: "800", fontSize: 15 }}>
        {r.quantity} шт.{r.price > 0 ? <Text style={{ color: "#e82c87" }}>{`  × ${money(r.price)}`}</Text> : null}
      </Text>
      {r.added ? (
        <View style={[styles.reqBtn, { backgroundColor: "rgba(22,163,74,0.14)" }]}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={{ color: "#16A34A", fontWeight: "700" }}>Добавлено в заказ</Text>
        </View>
      ) : ctx ? (
        <>
          {have > 0 ? <Text style={{ color, fontSize: 13, opacity: 0.75 }}>Уже в заказе: {have} шт. — добавим ещё {r.quantity} шт.</Text> : null}
          <Pressable
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              try {
                await ctx.add(r);
              } finally {
                setBusy(false);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`Добавить в заказ ${r.name}, ${r.quantity} шт.`}
            style={({ pressed }) => [styles.reqBtn, { backgroundColor: VIOLET, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700" }}>{busy ? "Добавляем…" : "Добавить в заказ"}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const VIOLET = "#8b3dff";

export function fileSize(bytes: unknown): string {
  const b = typeof bytes === "number" ? bytes : 0;
  if (b <= 0) return "";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} КБ`;
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}

/** opens a site photo / file in the in-app browser (https only) */
export function openUrl(url: string | null | undefined) {
  const u = safeOpenUrl(url);
  if (u) WebBrowser.openBrowserAsync(u).catch(() => {});
}

/** chat attachment: only our own /api/uploads/chat/ files are opened */
function openChatFile(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => {});
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
    if (o?._t === "order-change") return `✏️ ${o.title ?? "Заказ изменён"}`;
  } catch {}
  return text;
}

/** chat message: plain text or a JSON card (photo / video / file / product / problem) — same format as the site */
export function MessageBody({ id, text, color }: { id?: number; text: string; color: string }) {
  try {
    const o = JSON.parse(text);
    // attachment links from other people's messages: our upload paths only (no phishing / foreign hosts)
    const file = o && typeof o === "object" ? chatFileUrl(o.url) : null;
    if ((o?._t === "img" || o?._t === "video" || o?._t === "file") && !file) {
      return <Text style={{ color, fontSize: 15, fontStyle: "italic", opacity: 0.75 }}>Вложение недоступно</Text>;
    }
    if (o?._t === "img" && file) {
      return (
        <Pressable onPress={() => openChatFile(file)} accessibilityRole="imagebutton" accessibilityLabel="Фото, открыть">
          <Image source={{ uri: file }} style={styles.photo} contentFit="cover" />
        </Pressable>
      );
    }
    if (o?._t === "video" && file) {
      return (
        <Pressable onPress={() => openChatFile(file)} accessibilityRole="button" accessibilityLabel="Видео, смотреть" style={styles.video}>
          <Ionicons name="play-circle" size={54} color="#fff" />
          <Text style={styles.videoText}>Видео{fileSize(o.size) ? ` · ${fileSize(o.size)}` : ""}</Text>
        </Pressable>
      );
    }
    if (o?._t === "file" && file) {
      const name = typeof o.name === "string" ? o.name : "Файл";
      const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 4);
      return (
        <Pressable onPress={() => openChatFile(file)} accessibilityRole="button" accessibilityLabel={`Файл ${name}`} style={styles.file}>
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
    if (o?._t === "order-change" && Array.isArray(o.lines)) return <OrderChangeCard data={o} color={color} />;
    if (o?._t === "product-request" && typeof o.name === "string" && Number.isInteger(o.id)) {
      const r: ProductRequest = {
        messageId: typeof id === "number" && id > 0 ? id : null, added: o.added === true,
        id: o.id, name: o.name, variantName: typeof o.variantName === "string" && o.variantName ? o.variantName : null,
        imagePath: typeof o.imagePath === "string" && o.imagePath ? o.imagePath : null,
        quantity: Math.max(1, Math.floor(Number(o.quantity) || 1)), price: Number(o.price) || 0,
      };
      return <ProductRequestCard r={r} color={color} />;
    }
    if ((o?._t === "product" || o?._t === "product-problem") && typeof o.name === "string") {
      return (
        <View style={{ width: 210 }}>
          {typeof o.imagePath === "string" && o.imagePath ? <Image source={{ uri: imageUrl(o.imagePath, 320) ?? undefined }} style={styles.product} contentFit="contain" /> : null}
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
  reqBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 9, marginTop: 6 },
});

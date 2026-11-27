import { createContext, useContext, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { imageUrl } from "@/api";
import { money } from "@/format";
import { useIOS } from "@/ios";
import { Sheet } from "../iosui/Sheet";

export type ProductRequest = { messageId: number | null; added: boolean; id: number; name: string; variantName: string | null; imagePath: string | null; quantity: number; price: number; question?: string; addedQuantity?: number };
export type ProductReply = { messageId: number; name: string; question: string };
export const ProductRequestContext = createContext<{ inOrder: (r: ProductRequest) => number; add: (r: ProductRequest) => Promise<void>; reply?: (r: ProductReply) => void } | null>(null);
const VIOLET = "#8b3dff";
export function ProductChatCard({ r, color }: { r: ProductRequest; color: string }) {
  const c = useIOS(), ctx = useContext(ProductRequestContext);
  const [open, setOpen] = useState(false), [quantity, setQuantity] = useState(String(r.question ? 1 : r.quantity)), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), n = /^[1-9]\d{0,4}$/.test(quantity) ? Number(quantity) : 0, valid = n > 0 && n <= 10000;
  const add = async () => {
    if (!ctx || !r.messageId || !valid || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await ctx.add({ ...r, quantity: n }); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Товар не добавлен"); }
    finally { lock.current = false; setBusy(false); }
  };
  const have = ctx?.inOrder(r) ?? 0;
  const button = { minHeight: 48, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 5 };
  return <View style={{ width: 230, maxWidth: "100%", gap: 7 }}>
    <Text style={{ color, fontSize: 14, fontWeight: "600" }}>{r.question ? "Вопрос клиента о товаре" : "Клиент просит добавить в заказ"}</Text>
    {r.imagePath ? <Image source={{ uri: imageUrl(r.imagePath, 320) ?? undefined }} style={{ width: "100%", height: 130, borderRadius: 10, backgroundColor: "#fff" }} contentFit="contain" /> : null}
    <Text style={{ color, fontWeight: "600", fontSize: 14 }}>{r.name}</Text>
    {r.variantName ? <Text style={{ color }}>{r.variantName}</Text> : null}
    {r.question ? <Text style={{ color, fontSize: 15, lineHeight: 21 }}>{r.question}</Text> : <Text style={{ color, fontWeight: "700" }}>{r.quantity} шт.{r.price > 0 ? ` × ${money(r.price)}` : ""}</Text>}
    {r.added ? <Text style={{ color: c.blurTint === "dark" ? "#86efac" : "#15803d", fontWeight: "700" }}>✓ Добавлено в заказ{r.addedQuantity ? ` · ${r.addedQuantity} шт.` : ""}</Text> : null}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
      {r.question && r.messageId && ctx?.reply ? <Pressable accessibilityRole="button" accessibilityLabel="Ответить на вопрос о товаре" onPress={() => ctx.reply?.({ messageId: r.messageId!, name: r.name, question: r.question! })} style={[button, { backgroundColor: "rgba(139,61,255,0.14)", flexGrow: 1 }]}><Ionicons name="return-up-back" size={17} color={VIOLET} /><Text style={{ color: VIOLET, fontWeight: "700", fontSize: 13 }}>Ответить</Text></Pressable> : null}
      {!r.added && r.messageId && ctx ? <Pressable accessibilityRole="button" accessibilityLabel="Добавить товар в заказ" onPress={() => { setQuantity(String(r.question ? 1 : r.quantity)); setError(""); setOpen(true); }} style={[button, { backgroundColor: VIOLET, flexGrow: 1 }]}><Ionicons name="bag-add-outline" size={18} color="#fff" /><Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Добавить в заказ</Text></Pressable> : null}
    </View>
    <Sheet open={open} onClose={() => { if (!busy) setOpen(false); }} title="Добавить товар в заказ">
      <View style={{ gap: 14, paddingBottom: 12 }}>
        <Text style={{ color: c.label, fontWeight: "600", fontSize: 16 }}>{r.name}{r.variantName ? ` · ${r.variantName}` : ""}</Text>
        <Text style={{ color: c.label, fontWeight: "600" }}>Количество, шт.</Text>
        <View style={{ flexDirection: "row", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Уменьшить количество" disabled={busy || n <= 1} onPress={() => setQuantity(String(Math.max(1, (n || 1) - 1)))} style={{ padding: 15, borderRadius: 15, backgroundColor: c.cell }}><Ionicons name="remove" color={VIOLET} size={22} /></Pressable>
          <TextInput accessibilityLabel="Количество товара" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" inputMode="numeric" maxLength={5} selectTextOnFocus editable={!busy} style={{ width: 112, minHeight: 54, borderRadius: 15, backgroundColor: c.cell, textAlign: "center", padding: 12, color: c.label, fontSize: 22, fontWeight: "700" }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Увеличить количество" disabled={busy || n >= 10000} onPress={() => setQuantity(String(Math.min(10000, (n || 0) + 1)))} style={{ padding: 15, borderRadius: 15, backgroundColor: c.cell }}><Ionicons name="add" color={VIOLET} size={22} /></Pressable>
        </View>
        <Text style={{ color: c.secondary, fontSize: 13 }}>Добавим указанное количество{have ? ` к ${have} шт. в заказе` : ""}. Сумма заказа пересчитается.</Text>
        {!valid ? <Text style={{ color: "#E5484D" }}>Введите целое количество от 1 до 10 000</Text> : null}
        {error ? <Text accessibilityRole="alert" style={{ color: "#E5484D" }}>{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Добавить ${valid ? n : ""} шт. в заказ`} disabled={busy || !valid} onPress={() => void add()} style={{ minHeight: 52, alignItems: "center", justifyContent: "center", backgroundColor: VIOLET, borderRadius: 26, opacity: busy || !valid ? 0.5 : 1 }}><Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{busy ? "Добавляем…" : `Добавить ${valid ? n : ""} шт. в заказ`}</Text></Pressable>
      </View>
    </Sheet>
  </View>;
}

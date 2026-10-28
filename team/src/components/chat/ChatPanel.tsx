import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { uploadChat } from "../../api";
import { time, date } from "../../format";
import { useIOS } from "../../ios";
import { tap } from "../ui";
import { Sheet, SheetOptions } from "../iosui/Sheet";
import { MessageBody } from "./MessageBody";
import { ATTACH_OPTIONS, afterSheet, pickFile, prepareForUpload, type AttachHow } from "./Attach";
import { onLiveHint } from "../../live";

const VIOLET = "#8b3dff";
const GRAD = ["#8b3dff", "#b832e0", "#e82c87"] as const;

export type ChatMsg = { id: number | string; text: string; createdAt: string; mine: boolean; author?: string | null };

/**
 * Chat inside a screen (order ↔ customer, manager ↔ picker): messages, text, photo / video / file.
 * Polls every 10 s while the screen is open.
 */
export function ChatPanel({
  load, send, empty, extraActions, liveOrderId,
}: {
  /** reload at once when the site says this order changed (a new message) */
  liveOrderId?: number;
  load: () => Promise<ChatMsg[]>;
  send: (text: string) => Promise<unknown>;
  empty?: string;
  /** e.g. «send a product card» */
  extraActions?: { value: string; label: string; run: () => void }[];
}) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [msgs, setMsgs] = useState<ChatMsg[] | null>(null);
  const [error, setError] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const alive = useRef(true);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const my = ++seq.current;
    try {
      const m = await load();
      // a slow older poll must not overwrite a newer answer
      if (alive.current && my === seq.current) {
        setMsgs(m);
        setError(false);
      }
    } catch {
      if (alive.current && my === seq.current) setError(true);
    }
  }, [load]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const t = setInterval(refresh, 3_000);
      const off = liveOrderId ? onLiveHint((h) => h.t === "order" && h.id === liveOrderId && refresh()) : () => {};
      return () => {
        clearInterval(t);
        off();
      };
    }, [refresh, liveOrderId])
  );

  const sendingRef = useRef(false);
  const sendText = async () => {
    const t = text.trim();
    // a ref, not state: two quick taps arrive before the re-render and would send the message twice
    if (!t || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await send(t);
      setText("");
      await refresh();
    } catch (e) {
      Alert.alert("Не отправлено", e instanceof Error ? e.message : "Попробуйте ещё раз");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const attach = async (how: string) => {
    setSheet(false);
    const extra = extraActions?.find((a) => a.value === how);
    await afterSheet(); // iOS shows one modal at a time — let the sheet close first
    if (extra) {
      extra.run();
      return;
    }
    try {
      const f = await pickFile(how as AttachHow);
      if (!f) return;
      setUploading(f.name);
      const up = await uploadChat(await prepareForUpload(f));
      const msg = up.kind === "img" ? JSON.stringify({ _t: "img", url: up.url }) : JSON.stringify({ _t: up.kind, url: up.url, name: up.name, size: up.size });
      await send(msg);
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      Alert.alert("Не отправлено", e instanceof Error ? e.message : "Не удалось отправить файл");
    } finally {
      setUploading(null);
    }
  };

  let lastDay = "";
  return (
    <View>
      {msgs === null && !error ? <ActivityIndicator style={{ marginVertical: 18 }} color={VIOLET} /> : null}
      {error && !msgs ? (
        <Pressable onPress={refresh} style={{ alignItems: "center", marginVertical: 14 }}>
          <Text style={{ color: c.secondary }}>Не удалось загрузить сообщения</Text>
          <Text style={{ color: VIOLET, marginTop: 4 }}>Повторить</Text>
        </Pressable>
      ) : null}
      {msgs && msgs.length === 0 ? <Text style={{ color: c.secondary, textAlign: "center", marginVertical: 14 }}>{empty ?? "Сообщений пока нет"}</Text> : null}
      {msgs?.map((m) => {
        const day = date(m.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        const fg = m.mine ? "#fff" : c.label;
        return (
          <View key={m.id}>
            {showDay ? <Text style={[styles.day, { color: c.secondary }]}>{day}</Text> : null}
            <View style={[styles.bubbleWrap, m.mine ? styles.mineWrap : styles.theirsWrap]}>
              {m.mine ? (
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.mine]}>
                  {m.author ? <Text style={[styles.author, { color: "rgba(255,255,255,0.85)" }]}>{m.author}</Text> : null}
                  <MessageBody id={typeof m.id === "number" ? m.id : undefined} text={m.text} color={fg} />
                  <Text style={[styles.time, { color: "rgba(255,255,255,0.8)" }]}>{time(m.createdAt)}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.theirs, { backgroundColor: dark ? "#352044" : "#F2F0F8" }]}>
                  {m.author ? <Text style={[styles.author, { color: "#e82c87" }]}>{m.author}</Text> : null}
                  <MessageBody id={typeof m.id === "number" ? m.id : undefined} text={m.text} color={fg} />
                  <Text style={[styles.time, { color: c.secondary }]}>{time(m.createdAt)}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
      {uploading ? (
        <View style={[styles.bubble, styles.mine, styles.mineWrap, { backgroundColor: dark ? "#352044" : "#F3ECFA", flexDirection: "row", gap: 8, alignItems: "center" }]}>
          <ActivityIndicator size="small" color={VIOLET} />
          <Text style={{ color: c.label, flexShrink: 1 }} numberOfLines={1}>
            Отправка: {uploading}
          </Text>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable
          onPress={() => {
            tap();
            setSheet(true);
          }}
          disabled={!!uploading}
          accessibilityRole="button"
          accessibilityLabel="Прикрепить"
          style={[styles.round, { backgroundColor: dark ? "#2B193D" : "#F2F2F7", opacity: uploading ? 0.5 : 1 }]}
        >
          {uploading ? <ActivityIndicator size="small" color={VIOLET} /> : <Ionicons name="attach" size={26} color={VIOLET} />}
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Сообщение…"
          placeholderTextColor={c.secondary}
          multiline
          maxLength={4000}
          style={[styles.input, { backgroundColor: dark ? "#2B193D" : "#F2F2F7", color: c.label }]}
        />
        <Pressable onPress={sendText} disabled={!text.trim() || sending} accessibilityRole="button" accessibilityLabel="Отправить" style={{ opacity: text.trim() ? 1 : 0.45 }}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.round}>
            {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="paper-plane-outline" size={22} color="#fff" />}
          </LinearGradient>
        </Pressable>
      </View>

      <Sheet open={sheet} onClose={() => setSheet(false)} title="Отправить">
        <SheetOptions
          options={[...ATTACH_OPTIONS, ...(extraActions ?? []).map((a) => ({ value: a.value as string, label: a.label }))]}
          value=""
          onSelect={attach}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { textAlign: "center", fontSize: 12, marginTop: 12, marginBottom: 2 },
  bubbleWrap: { marginTop: 8, maxWidth: "86%" },
  mineWrap: { alignSelf: "flex-end" },
  theirsWrap: { alignSelf: "flex-start" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { borderBottomLeftRadius: 6 },
  author: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  time: { fontSize: 11, alignSelf: "flex-end", marginTop: 3 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 14 },
  round: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 46, maxHeight: 130, borderRadius: 23, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16 },
});

import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VoicePlayer } from "./VoicePlayer";
import { useVoiceRecording } from "./useVoiceRecording";
import { voiceTime, type VoiceFile } from "./types";

export function VoiceComposer({ onClose, onSend, dark = false }: { onClose: () => void; onSend: (file: VoiceFile) => Promise<void>; dark?: boolean }) {
  const { phase, file, elapsed, error, start, stop } = useVoiceRecording();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const sendingRef = useRef(false);
  const alive = useRef(true);
  const color = dark ? "#FAF7FD" : "#201729";
  useEffect(() => { alive.current = true; void start(); return () => { alive.current = false; }; }, [start]);
  const send = async () => {
    if (!file || sendingRef.current) return;
    sendingRef.current = true; setSending(true); setSendError("");
    try { await onSend(file); if (alive.current) onClose(); }
    catch (e) { if (alive.current) setSendError(e instanceof Error ? e.message : "Не отправлено. Попробуйте ещё раз."); }
    finally { sendingRef.current = false; if (alive.current) setSending(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { if (!sendingRef.current) onClose(); }}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: dark ? "#2B193D" : "#fff" }]}>
          <Text style={[styles.title, { color }]}>Голосовое сообщение</Text>
          {phase === "recording" ? <Text style={{ color: "#E82C87", fontSize: 24, fontWeight: "700" }}>● {voiceTime(elapsed)}</Text> : null}
          {phase === "starting" || phase === "stopping" ? <ActivityIndicator color="#8b3dff" accessibilityLabel={phase === "starting" ? "Включаем микрофон" : "Сохраняем запись"} /> : null}
          {phase === "ready" && file ? <><Text style={{ color, fontSize: 13 }}>Запись {voiceTime(file.duration)} · можно прослушать</Text><VoicePlayer uri={file.uri} duration={file.duration} color={color} /></> : null}
          {error || sendError ? <Text accessibilityRole="alert" style={{ color: dark ? "#FFB4B4" : "#B42318", textAlign: "center" }}>{error || sendError}</Text> : null}
          {phase === "recording" ? <Text style={{ color, opacity: 0.65, fontSize: 13 }}>До 5 минут. Нажмите, чтобы остановить.</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} disabled={sending} accessibilityRole="button" accessibilityLabel="Удалить голосовую запись" style={[styles.button, { backgroundColor: dark ? "#432460" : "#F3ECFA", opacity: sending ? 0.5 : 1 }]}><Ionicons name="trash-outline" size={20} color="#8b3dff" /><Text style={{ color: "#8b3dff", fontWeight: "600" }}>{file ? "Удалить" : "Отмена"}</Text></Pressable>
            {phase === "recording" ? <Pressable onPress={() => void stop()} accessibilityRole="button" accessibilityLabel="Остановить запись" style={styles.primary}><Ionicons name="stop" size={18} color="#fff" /><Text style={styles.white}>Остановить</Text></Pressable> : null}
            {phase === "idle" ? <Pressable onPress={() => void start()} accessibilityRole="button" accessibilityLabel="Повторить запись" style={styles.primary}><Text style={styles.white}>Повторить</Text></Pressable> : null}
            {phase === "ready" ? <Pressable onPress={send} disabled={sending} accessibilityRole="button" accessibilityLabel="Отправить голосовое сообщение" style={styles.primary}>{sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="paper-plane-outline" size={18} color="#fff" />}<Text style={styles.white}>{sending ? "Отправка…" : "Отправить"}</Text></Pressable> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(20,10,35,0.45)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: { width: "100%", maxWidth: 380, padding: 22, borderRadius: 24, alignItems: "center", gap: 18 },
  title: { fontSize: 19, fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "center", gap: 10, flexWrap: "wrap" },
  button: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  primary: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#8b3dff" },
  white: { color: "#fff", fontWeight: "600" },
});

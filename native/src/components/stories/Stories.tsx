import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { useIOS } from "@/ios";
import { storyDestination, storyMediaUrl, type Story } from "@/storyTypes";
import { openSiteLink } from "@/components/home/HomeBlocks";
import { StoryVideo } from "./StoryVideo";

type OpenCatalog = Parameters<typeof openSiteLink>[1];
const SEEN_KEY = "kosmetichka-stories-seen";
export function Stories({ openCatalog }: { openCatalog: OpenCatalog }) {
  const c = useIOS();
  const [items, setItems] = useState<Story[]>([]), [seen, setSeen] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null), [now, setNow] = useState(Date.now());
  useEffect(() => { void AsyncStorage.getItem(SEEN_KEY).then(s => { if (!s) return; const v = JSON.parse(s); if (v && typeof v === "object" && !Array.isArray(v)) setSeen(v); }).catch(() => {}); }, []);
  useFocusEffect(useCallback(() => {
    let active = true, pending = false;
    const load = async () => {
      if (pending || AppState.currentState !== "active") return;
      pending = true;
      try { const r = await api.stories(); if (active) { setItems(Array.isArray(r.items) ? r.items : []); setNow(Date.now()); } } catch { /* Optional news must not block shopping. */ } finally { pending = false; }
    };
    void load(); const t = setInterval(() => { setNow(Date.now()); void load(); }, 30000);
    const sub = AppState.addEventListener("change", s => { if (s === "active") void load(); });
    return () => { active = false; clearInterval(t); sub.remove(); };
  }, []));
  const visible = items.filter(s => s.published && (!s.expiresAt || Date.parse(s.expiresAt) > now) && !!storyMediaUrl(s.mediaUrl) && !!storyMediaUrl(s.coverUrl));
  const index = visible.findIndex(s => s.id === selected);
  const current = visible[index];
  const mark = (s: Story) => {
    setSelected(s.id);
    setSeen(old => {
      const next = Object.fromEntries(visible.filter(v => old[v.id]).map(v => [v.id, old[v.id]])); next[s.id] = s.updatedAt;
      void AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next)).catch(() => {}); return next;
    });
  };
  if (!visible.length) return null;
  return <>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 12 }} accessibilityLabel="Новости и акции">
      {visible.map(s => <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`Открыть сторис: ${s.title}`} onPress={() => mark(s)} style={{ width: 76, gap: 7, alignItems: "center" }}>
        <LinearGradient colors={seen[s.id] === s.updatedAt ? ["#9b8aa7", "#9b8aa7"] : ["#8b3dff", "#f12b91"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 76, height: 76, padding: 3, borderRadius: 38 }}>
          <View style={{ padding: 3, backgroundColor: c.bg, borderRadius: 36 }}><Image source={{ uri: storyMediaUrl(s.coverUrl)! }} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 32 }} /></View>
        </LinearGradient>
        <Text numberOfLines={2} style={{ color: c.label, fontSize: 12, fontWeight: "600", textAlign: "center", lineHeight: 16 }}>{s.title}</Text>
      </Pressable>)}
    </ScrollView>
    <Modal visible={!!current} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSelected(null)}>
      {current ? <StorySlide key={`${current.id}:${current.updatedAt}`} story={current} count={visible.length} index={index} onClose={() => setSelected(null)} onNext={() => index + 1 < visible.length ? mark(visible[index + 1]) : setSelected(null)} onPrevious={() => index > 0 ? mark(visible[index - 1]) : undefined} onLink={() => { const link = storyDestination(current.link); if (link) { setSelected(null); openSiteLink(link, openCatalog); } }} /> : null}
    </Modal>
  </>;
}
function StorySlide({ story, count, index, onClose, onNext, onPrevious, onLink }: { story: Story; count: number; index: number; onClose: () => void; onNext: () => void; onPrevious: () => void; onLink: () => void }) {
  const inset = useSafeAreaInsets();
  const [ready, setReady] = useState(false), [error, setError] = useState(false), [paused, setPaused] = useState(false), [background, setBackground] = useState(AppState.currentState !== "active"), [progress, setProgress] = useState(0), [attempt, setAttempt] = useState(0);
  const next = useRef(onNext); next.current = onNext;
  const elapsed = useRef(0);
  useEffect(() => { const sub = AppState.addEventListener("change", s => setBackground(s !== "active")); return () => sub.remove(); }, []);
  useEffect(() => {
    if (!ready || error || paused || background || story.kind !== "img") return;
    let last = Date.now(); const t = setInterval(() => { const n = Date.now(); elapsed.current += n - last; last = n; setProgress(Math.min(1, elapsed.current / 7000)); if (elapsed.current >= 7000) { clearInterval(t); next.current(); } }, 100);
    return () => clearInterval(t);
  }, [ready, error, paused, background, story.kind]);
  return <View style={{ flex: 1, backgroundColor: "rgba(8,3,15,0.96)", alignItems: "center" }}>
    <View style={{ flex: 1, width: "100%", maxWidth: 480, paddingTop: inset.top + 8, paddingBottom: inset.bottom + 12 }}>
      <View style={{ flexDirection: "row", gap: 3, marginHorizontal: 14, marginBottom: 10 }}>
        {Array.from({ length: count }, (_, i) => <View key={i} style={{ flex: 1, height: 3, backgroundColor: "#675670", borderRadius: 2, overflow: "hidden" }}><View style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%`, height: 3, backgroundColor: "#fff" }} /></View>)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, gap: 4 }}>
        <Text numberOfLines={2} style={{ flex: 1, color: "#fff", fontWeight: "700", fontSize: 16, paddingLeft: 8 }}>{story.title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={paused ? "Продолжить сторис" : "Приостановить сторис"} onPress={() => setPaused(p => !p)} style={{ padding: 12 }}><Ionicons name={paused ? "play" : "pause"} color="#fff" size={22} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть сторис" onPress={onClose} style={{ padding: 12 }}><Ionicons name="close" size={25} color="#fff" /></Pressable>
      </View>
      <View style={{ flex: 1, marginTop: 8, backgroundColor: "#12091c", overflow: "hidden", borderRadius: 16 }}>
        {error ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}><Text style={{ color: "#fff", textAlign: "center" }}>Не удалось загрузить {story.kind === "video" ? "видео" : "фото"}</Text><Pressable accessibilityRole="button" onPress={() => { setError(false); setReady(false); setAttempt(a => a + 1); }}><Text style={{ color: "#e3caff", fontWeight: "700", padding: 12 }}>Повторить</Text></Pressable>{story.kind === "video" ? <Pressable onPress={() => { setPaused(true); void Linking.openURL(storyMediaUrl(story.mediaUrl)!).catch(() => {}); }}><Text style={{ color: "#e3caff", padding: 12 }}>Открыть видео отдельно</Text></Pressable> : null}</View>
          : story.kind === "img" ? <Image key={attempt} source={{ uri: storyMediaUrl(story.mediaUrl)! }} contentFit="contain" style={{ width: "100%", height: "100%" }} onLoad={() => setReady(true)} onError={() => setError(true)} />
            : <StoryVideo key={attempt} uri={storyMediaUrl(story.mediaUrl)!} paused={paused || background} onReady={() => setReady(true)} onProgress={setProgress} onEnd={onNext} onError={() => setError(true)} />}
        {!ready && !error ? <ActivityIndicator style={{ position: "absolute", top: "48%", alignSelf: "center" }} color="#fff" /> : null}
        {index > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Предыдущая сторис" onPress={onPrevious} style={{ position: "absolute", left: 2, top: "45%", padding: 12, borderRadius: 24, backgroundColor: "#14092288" }}><Ionicons name="chevron-back" color="#fff" size={22} /></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Следующая сторис" onPress={onNext} style={{ position: "absolute", right: 2, top: "45%", padding: 12, borderRadius: 24, backgroundColor: "#14092288" }}><Ionicons name="chevron-forward" color="#fff" size={22} /></Pressable>
      </View>
      {storyDestination(story.link) ? <Pressable accessibilityRole="link" accessibilityLabel={story.linkLabel || "Подробнее"} onPress={onLink} style={{ backgroundColor: "#e82c87", borderRadius: 28, minHeight: 52, marginTop: 12, marginHorizontal: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, padding: 12 }}><Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>{story.linkLabel || "Подробнее"}</Text><Ionicons name="open-outline" color="#fff" size={20} /></Pressable> : null}
    </View>
  </View>;
}

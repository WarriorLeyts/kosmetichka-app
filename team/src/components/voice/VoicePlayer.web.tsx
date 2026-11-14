import { createElement, useEffect, useRef, useState } from "react";
import { voiceTime } from "./types";
import { Pressable, Text, View } from "react-native";

export function VoicePlayer({ uri, duration = 0, color = "#222" }: { uri: string; duration?: number; color?: string }) {
  const media = useRef<HTMLAudioElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { const audio = media.current; return () => { audio?.pause(); audio?.removeAttribute("src"); }; }, [uri, attempt]);
  return (
    <View style={{ width: 230, maxWidth: "100%", gap: 5 }}>
      <Text style={{ color, fontSize: 12 }}>Голосовое сообщение{duration > 0 ? ` · ${voiceTime(duration)}` : ""}</Text>
      {createElement("audio", {
        ref: media,
        key: attempt, src: uri, controls: true, preload: "none", "aria-label": "Голосовое сообщение",
        style: { width: "100%", height: 42 },
        onPlay: (e: { currentTarget: HTMLAudioElement }) => { document.querySelectorAll("audio").forEach((a) => { if (a !== e.currentTarget) a.pause(); }); },
        onError: () => setFailed(true),
      })}
      {failed ? <Pressable accessibilityRole="button" onPress={() => { setFailed(false); setAttempt((n) => n + 1); }}><Text style={{ color, fontSize: 12 }}>Не удалось воспроизвести. Повторить</Text></Pressable> : null}
    </View>
  );
}

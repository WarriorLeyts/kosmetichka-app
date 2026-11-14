import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { voiceTime } from "./types";
let active: { id: number; pause: () => void } | null = null;
export function stopVoicePlayback() { active?.pause(); active = null; }

export function VoicePlayer({ uri, duration = 0, color = "#222" }: { uri: string; duration?: number; color?: string }) {
  const player = useAudioPlayer(null, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const loaded = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    return () => { if (active?.id === player.id) active = null; };
  }, [player]);
  const toggle = async () => {
    try {
      setError(false);
      if (status.playing) { player.pause(); return; }
      stopVoicePlayback();
      active = { id: player.id, pause: () => player.pause() };
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (!loaded.current) { player.replace(uri); loaded.current = true; }
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) await player.seekTo(0);
      player.play();
    } catch { loaded.current = false; setError(true); }
  };
  const length = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : duration;
  return (
    <View style={{ width: 220, gap: 5 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? "Приостановить голосовое сообщение" : "Воспроизвести голосовое сообщение"} onPress={toggle} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }}>
        <Ionicons name={status.playing ? "pause-circle" : "play-circle"} size={38} color={color} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color, fontSize: 13 }}>Голосовое сообщение</Text>
          <View style={{ height: 3, backgroundColor: "rgba(128,128,128,0.25)", borderRadius: 3 }}><View style={{ height: 3, width: `${length > 0 ? Math.min(100, status.currentTime / length * 100) : 0}%`, backgroundColor: color }} /></View>
          <Text style={{ color, fontSize: 12 }}>{voiceTime(status.currentTime)} / {voiceTime(length)}</Text>
        </View>
      </Pressable>
      {error ? <Text style={{ color, fontSize: 12 }}>Не удалось воспроизвести. Нажмите ещё раз.</Text> : null}
    </View>
  );
}

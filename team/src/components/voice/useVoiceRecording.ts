import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { stopVoicePlayback } from "./VoicePlayer";
import { MAX_VOICE_SECONDS, type VoiceFile, type VoicePhase } from "./types";

export function useVoiceRecording() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [file, setFile] = useState<VoiceFile | null>(null);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const busy = useRef(false);
  const stopping = useRef(false);
  const recording = useRef(false);
  const uri = useRef<string | null>(null);
  const started = useRef(0);
  const stop = useCallback(async () => {
    if (!recording.current || stopping.current) return;
    stopping.current = true;
    setPhase("stopping");
    try {
      const duration = Math.min(MAX_VOICE_SECONDS, (Date.now() - started.current) / 1000);
      await recorder.stop();
      recording.current = false;
      await setAudioModeAsync({ allowsRecording: false });
      uri.current = recorder.uri;
      if (!alive.current) return;
      if (!uri.current || duration < 0.3) throw new Error("Запись слишком короткая. Запишите сообщение ещё раз.");
      setFile({ uri: uri.current, name: `voice-${Date.now()}.m4a`, mime: "audio/mp4", duration });
      setPhase("ready");
    } catch (e) {
      if (alive.current) { setError(e instanceof Error ? e.message : "Не удалось сохранить запись."); setPhase("idle"); }
    } finally { stopping.current = false; busy.current = false; }
  }, [recorder]);
  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setError(""); setPhase("starting");
    try {
      stopVoicePlayback();
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error("Нет доступа к микрофону. Разрешите его в настройках приложения.");
      if (!alive.current) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (!alive.current) { await recorder.stop(); await setAudioModeAsync({ allowsRecording: false }); return; }
      recorder.record(); recording.current = true; started.current = Date.now(); setPhase("recording");
    } catch (e) {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      busy.current = false;
      if (alive.current) { setError(e instanceof Error ? e.message : "Не удалось включить микрофон."); setPhase("idle"); }
    }
  }, [recorder]);
  useEffect(() => { if (state.durationMillis >= MAX_VOICE_SECONDS * 1000) void stop(); }, [state.durationMillis, stop]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => { if (s !== "active") void stop(); });
    return () => sub.remove();
  }, [stop]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      try { if (recording.current) void recorder.stop().catch(() => {}); } catch { /* released by expo-audio */ }
      void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      if (uri.current) void FileSystem.deleteAsync(uri.current, { idempotent: true }).catch(() => {});
    };
  }, [recorder]);
  return { phase, file, elapsed: state.durationMillis / 1000, error, start, stop };
}

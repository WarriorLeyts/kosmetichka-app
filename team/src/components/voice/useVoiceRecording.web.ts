import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_VOICE_SECONDS, type VoiceFile, type VoicePhase } from "./types";

/** The microphone belongs to this draft only; leaving the chat always releases it. */
export function useVoiceRecording() {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [file, setFile] = useState<VoiceFile | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const alive = useRef(true);
  const busy = useRef(false);
  const url = useRef<string | null>(null);
  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") {
      setPhase("stopping");
      recorder.current.stop();
    }
  }, []);
  const start = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setError("");
    setPhase("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Запись недоступна в этом браузере. Откройте сайт в Safari или Chrome и разрешите микрофон.");
      document.querySelectorAll("audio").forEach((a) => a.pause());
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { input.getTracks().forEach((t) => t.stop()); return; }
      stream.current = input;
      const mime = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error("Браузер не поддерживает запись звука. Попробуйте обновить Safari или Chrome.");
      const rec = new MediaRecorder(input, { mimeType: mime, audioBitsPerSecond: 96000 });
      recorder.current = rec;
      const chunks: Blob[] = [];
      let failed = false;
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onerror = () => {
        failed = true;
        input.getTracks().forEach((t) => t.stop());
        busy.current = false;
        if (alive.current) { setError("Запись прервалась. Попробуйте ещё раз."); setPhase("idle"); }
      };
      rec.onstop = () => {
        input.getTracks().forEach((t) => t.stop());
        busy.current = false;
        if (!alive.current || failed) return;
        const duration = Math.min(MAX_VOICE_SECONDS, (Date.now() - started.current) / 1000);
        const blob = new Blob(chunks, { type: mime });
        if (!blob.size || duration < 0.3) { setError("Запись слишком короткая. Запишите сообщение ещё раз."); setPhase("idle"); return; }
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(blob);
        const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "weba";
        setFile({ uri: url.current, name: `voice-${Date.now()}.${ext}`, mime, duration });
        setPhase("ready");
      };
      started.current = Date.now();
      rec.start();
      setPhase("recording");
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      busy.current = false;
      if (alive.current) {
        const denied = e instanceof DOMException && ["NotAllowedError", "PermissionDeniedError"].includes(e.name);
        setError(denied ? "Нет доступа к микрофону. Разрешите его в настройках браузера для этого сайта." : e instanceof Error ? e.message : "Не удалось включить микрофон.");
        setPhase("idle");
      }
    }
  }, []);
  useEffect(() => {
    if (phase !== "recording") return;
    const tick = () => { const n = (Date.now() - started.current) / 1000; setElapsed(n); if (n >= MAX_VOICE_SECONDS) stop(); };
    const timer = setInterval(tick, 200);
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hidden);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", hidden); };
  }, [phase, stop]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  return { phase, file, elapsed, error, start, stop };
}

export const MAX_VOICE_SECONDS = 300;
export type VoiceFile = { uri: string; name: string; mime: string; duration: number };
export type VoicePhase = "idle" | "starting" | "recording" | "stopping" | "ready";
export function voiceTime(seconds: number) {
  const n = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

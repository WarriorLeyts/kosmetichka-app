import { useEffect, useRef } from "react";
import type { StoryVideoProps } from "./videoTypes";

export function StoryVideo({ uri, paused, onReady, onProgress, onEnd, onError }: StoryVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const v = ref.current; if (!v) return; if (paused) v.pause(); else void v.play().catch(() => {}); }, [paused, uri]);
  return <video ref={ref} src={uri} playsInline autoPlay muted controls preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain", background: "#12091c" }}
    onLoadedData={onReady} onTimeUpdate={e => { const v = e.currentTarget; if (Number.isFinite(v.duration) && v.duration > 0) onProgress(v.currentTime / v.duration); }} onEnded={onEnd} onError={onError} />;
}

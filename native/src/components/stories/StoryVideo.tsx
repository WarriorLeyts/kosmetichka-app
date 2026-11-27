import { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";
import type { StoryVideoProps } from "./videoTypes";

export function StoryVideo({ uri, paused, onReady, onProgress, onEnd, onError }: StoryVideoProps) {
  const ref = useRef<WebView>(null);
  useEffect(() => { ref.current?.injectJavaScript(`var v=document.querySelector('video');if(v){${paused ? "v.pause()" : "v.play().catch(function(){})"}};true;`); }, [paused]);
  // uri is accepted only through storyMediaUrl (our own random upload path).
  const html = `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><body style="margin:0;background:#12091c;overflow:hidden"><video src="${uri}" controls playsinline autoplay muted style="width:100vw;height:100vh;object-fit:contain"></video><script>var v=document.querySelector('video');function send(x){window.ReactNativeWebView.postMessage(JSON.stringify(x))}v.onloadeddata=function(){send({ready:true})};v.onended=function(){send({end:true})};v.onerror=function(){send({error:true})};v.ontimeupdate=function(){if(isFinite(v.duration)&&v.duration>0)send({progress:v.currentTime/v.duration})};</script></body></html>`;
  return <WebView ref={ref} source={{ html, baseUrl: "https://kosmetichka-opt.ru" }} originWhitelist={["https://kosmetichka-opt.ru", "about:blank"]} style={{ flex: 1, backgroundColor: "#12091c" }} scrollEnabled={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} setSupportMultipleWindows={false}
    onShouldStartLoadWithRequest={r => r.url === "about:blank" || r.url.startsWith("https://kosmetichka-opt.ru/")}
    onLoadEnd={() => { if (paused) ref.current?.injectJavaScript("var v=document.querySelector('video');if(v)v.pause();true;"); }}
    onError={onError} onMessage={e => { try { const x = JSON.parse(e.nativeEvent.data); if (x.ready) onReady(); if (x.end) onEnd(); if (x.error) onError(); if (typeof x.progress === "number") onProgress(Math.max(0, Math.min(1, x.progress))); } catch {} }} />;
}

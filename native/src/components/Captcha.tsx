import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../theme";
import { CaptchaFailed } from "./CaptchaFailed";
import { CAPTCHA_HOSTS, SMARTCAPTCHA_KEY, type CaptchaProps } from "../captchaConfig";
export { SMARTCAPTCHA_KEY } from "../captchaConfig";

const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}#c{height:100px}</style>
</head><body><div id="c"></div><script>
function send(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}
var initialized=false,hosts=${JSON.stringify(CAPTCHA_HOSTS)};
function init(){
 if(initialized||!window.smartCaptcha)return;
 initialized=true;
 try{
  var sc=window.smartCaptcha,id=sc.render("c",{sitekey:"${SMARTCAPTCHA_KEY}",hl:"ru",webview:true,callback:function(token){send({t:"token",token:token})}});
  sc.subscribe(id,"token-expired",function(){send({t:"expired"})});
  sc.subscribe(id,"network-error",function(){send({t:"error"})});
  sc.subscribe(id,"javascript-error",function(){send({t:"error"})});
  send({t:"ready"});
 }catch(e){send({t:"error"})}
}
function load(n){
 if(n>=hosts.length){send({t:"error"});return}
 var s=document.createElement("script"),done=false;
 function next(){if(done)return;done=true;clearTimeout(timer);s.remove();load(n+1)}
 function ready(){if(done||!window.smartCaptcha)return;done=true;clearTimeout(timer);init()}
 var timer=setTimeout(next,10000);
 window.__kosmetichkaCaptchaReady=ready;
 s.src=hosts[n]+"/captcha.js?render=onload&onload=__kosmetichkaCaptchaReady";
 s.async=true;s.onerror=next;s.onload=ready;document.head.appendChild(s);
}
load(0);
</script></body></html>`;
const SOURCE = { html, baseUrl: "https://kosmetichka-opt.ru" };
const ALLOWED = /^https:\/\/(kosmetichka-opt\.ru|smartcaptcha\.cloud\.yandex\.ru|smartcaptcha\.yandexcloud\.net)(?::443)?(?:[/?#]|$)/i;

export function Captcha({ onToken, onExpired, onStatusChange }: CaptchaProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const answered = useRef(false);
  const invalidated = useRef(false);
  const cb = useRef({ onToken, onExpired, onStatusChange });
  cb.current = { onToken, onExpired, onStatusChange };
  const fail = () => {
    invalidated.current = true;
    answered.current = true;
    cb.current.onExpired?.(); cb.current.onStatusChange?.("failed"); setFailed(true);
  };
  useEffect(() => {
    answered.current = false;
    invalidated.current = false;
    cb.current.onExpired?.(); cb.current.onStatusChange?.("loading");
    const timer = setTimeout(() => { if (!answered.current) { invalidated.current = true; cb.current.onExpired?.(); cb.current.onStatusChange?.("failed"); setFailed(true); } }, 25000);
    return () => clearTimeout(timer);
  }, [attempt]);
  if (failed) return <CaptchaFailed onRetry={() => { setFailed(false); setReady(false); setAttempt(n => n + 1); }} />;
  return <View style={{ height: 110, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
    {!ready ? <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.violet} /></View> : null}
    <WebView key={attempt} onError={fail} originWhitelist={["*"]} source={SOURCE} style={{ backgroundColor: "transparent" }} scrollEnabled={false} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false}
      onShouldStartLoadWithRequest={r => r.url.startsWith("about:") || r.url.startsWith("data:") || ALLOWED.test(r.url)}
      onMessage={e => {
        try {
          const m = JSON.parse(e.nativeEvent.data);
          if (m.t === "ready" && !invalidated.current) { answered.current = true; setReady(true); cb.current.onStatusChange?.("ready"); }
          if (m.t === "token" && !invalidated.current && typeof m.token === "string" && m.token) cb.current.onToken(m.token);
          if (m.t === "expired") cb.current.onExpired?.();
          if (m.t === "error") fail();
        } catch { /* ignore malformed bridge messages */ }
      }} />
  </View>;
}

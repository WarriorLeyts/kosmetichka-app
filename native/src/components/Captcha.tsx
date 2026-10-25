import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../theme";

/** The site's public Yandex SmartCaptcha key (the same one the website uses). */
export const SMARTCAPTCHA_KEY = "ysc1_zPBcrJYGrC7s0G9CVZLokJ1ekpa0sKcqvAZoqBjObd8ec5f9";

const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}#c{height:100px}</style>
<script src="https://smartcaptcha.yandexcloud.net/captcha.js?render=onload&onload=init" defer></script>
</head><body><div id="c"></div><script>
function send(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m))}
function init(){
  if(!window.smartCaptcha){send({t:"error"});return}
  window.smartCaptcha.render("c",{sitekey:"${SMARTCAPTCHA_KEY}",hl:"ru",
    callback:function(token){send({t:"token",token:token})},
    "expired-callback":function(){send({t:"expired"})}});
  send({t:"ready"});
}
</script></body></html>`;

const ALLOWED = /^https:\/\/(kosmetichka-opt\.ru|smartcaptcha\.yandexcloud\.net)(?::443)?(?:[/?#]|$)/i;

/**
 * Renders the website's «Я не робот» check inside a native WebView. The page is
 * loaded with the site's own origin so the captcha key's domain check passes.
 */
export function Captcha({ onToken, onExpired }: { onToken: (token: string) => void; onExpired?: () => void }) {
  const [ready, setReady] = useState(false);
  return (
    <View style={{ height: 110, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
      {!ready && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.violet} />
        </View>
      )}
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://kosmetichka-opt.ru" }}
        style={{ backgroundColor: "transparent" }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        // the captcha page may only load itself and Yandex SmartCaptcha — nothing else
        // (exact hosts: a prefix check would also let «https://kosmetichka-opt.ru.evil.com» through)
        onShouldStartLoadWithRequest={(r) => r.url.startsWith("about:") || r.url.startsWith("data:") || ALLOWED.test(r.url)}
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.t === "ready") setReady(true);
            if (m.t === "token" && m.token) onToken(m.token);
            if (m.t === "expired") onExpired?.();
          } catch {
            /* ignore */
          }
        }}
        onLoadEnd={() => setTimeout(() => setReady(true), 1500)}
      />
    </View>
  );
}

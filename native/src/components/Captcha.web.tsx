import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { CaptchaFailed } from "./CaptchaFailed";

/** The site's public Yandex SmartCaptcha key (the same one the website uses). */
export const SMARTCAPTCHA_KEY = "ysc1_zPBcrJYGrC7s0G9CVZLokJ1ekpa0sKcqvAZoqBjObd8ec5f9";

type SmartCaptcha = {
  render: (el: HTMLElement, o: { sitekey: string; hl: string; callback: (t: string) => void; "expired-callback"?: () => void }) => number;
};

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if ((window as unknown as { smartCaptcha?: SmartCaptcha }).smartCaptcha) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://smartcaptcha.yandexcloud.net/captcha.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        loading = null;
        reject(new Error("captcha"));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Website version: the «Я не робот» check rendered straight into the page (no WebView in a browser). */
export function Captcha({ onToken, onExpired }: { onToken: (token: string) => void; onExpired?: () => void }) {
  const box = useRef<View>(null);
  const cb = useRef({ onToken, onExpired });
  useEffect(() => {
    cb.current = { onToken, onExpired };
  });

  // the check didn't load (no internet, blocked by the browser): say so instead of an empty space
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadScript()
      .then(() => {
        const el = box.current as unknown as HTMLElement | null;
        const sc = (window as unknown as { smartCaptcha?: SmartCaptcha }).smartCaptcha;
        if (!alive || !el || !sc) return;
        el.innerHTML = "";
        sc.render(el, {
          sitekey: SMARTCAPTCHA_KEY,
          hl: "ru",
          callback: (t) => cb.current.onToken(t),
          "expired-callback": () => cb.current.onExpired?.(),
        });
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  // the box stays mounted, so «Повторить» can render the check into it again
  return (
    <>
      {failed ? <CaptchaFailed onRetry={() => setAttempt((n) => n + 1)} /> : null}
      <View ref={box} style={failed ? { display: "none" } : { minHeight: 102, marginBottom: 14 }} />
    </>
  );
}


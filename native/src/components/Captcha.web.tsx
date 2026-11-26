import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { CaptchaFailed } from "./CaptchaFailed";
import { SMARTCAPTCHA_KEY, type CaptchaProps } from "../captchaConfig";
import { loadSmartCaptcha } from "../captchaLoader.web";
export { SMARTCAPTCHA_KEY } from "../captchaConfig";

export function Captcha(props: CaptchaProps) {
  const box = useRef<View>(null);
  const cb = useRef(props);
  cb.current = props;
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    let broken = false;
    let dispose = () => {};
    setFailed(false);
    cb.current.onExpired?.(); cb.current.onStatusChange?.("loading");
    const fail = () => {
      if (!alive) return;
      broken = true;
      cb.current.onExpired?.(); cb.current.onStatusChange?.("failed"); setFailed(true);
    };
    loadSmartCaptcha().then(sc => {
      const el = box.current as unknown as HTMLElement | null;
      if (!alive || !el) return;
      el.innerHTML = "";
      const id = sc.render(el, { sitekey: SMARTCAPTCHA_KEY, hl: "ru", callback: (token: string) => { if (alive && !broken) cb.current.onToken(token); } });
      const off = ["network-error", "javascript-error"].map(event => sc.subscribe?.(id, event, fail));
      off.push(sc.subscribe?.(id, "token-expired", () => { if (alive) cb.current.onExpired?.(); }));
      dispose = () => { off.forEach(unsubscribe => unsubscribe?.()); sc.destroy?.(id); };
      if (!broken) cb.current.onStatusChange?.("ready");
    }).catch(fail);
    return () => { alive = false; dispose(); };
  }, [attempt]);
  return <>
    {failed ? <CaptchaFailed onRetry={() => setAttempt(n => n + 1)} /> : null}
    <View ref={box} style={failed ? { display: "none" } : { minHeight: 102, marginBottom: 14 }} />
  </>;
}

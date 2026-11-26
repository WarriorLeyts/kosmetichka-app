import { CAPTCHA_HOSTS } from "./captchaConfig";
export type SmartCaptcha = {
  render: (el: HTMLElement, options: Record<string, unknown>) => number;
  destroy?: (id: number) => void;
  subscribe?: (id: number, event: string, callback: () => void) => () => void;
};
type CaptchaWindow = Window & { smartCaptcha?: SmartCaptcha; __kosmetichkaCaptchaReady?: () => void };
const api = () => (window as CaptchaWindow).smartCaptcha;
let loading: Promise<SmartCaptcha> | null = null;
function attempt(host: string): Promise<SmartCaptcha> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      const current = api();
      if (!error && !current?.render) return;
      settled = true; clearTimeout(timer);
      script.onload = null; script.onerror = null;
      (window as CaptchaWindow).__kosmetichkaCaptchaReady = () => {};
      if (error) { script.remove(); reject(error); } else resolve(current!);
    };
    const timer = setTimeout(() => finish(new Error("Captcha loading timed out")), 10000);
    (window as CaptchaWindow).__kosmetichkaCaptchaReady = () => finish();
    script.src = `${host}/captcha.js?render=onload&onload=__kosmetichkaCaptchaReady`;
    script.async = true; script.onload = () => finish();
    script.onerror = () => finish(new Error("Captcha script unavailable"));
    document.head.appendChild(script);
  });
}
export function loadSmartCaptcha(): Promise<SmartCaptcha> {
  const current = api();
  if (current?.render) return Promise.resolve(current);
  if (!loading) loading = (async () => {
    for (const host of CAPTCHA_HOSTS) {
      try { return await attempt(host); } catch { /* try the other official endpoint */ }
    }
    throw new Error("Captcha unavailable");
  })().catch(error => { loading = null; throw error; });
  return loading;
}

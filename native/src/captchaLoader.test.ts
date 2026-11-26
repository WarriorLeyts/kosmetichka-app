import { afterEach, beforeEach, expect, it, vi } from "vitest";

type Script = { src: string; onload?: () => void; onerror?: () => void; remove: ReturnType<typeof vi.fn> };
let scripts: Script[];
let browser: { smartCaptcha?: { render: ReturnType<typeof vi.fn> }; __kosmetichkaCaptchaReady?: () => void };
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); scripts = []; browser = {};
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", {
    createElement: () => ({ remove: vi.fn() }),
    head: { appendChild: (script: Script) => scripts.push(script) },
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const succeed = () => { browser.smartCaptcha = { render: vi.fn() }; scripts.at(-1)?.onload?.(); };

it("shares one SDK load and falls back when the preferred endpoint fails", async () => {
  const { loadSmartCaptcha } = await import("./captchaLoader.web");
  const pending = loadSmartCaptcha();
  expect(loadSmartCaptcha()).toBe(pending);
  expect(scripts[0].src).toContain("smartcaptcha.cloud.yandex.ru/captcha.js");
  scripts[0].onerror?.(); await vi.advanceTimersByTimeAsync(0);
  expect(scripts[0].remove).toHaveBeenCalled();
  expect(scripts[1].src).toContain("smartcaptcha.yandexcloud.net/captcha.js");
  succeed(); expect(await pending).toBe(browser.smartCaptcha);
});
it("times out even when a script loads without providing an API", async () => {
  const { loadSmartCaptcha } = await import("./captchaLoader.web");
  const pending = loadSmartCaptcha(); scripts[0].onload?.();
  await vi.advanceTimersByTimeAsync(10000);
  expect(scripts).toHaveLength(2); succeed();
  await expect(pending).resolves.toBe(browser.smartCaptcha);
});
it("allows a fresh retry after both endpoints time out", async () => {
  const { loadSmartCaptcha } = await import("./captchaLoader.web");
  const pending = loadSmartCaptcha();
  const rejected = expect(pending).rejects.toThrow("Captcha unavailable");
  await vi.advanceTimersByTimeAsync(20000); await rejected;
  expect(scripts.every(script => script.remove.mock.calls.length === 1)).toBe(true);
  const retry = loadSmartCaptcha(); expect(scripts).toHaveLength(3);
  succeed(); await expect(retry).resolves.toBe(browser.smartCaptcha);
});

import { requireOptionalNativeModule } from "expo";

type UiScaleModule = { getScale(): number; setScale(scale: number): void; restart(): void };

/** Native module from modules/ui-scale (Android). Null where it is not available (iOS for now). */
const native = requireOptionalNativeModule<UiScaleModule>("UiScale");

export const UI_SIZES = [
  { value: "0.8", label: "Мелкий" },
  { value: "0.9", label: "Средний" },
  { value: "1", label: "Крупный" },
  { value: "1.1", label: "Очень крупный" },
] as const;

export const uiScale = {
  available: !!native,
  get(): string {
    const v = native?.getScale() ?? 1;
    const best = UI_SIZES.reduce((a, b) => (Math.abs(Number(b.value) - v) < Math.abs(Number(a.value) - v) ? b : a));
    return best.value;
  },
  /** Saves the size and restarts the app so every screen is drawn at the new size. */
  apply(value: string) {
    if (!native) return;
    native.setScale(Number(value));
    native.restart();
  },
};

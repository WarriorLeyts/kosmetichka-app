import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, type TextProps } from "react-native";

type Props = TextProps & { minimumFontScale?: number; children?: React.ReactNode };

/**
 * One line of text that gets smaller to fit instead of being cut with «…» (prices, sums, buttons).
 * Phones: the system's adjustsFontSizeToFit. Browser (the site): react-native-web ignores that prop,
 * so the font is reduced until the text fits its box (scrollWidth ≤ clientWidth), down to minimumFontScale.
 */
function FitTextNative({ minimumFontScale = 0.5, ...rest }: Props) {
  return <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={minimumFontScale} {...rest} />;
}

function textOf(children: React.ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textOf).join("");
  return "";
}

function FitTextWeb({ minimumFontScale = 0.5, style, onLayout, children, ...rest }: Props) {
  const base = Number(StyleSheet.flatten(style)?.fontSize ?? 14);
  const [size, setSize] = useState(base);
  const ref = useRef<HTMLElement | null>(null);
  const [tick, setTick] = useState(0);
  const lastWidth = useRef(0);
  const [check, setCheck] = useState(0);
  const text = textOf(children);

  // new text / size / width / fonts → start from the full size again
  useEffect(() => setSize(base), [base, text, tick]);
  useEffect(() => {
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    fonts?.ready.then(() => setTick((t) => t + 1)).catch(() => {});
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const min = base * minimumFontScale;
    if (el.scrollWidth > el.clientWidth + 1 && size > min + 0.25) {
      setSize(Math.max(min, Math.floor(size * (el.clientWidth / el.scrollWidth) * 4) / 4));
    }
  }, [size, base, minimumFontScale, text, tick, check]);

  return (
    <Text
      {...rest}
      ref={ref as never}
      numberOfLines={1}
      style={[style, { fontSize: size }]}
      onLayout={(e) => {
        onLayout?.(e);
        // more room (wider window) → start from the full size; less room → just fit again.
        // (the box getting narrower because the text shrank must not restart — that would loop)
        const w = Math.round(e.nativeEvent.layout.width);
        if (lastWidth.current && w > lastWidth.current + 1 && size >= base) setTick((t) => t + 1);
        else if (lastWidth.current && w < lastWidth.current - 1) setCheck((x) => x + 1);
        lastWidth.current = w;
      }}
    >
      {children}
    </Text>
  );
}

export const FitText = Platform.OS === "web" ? FitTextWeb : FitTextNative;

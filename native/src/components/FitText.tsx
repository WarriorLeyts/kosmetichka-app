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
    // scrollWidth / clientWidth are whole pixels: a text 0.4 px too wide «fits» by them but is cut with «…»,
    // so the text's real width is measured (a range over it) against the box's
    const box = el.getBoundingClientRect().width;
    let text = el.scrollWidth;
    try {
      const r = document.createRange();
      r.selectNodeContents(el);
      text = Math.max(r.getBoundingClientRect().width, el.scrollWidth > el.clientWidth ? el.scrollWidth : 0);
    } catch {
      /* old browser: whole pixels */
    }
    if (box > 0 && text > box + 0.1 && size > min + 0.25) {
      setSize(Math.max(min, Math.floor(size * (box / text) * 0.98 * 4) / 4));
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
        // the box getting narrower because the text shrank must not restart from the full size — that would loop
        const w = Math.round(e.nativeEvent.layout.width);
        const was = lastWidth.current;
        lastWidth.current = w;
        if (Math.abs(w - was) <= 1) return;
        if (was && w > was && size < base) setTick((t) => t + 1); // more room → from the full size again
        else setCheck((x) => x + 1); // first real width / less room → fit
      }}
    >
      {children}
    </Text>
  );
}

export const FitText = Platform.OS === "web" ? FitTextWeb : FitTextNative;

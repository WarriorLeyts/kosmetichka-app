import { Platform } from "react-native";

/**
 * Website on an iPhone/iPad: Safari zooms the page into a focused field whose text is under 16px
 * and leaves it zoomed. `maximum-scale=1` stops that (pinch zoom still works on iOS); only on iOS,
 * on Android it would block pinch zoom.
 */
if (Platform.OS === "web" && typeof document !== "undefined") {
  const n = navigator as Navigator & { maxTouchPoints?: number };
  const ios = /iP(hone|ad|od)/.test(n.userAgent) || (n.platform === "MacIntel" && (n.maxTouchPoints ?? 0) > 1);
  if (ios) {
    document.querySelectorAll('meta[name="viewport"]').forEach((m) => {
      const c = m.getAttribute("content") || "";
      if (!/maximum-scale/.test(c)) m.setAttribute("content", `${c}${c ? ", " : ""}maximum-scale=1`);
    });
  }
}

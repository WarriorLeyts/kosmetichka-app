import { Platform } from "react-native";
import { webPageScale } from "./webScale";

/**
 * Website on an iPhone/iPad: Safari zooms the page into a focused field whose text is under 16px
 * and leaves it zoomed. A maximum-scale equal to the page scale stops that (Safari only zooms into
 * a field when minimum and maximum scale differ; pinch zoom still works on iOS). Only on iOS, on
 * Android it would block pinch zoom. On a phone the page scale is < 1 (public/index.html).
 */
if (Platform.OS === "web" && typeof document !== "undefined") {
  const n = navigator as Navigator & { maxTouchPoints?: number };
  const ios = /iP(hone|ad|od)/.test(n.userAgent) || (n.platform === "MacIntel" && (n.maxTouchPoints ?? 0) > 1);
  if (ios) {
    const k = webPageScale();
    document.querySelectorAll('meta[name="viewport"]').forEach((m) => {
      const c = (m.getAttribute("content") || "")
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p && !/^(maximum|minimum)-scale/.test(p));
      c.push(`maximum-scale=${k}`);
      if (k < 1) c.push(`minimum-scale=${k}`);
      m.setAttribute("content", c.join(", "));
    });
  }
}

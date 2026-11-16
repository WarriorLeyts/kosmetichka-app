import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, Platform, Pressable, Text, View } from "react-native";
import { SafeImage } from "./SafeImage";
import { imageUrl } from "../api";
import type { Product } from "../types";
export function AssortmentPhoto({ product }: { product: Product }) {
  const photos = product.variants ?? [];
  const [index, setIndex] = useState(0);
  const node = useRef<View>(null);
  const visible = useRef(true);
  useEffect(() => {
    setIndex(0);
    let reduce = false;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { reduce = v; }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", v => { reduce = v; });
    let observer: IntersectionObserver | undefined;
    if (Platform.OS === "web" && typeof IntersectionObserver !== "undefined" && node.current) {
      observer = new IntersectionObserver(entries => { visible.current = entries[0]?.isIntersecting ?? false; });
      observer.observe(node.current as unknown as Element);
    }
    const timer = setInterval(() => {
      if (!reduce && visible.current && AppState.currentState === "active" && (typeof document === "undefined" || !document.hidden)) setIndex(i => (i + 1) % Math.max(1, photos.length));
    }, 3000);
    return () => { clearInterval(timer); subscription.remove(); observer?.disconnect(); };
  }, [product.id, photos.length]);
  return <View ref={node} style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
    <SafeImage uri={imageUrl(photos[index % Math.max(1, photos.length)]?.image.path, 480) ?? ""} style={{ width: "88%", height: "82%" }} contentFit="contain" transition={150} recyclingKey={`${product.id}-${index}`} />
    {photos.length > 1 && <View style={{ position: "absolute", bottom: 3, left: 4, right: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Предыдущее фото" onPress={e => { e.stopPropagation(); setIndex(i => (i + photos.length - 1) % photos.length); }} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ color: "#7131b6", fontSize: 20 }}>‹</Text></Pressable>
      <Text style={{ color: "#7131b6", fontSize: 11 }}>{photos.length <= 7 ? photos.map((_, i) => i === index ? "●" : "○").join(" ") : `${index + 1} / ${photos.length}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Следующее фото" onPress={e => { e.stopPropagation(); setIndex(i => (i + 1) % photos.length); }} hitSlop={8} style={{ paddingHorizontal: 12, paddingVertical: 5 }}><Text style={{ color: "#7131b6", fontSize: 20 }}>›</Text></Pressable>
    </View>}
  </View>;
}

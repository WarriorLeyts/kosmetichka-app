import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, AppState, FlatList, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { SafeImage } from "./SafeImage";
import { imageUrl } from "../api";
import type { Product } from "../types";
export function AssortmentPhoto({ product }: { product: Product }) {
  const photos = product.variants ?? [];
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const node = useRef<View>(null);
  const gallery = useRef<FlatList>(null);
  const visible = useRef(true);
  const dragging = useRef(false);
  const showSlide = useCallback((nextIndex: number) => {
    const next = (nextIndex + photos.length) % Math.max(1, photos.length);
    setIndex(next);
    gallery.current?.scrollToOffset({ offset: next * width, animated: !reduceMotion });
  }, [photos.length, width, reduceMotion]);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    let observer: IntersectionObserver | undefined;
    if (Platform.OS === "web" && typeof IntersectionObserver !== "undefined" && node.current) {
      observer = new IntersectionObserver(entries => { visible.current = entries[0]?.isIntersecting ?? false; });
      observer.observe(node.current as unknown as Element);
    }
    return () => { subscription.remove(); observer?.disconnect(); };
  }, []);
  useEffect(() => {
    setIndex(0);
    gallery.current?.scrollToOffset({ offset: 0, animated: false });
  }, [product.id, photos.length]);
  useEffect(() => {
    gallery.current?.scrollToOffset({ offset: index * width, animated: false });
    // Preserve the selected photo when a card changes size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);
  useEffect(() => {
    if (reduceMotion || photos.length < 2 || !width) return;
    const timer = setInterval(() => {
      if (!dragging.current && visible.current && AppState.currentState === "active" && (typeof document === "undefined" || !document.hidden)) showSlide(index + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [index, photos.length, reduceMotion, showSlide, width]);
  return <View ref={node} onLayout={e => { setWidth(e.nativeEvent.layout.width); setHeight(e.nativeEvent.layout.height); }} style={{ width: "100%", height: "100%" }}>
    {width > 0 && <FlatList ref={gallery} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      style={{ flex: 1 }} initialNumToRender={2} windowSize={3}
      keyExtractor={photo => String(photo.id)}
      getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      onScrollBeginDrag={() => { dragging.current = true; }}
      onScrollEndDrag={() => { dragging.current = false; }}
      onMomentumScrollEnd={e => { dragging.current = false; setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)))); }}
      renderItem={({ item }) => <View style={{ width, height: Math.max(0, height - (photos.length > 1 ? 32 : 0)), alignItems: "center", justifyContent: "center" }}>
        <SafeImage uri={imageUrl(item.image.path, 480) ?? ""} style={{ width: "88%", height: "94%" }} contentFit="contain" recyclingKey={`${product.id}-${item.id}`} />
      </View>} />}
    {photos.length > 1 && <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, height: 32 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Предыдущее фото" onPress={e => { e.stopPropagation(); showSlide(index - 1); }} hitSlop={4} style={{ paddingHorizontal: 10, paddingVertical: 6 }}><Ionicons name="chevron-back" size={18} color={colors.brand} /></Pressable>
      <Text accessibilityLabel={`Фото ${index + 1} из ${photos.length}`} style={{ color: "#1C1C1E", fontSize: 11, fontWeight: "600", minWidth: 48, textAlign: "center" }}>{index + 1} из {photos.length}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Следующее фото" onPress={e => { e.stopPropagation(); showSlide(index + 1); }} hitSlop={4} style={{ paddingHorizontal: 10, paddingVertical: 6 }}><Ionicons name="chevron-forward" size={18} color={colors.brand} /></Pressable>
    </View>}
  </View>;
}

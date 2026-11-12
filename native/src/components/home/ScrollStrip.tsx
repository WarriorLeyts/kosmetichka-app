import { useRef, useState, type ReactElement } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * A horizontal strip of products; on a computer with arrows «‹ ›» at the sides (a mouse can't swipe, and
 * without them a strip looks like it ends at the edge of the screen). The arrows hide at the ends.
 */
export function ScrollStrip<T>({ data, keyOf, render, itemWidth, desktop }: { data: T[]; keyOf: (x: T) => string; render: (x: T) => ReactElement; itemWidth: number; desktop: boolean }) {
  const ref = useRef<FlatList<T>>(null);
  const [x, setX] = useState(0);
  const [w, setW] = useState(0);
  const [cw, setCw] = useState(0);
  const step = Math.max(itemWidth, Math.floor(w / itemWidth) * itemWidth);
  const go = (dir: 1 | -1) => ref.current?.scrollToOffset({ offset: Math.max(0, Math.min(cw - w, x + dir * step)), animated: true });
  const canLeft = x > 4;
  const canRight = cw - w - x > 4;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <FlatList
        ref={ref}
        horizontal
        data={data}
        keyExtractor={keyOf}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: desktop ? 0 : 11 }}
        onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={32}
        onContentSizeChange={(cwidth) => setCw(cwidth)}
        renderItem={({ item }) => <View style={{ width: itemWidth }}>{render(item)}</View>}
      />
      {desktop && canLeft ? (
        <Pressable onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Назад" style={[styles.arrow, { left: -16 }]}>
          <Ionicons name="chevron-back" size={22} color="#8b3dff" />
        </Pressable>
      ) : null}
      {desktop && canRight ? (
        <Pressable onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Дальше" style={[styles.arrow, { right: -16 }]}>
          <Ionicons name="chevron-forward" size={22} color="#8b3dff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  arrow: {
    position: "absolute",
    top: "42%",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(103,47,190,0.25)",
    cursor: "pointer",
  } as object,
});

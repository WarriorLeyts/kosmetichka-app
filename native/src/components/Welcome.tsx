import { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, imageUrl } from "../api";
import { fonts } from "../theme";
import { Silk } from "./Silk";
import { LOGO } from "./PageTitle";
import { Button, tap } from "./ui";

const W = Dimensions.get("window").width;

type Slide = { key: string; title: string; text: string };

const SLIDES: Slide[] = [
  { key: "a", title: "БОЛЬШЕ,\nЧЕМ КОСМЕТИКА", text: "Оригинальные бренды\nдля вашей красоты" },
  { key: "b", title: "ЛЮКСОВЫЕ\nБРЕНДЫ", text: "Только оригинальная продукция" },
  { key: "c", title: "ОПТ\nИ РОЗНИЦА", text: "Актуальные остатки и цены из 1С,\nзаказ с подтверждением менеджера" },
];

/** First-launch slides from the mockup («Анимация и слоган», «Преимущества»). */
export function Welcome({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const list = useRef<FlatList<Slide>>(null);

  // real product photos from the catalog for the second slide
  useEffect(() => {
    api
      .catalog({ page: 1, onlyStock: true, quick: ["new"] })
      .then((r) => setPhotos(r.products.map((p) => imageUrl(p.images?.[0]?.path)).filter(Boolean).slice(0, 3) as string[]))
      .catch(() => {});
  }, []);

  const next = () => {
    if (index < SLIDES.length - 1) list.current?.scrollToIndex({ index: index + 1 });
    else onDone();
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "#110910", zIndex: 90 }]}>
      <Silk />
      <Pressable onPress={() => { tap(); onDone(); }} style={[styles.skip, { top: insets.top + 10 }]} hitSlop={10}>
        <Text style={styles.skipText}>Пропустить</Text>
      </Pressable>

      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { paddingTop: insets.top + 70 }]}>
            <View style={styles.art}>
              {i === 1 && photos.length > 0 ? (
                <View style={styles.collage}>
                  {photos.map((u, k) => (
                    <View key={u} style={[styles.tile, { transform: [{ rotate: `${(k - 1) * 9}deg` }, { translateY: k === 1 ? -18 : 6 }], zIndex: k === 1 ? 2 : 1 }]}>
                      <Image source={{ uri: u }} style={{ width: "88%", height: "88%" }} contentFit="contain" />
                    </View>
                  ))}
                </View>
              ) : i === 2 ? (
                <View style={styles.icons}>
                  {(["pricetags-outline", "cube-outline", "chatbubbles-outline"] as const).map((n) => (
                    <View key={n} style={styles.iconCircle}>
                      <Ionicons name={n} size={34} color="#ff6fb5" />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.logoGlow}>
                  <Image source={LOGO} style={{ width: 150, height: 150 }} contentFit="contain" />
                </View>
              )}
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button title={index === SLIDES.length - 1 ? "Начать" : "Далее"} onPress={next} style={{ alignSelf: "stretch" }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skip: { position: "absolute", right: 20, zIndex: 5 },
  skipText: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  slide: { width: W, alignItems: "center", paddingHorizontal: 28 },
  art: { height: 300, width: "100%", alignItems: "center", justifyContent: "center", marginBottom: 26 },
  logoGlow: {
    borderRadius: 90,
    shadowColor: "#ff1f8e",
    shadowOpacity: 0.85,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  collage: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  tile: {
    width: 120,
    height: 170,
    marginHorizontal: -10,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff1f8e",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  icons: { flexDirection: "row", gap: 16 },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1.5,
    borderColor: "rgba(255,111,181,0.6)",
    backgroundColor: "rgba(255,31,142,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.serif, color: "#fff", fontSize: 38, lineHeight: 42, textAlign: "center", letterSpacing: 1 },
  text: { color: "rgba(255,255,255,0.82)", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 14 },
  footer: { paddingHorizontal: 28, gap: 22, alignItems: "center" },
  dots: { flexDirection: "row", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.3)" },
  dotActive: { width: 22, backgroundColor: "#ff4fa8" },
});

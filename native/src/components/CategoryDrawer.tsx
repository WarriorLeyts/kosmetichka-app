import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo, Animated, BackHandler, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useIOS } from "../ios";
import { tap } from "./ui";
import type { Category } from "../types";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";
const GRADIENT = ["#a020f0", "#c21ae8", "#e82c87"] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selected: string | null;
  onSelect: (guid: string | null) => void;
};

const ICONS = {
  all: require("../../assets/categories/all.png"),
  perfume: require("../../assets/categories/perfume.png"),
  accessories: require("../../assets/categories/accessories.png"),
  body: require("../../assets/categories/body.png"),
  mouth: require("../../assets/categories/mouth.png"),
  nocat: require("../../assets/categories/nocat.png"),
  household: require("../../assets/categories/household.png"),
  decor: require("../../assets/categories/decor.png"),
  gift: require("../../assets/categories/gift.png"),
  depilation: require("../../assets/categories/depilation.png"),
  face: require("../../assets/categories/face.png"),
  hair: require("../../assets/categories/hair.png"),
  hands: require("../../assets/categories/hands.png"),
};

/** 3D icon by the meaning of the category name; null → fall back to an emoji. */
export function iconFor(name: string): number | null {
  const n = name.toLowerCase();
  const map: [RegExp, keyof typeof ICONS][] = [
    [/парфю|духи|аромат/, "perfume"],
    [/аксессуар/, "accessories"],
    [/полост|зуб|рта/, "mouth"],
    [/без категор/, "nocat"],
    [/бытов|хими|уборк/, "household"],
    [/декоратив|макияж/, "decor"],
    [/подароч|набор/, "gift"],
    [/депиляц|бритв/, "depilation"],
    [/лиц/, "face"],
    [/волос/, "hair"],
    [/ног|рук|ногт|маникюр/, "hands"],
    [/тел/, "body"],
  ];
  for (const [re, k] of map) if (re.test(n)) return ICONS[k];
  return null;
}

/** Emoji by the meaning of the category name (no people) — for categories without a 3D icon. */
function emojiFor(name: string): string {
  const n = name.toLowerCase();
  const map: [RegExp, string][] = [
    [/парфю|духи|аромат/, "🌸"],
    [/аксессуар/, "🎀"],
    [/полост|зуб|рта/, "🪥"],
    [/без категор/, "📁"],
    [/бытов|хими|уборк/, "🧽"],
    [/декоратив|макияж/, "💄"],
    [/подароч|набор/, "🎁"],
    [/депиляц|бритьё|бритв/, "🪒"],
    [/лиц/, "🫧"],
    [/волос/, "🪮"],
    [/ног|рук|ногт|маникюр/, "💅"],
    [/тел/, "🧴"],
    [/дет/, "🧸"],
    [/муж/, "🪒"],
    [/гигиен/, "🧻"],
    [/солнц|загар/, "☀️"],
    [/дом|интерьер|свеч/, "🕯️"],
    [/космет/, "✨"],
  ];
  for (const [re, e] of map) if (re.test(n)) return e;
  return "🛍️";
}

/** Light press feedback: scale to 0.98 and back. */
function ScalePress({ onPress, style, children, label, reduce }: { onPress: () => void; style?: object; children: ReactNode; label: string; reduce: boolean }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => (reduce ? s.setValue(1) : Animated.timing(s, { toValue: v, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.98)} onPressOut={() => to(1)} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Category menu: tall bottom panel — main categories as an emoji grid, children as a separate level. */
function CategoryDrawerBase({ open, onClose, categories, selected, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const [visible, setVisible] = useState(open);
  const [stack, setStack] = useState<string[]>([]); // opened categories (levels)
  const [reduce, setReduce] = useState(false);
  const sheetY = useRef(new Animated.Value(H)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const level = useRef(new Animated.Value(0)).current; // 0 = grid, 1 = sub list
  const sub = useRef(new Animated.Value(1)).current; // deeper level swap

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
  }, []);

  const D = (ms: number) => (reduce ? 0 : ms);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setStack([]);
      level.setValue(0);
      sheetY.setValue(H);
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 0, duration: D(320), easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: D(260), useNativeDriver: true }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: H, duration: D(260), easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: D(240), useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Like the site: if there is a single root wrapper («Каталог»), show its children
  // children index built once per category list (not on every render)
  const byParent = useMemo(() => {
    const m = new Map<string, Category[]>();
    for (const x of categories) {
      const k = x.parentGuid ?? "";
      const arr = m.get(k);
      if (arr) arr.push(x);
      else m.set(k, [x]);
    }
    return m;
  }, [categories]);
  const roots = byParent.get("") ?? [];
  const topLevel = roots.length === 1 ? byParent.get(roots[0].guid) ?? [] : roots;
  const childrenOf = (guid: string) => byParent.get(guid) ?? [];
  // the selected category and all its parents — «is it in this branch» becomes a set lookup
  const selectedPath = useMemo(() => {
    const set = new Set<string>();
    const byGuid = new Map(categories.map((x) => [x.guid, x]));
    let g: string | null | undefined = selected;
    while (g && !set.has(g)) {
      set.add(g);
      g = byGuid.get(g)?.parentGuid;
    }
    return set;
  }, [categories, selected]);
  const current = stack.length ? categories.find((x) => x.guid === stack[stack.length - 1]) : undefined;
  const subItems = current ? childrenOf(current.guid) : [];

  const select = (guid: string | null) => {
    tap();
    onSelect(guid);
    onClose();
  };

  const push = (guid: string) => {
    tap();
    if (stack.length === 0) {
      setStack([guid]);
      Animated.timing(level, { toValue: 1, duration: D(280), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      setStack((s) => [...s, guid]);
      sub.setValue(0);
      Animated.timing(sub, { toValue: 1, duration: D(260), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
  };

  const back = () => {
    tap();
    if (stack.length > 1) {
      setStack((s) => s.slice(0, -1));
      sub.setValue(0);
      Animated.timing(sub, { toValue: 1, duration: D(260), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return;
    }
    Animated.timing(level, { toValue: 0, duration: D(260), easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setStack([]));
  };

  // Android back: go up a level first, then close
  useEffect(() => {
    if (!visible) return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length) back();
      else onClose();
      return true;
    });
    return () => h.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stack]);

  // is the selected category inside this branch?
  const inBranch = (guid: string) => selectedPath.has(guid);

  // closed: render nothing (no work on every catalog keystroke)
  if (!visible) return null;

  const sheetBg = dark ? "#2B193D" : "#F7F4FC";
  const tileBg = dark ? "#352044" : "#fff";
  const shadow = dark ? null : styles.shadow;

  const gridStyle = {
    opacity: level.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{ translateX: level.interpolate({ inputRange: [0, 1], outputRange: [0, -36] }) }],
  };
  const subStyle = {
    opacity: Animated.multiply(level, sub),
    transform: [
      { translateX: level.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) },
      { translateX: sub.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
    ],
  };

  const header = (
    <View style={styles.header}>
      {stack.length ? (
        <Pressable onPress={back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Назад" style={[styles.round, { backgroundColor: dark ? "#352044" : "rgba(139,61,255,0.08)" }]}>
          <Ionicons name="chevron-back" size={24} color={VIOLET} />
        </Pressable>
      ) : null}
      <Text style={[styles.title, { color: c.label }]} numberOfLines={2} accessibilityRole="header">
        {current ? current.name : "Категории"}
      </Text>
      <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Закрыть" style={[styles.round, { backgroundColor: dark ? "#352044" : "rgba(118,118,128,0.1)" }]}>
        <Ionicons name="close" size={22} color={c.secondary} />
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => (stack.length ? back() : onClose())} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть меню" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { top: insets.top + 12, backgroundColor: sheetBg, transform: [{ translateY: sheetY }] }]}>
        <View style={[styles.grabber, { backgroundColor: dark ? "#5A3D73" : "#D6D2E2" }]} />
        {header}
        <View style={{ flex: 1 }}>
          {/* level 1: emoji grid (kept mounted so its scroll position is restored on back) */}
          <Animated.View style={[StyleSheet.absoluteFill, gridStyle, { pointerEvents: stack.length ? "none" : "auto" }]}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
              <ScalePress onPress={() => select(null)} label="Все товары" reduce={reduce}>
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.all}>
                  <Image source={ICONS.all} style={styles.allIcon} contentFit="contain" />
                  <Text style={styles.allText}>Все товары</Text>
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </LinearGradient>
              </ScalePress>
              <View style={styles.grid}>
                {topLevel.map((cat) => {
                  const kids = childrenOf(cat.guid).length > 0;
                  const active = inBranch(cat.guid);
                  const icon = iconFor(cat.name);
                  return (
                    <View key={cat.guid} style={styles.cell}>
                      <ScalePress
                        onPress={() => (kids ? push(cat.guid) : select(cat.guid))}
                        label={cat.name}
                        reduce={reduce}
                        style={[styles.tile, { backgroundColor: active ? (dark ? "rgba(232,44,135,0.16)" : "#FDF0F8") : tileBg, borderColor: active ? VIOLET : "transparent" }, shadow]}
                      >
                        {icon ? (
                          <Image source={icon} style={styles.icon} contentFit="contain" />
                        ) : (
                          <Text style={styles.emoji}>{emojiFor(cat.name)}</Text>
                        )}
                        <Text style={[styles.tileText, { color: active ? PINK : c.label }]}>{cat.name}</Text>
                        {kids ? <Ionicons name="chevron-forward" size={18} color={c.chevron} style={styles.tileChevron} /> : null}
                      </ScalePress>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>

          {/* level 2+: soft cards without emoji */}
          {stack.length ? (
            <Animated.View style={[StyleSheet.absoluteFill, subStyle]}>
              <ScrollView key={current?.guid} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: insets.bottom + 24, gap: 10 }} showsVerticalScrollIndicator>
                {current ? (
                  <SubCard label={`Все в «${current.name}»`} active={selected === current.guid} onPress={() => select(current.guid)} reduce={reduce} tileBg={tileBg} activeBg={dark ? "#3A2340" : "#FDF0F8"} shadow={shadow} textColor={c.label} />
                ) : null}
                {subItems.map((ch) => {
                  const kids = childrenOf(ch.guid).length > 0;
                  return (
                    <SubCard
                      key={ch.guid}
                      label={ch.name}
                      active={inBranch(ch.guid)}
                      onPress={() => (kids ? push(ch.guid) : select(ch.guid))}
                      reduce={reduce}
                      tileBg={tileBg}
                      activeBg={dark ? "#3A2340" : "#FDF0F8"}
                      shadow={shadow}
                      textColor={c.label}
                    />
                  );
                })}
              </ScrollView>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

function SubCard({
  label, active, onPress, reduce, tileBg, activeBg, shadow, textColor,
}: { activeBg: string; label: string; active: boolean; onPress: () => void; reduce: boolean; tileBg: string; shadow: object | null; textColor: string }) {
  // selection look appears smoothly
  const a = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: active ? 1 : 0, duration: reduce ? 0 : 220, useNativeDriver: false }).start();
  }, [active, a, reduce]);
  return (
    <ScalePress onPress={onPress} label={label} reduce={reduce}>
      <Animated.View
        style={[
          styles.subCard,
          shadow,
          {
            backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [tileBg, activeBg] }),
            borderColor: a.interpolate({ inputRange: [0, 1], outputRange: ["rgba(139,61,255,0)", "rgba(139,61,255,0.9)"] }),
          },
        ]}
      >
        <Animated.Text style={[styles.subText, { color: a.interpolate({ inputRange: [0, 1], outputRange: [textColor, PINK] }) }]}>{label}</Animated.Text>
        <Ionicons name="chevron-forward" size={20} color={VIOLET} />
      </Animated.View>
    </ScalePress>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(20,10,40,0.42)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 26, fontWeight: "700" },
  shadow: { boxShadow: "0 3px 12px rgba(80,50,140,0.07)" },
  all: { flexDirection: "row", alignItems: "center", gap: 14, height: 68, borderRadius: 22, paddingHorizontal: 18, boxShadow: "0 8px 20px rgba(160,32,240,0.3)" },
  allIcon: { width: 50, height: 50 },
  icon: { width: 60, height: 60, marginBottom: 6 },
  allText: { flex: 1, color: "#fff", fontSize: 20, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, marginTop: 12 },
  cell: { width: "50%", padding: 6 },
  tile: { minHeight: 128, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, paddingVertical: 14 },
  emoji: { fontSize: 44, marginBottom: 6 },
  tileText: { fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 20, paddingHorizontal: 12 },
  tileChevron: { position: "absolute", right: 10, top: "50%", marginTop: -9 },
  subCard: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 14 },
  subText: { flex: 1, fontSize: 17, fontWeight: "600", lineHeight: 22 },
});

export const CategoryDrawer = memo(CategoryDrawerBase);

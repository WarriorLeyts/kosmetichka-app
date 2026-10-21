import { useEffect, useRef, useState, type ReactNode } from "react";
import { colors, themed } from "../theme";
import { Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { tap } from "./ui";
import type { Category } from "../types";

const WIDTH = Math.min(300, Dimensions.get("window").width * 0.85);

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  selected: string | null;
  onSelect: (guid: string | null) => void;
};

/** Same as the site's mobile category drawer (.cat-mobile-drawer): slides in from the left. */
export function CategoryDrawer({ open, onClose, categories, selected, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const x = useRef(new Animated.Value(-WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(open);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(x, { toValue: -WIDTH, duration: 240, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setVisible(false);
        setExpanded(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Like the site: if there is a single root wrapper («Каталог»), show its children
  const roots = categories.filter((c) => !c.parentGuid);
  const topLevel = roots.length === 1 ? categories.filter((c) => c.parentGuid === roots[0].guid) : roots;
  const childrenOf = (guid: string) => categories.filter((c) => c.parentGuid === guid);

  const select = (guid: string | null) => {
    tap();
    onSelect(guid);
    onClose();
  };

  const renderItem = (cat: Category, depth = 0): ReactNode => {
    const children = childrenOf(cat.guid);
    const isExpanded = expanded === cat.guid;
    const isActive = selected === cat.guid || children.some((c) => c.guid === selected);
    return (
      <View key={cat.guid}>
        <View style={styles.row}>
          <Item
            label={cat.name}
            active={isActive}
            depth={depth}
            onPress={() => select(cat.guid)}
          />
          {children.length > 0 && (
            <Pressable
              onPress={() => {
                tap();
                setExpanded(isExpanded ? null : cat.guid);
              }}
              style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: colors.pinkSoft }]}
              hitSlop={4}
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={isExpanded ? colors.pink : colors.faint}
                style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }}
              />
            </Pressable>
          )}
        </View>
        {isExpanded && children.map((child) => renderItem(child, depth + 1))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.drawer, { width: WIDTH, transform: [{ translateX: x }], paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Категории</Text>
          <Pressable onPress={onClose} style={styles.close} hitSlop={6}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 8, paddingBottom: insets.bottom + 16 }}>
          <View style={styles.row}>
            <Item label="Все товары" active={!selected} depth={0} onPress={() => select(null)} />
          </View>
          {topLevel.map((c) => renderItem(c))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function Item({ label, active, depth, onPress }: { label: string; active: boolean; depth: number; onPress: () => void }) {
  const text = (
    <Text
      style={[
        styles.itemText,
        depth > 0 && { fontSize: 13 },
        active && { color: colors.pink },
      ]}
    >
      {label}
    </Text>
  );
  const pad = { paddingLeft: 14 + depth * 10 };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pad, pressed && !active && { backgroundColor: colors.soft }]}>
      {active ? (
        <LinearGradient
          colors={["#fdf2f8", colors.violetSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
        />
      ) : null}
      {text}
    </Pressable>
  );
}

const styles = themed(() => ({
  backdrop: { backgroundColor: "rgba(0,0,0,0.45)" },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: "900", color: colors.text },
  close: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  item: { flex: 1, paddingVertical: 9, paddingRight: 14, borderRadius: 12, overflow: "hidden" },
  itemText: { fontWeight: "700", fontSize: 13.5, color: colors.text },
  toggle: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
}));

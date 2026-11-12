import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { iosText, useIOS } from "../../ios";
import { tap } from "../ui";
import { colors } from "@/theme";

/** iOS-style bottom sheet with a grabber; on a wide screen (computer) — a window in the middle. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const c = useIOS();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(400)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(open);
  const { width, height } = useWindowDimensions();
  const wide = width >= 700;

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (visible) {
      Animated.parallel([
        Animated.timing(y, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)", opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть" />
      </Animated.View>
      {wide ? (
        <View style={styles.center} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.dialog,
              { backgroundColor: c.bg, maxHeight: height - 80, opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
            ]}
          >
            <View style={styles.dialogHead}>
              <Text style={[iosText.headline, { color: c.label, flex: 1 }]} numberOfLines={1}>
                {title ?? ""}
              </Text>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть" hitSlop={8} style={[styles.close, { backgroundColor: c.cell }]}>
                <Ionicons name="close" size={20} color={c.secondary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Animated.View>
        </View>
      ) : (
      <Animated.View style={[styles.sheet, { backgroundColor: c.bg, paddingBottom: insets.bottom + 12, transform: [{ translateY: y }] }]}>
        <View style={styles.grabber} />
        {title ? <Text style={[iosText.headline, { color: c.label, textAlign: "center", marginBottom: 12 }]}>{title}</Text> : null}
        {children}
      </Animated.View>
      )}
    </Modal>
  );
}

/** Checkmark option list for a Sheet (e.g. sorting). */
export function SheetOptions<T extends string>({
  options,
  value,
  onSelect,
}: {
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
}) {
  const c = useIOS();
  return (
    <View style={[styles.group, { backgroundColor: c.cell }]}>
      {options.map((o, i) => (
        <Pressable
          key={o.value}
          onPress={() => {
            tap();
            onSelect(o.value);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: o.value === value }}
          style={({ pressed }) => [
            styles.option,
            i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
            pressed && { backgroundColor: c.cellPressed },
          ]}
        >
          <Text style={[iosText.body, { color: c.label, flex: 1 }]}>{o.label}</Text>
          {o.value === value ? <Ionicons name="checkmark" size={22} color={colors.brand} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingTop: 8 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", padding: 24 },
  dialog: { width: "100%", maxWidth: 520, borderRadius: 22, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
  dialogHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 20, paddingRight: 14, paddingTop: 14, paddingBottom: 12 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  grabber: { alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: "rgba(127,127,127,0.4)", marginBottom: 12 },
  group: { marginHorizontal: 16, borderRadius: 10, overflow: "hidden" },
  option: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: 16 },
});

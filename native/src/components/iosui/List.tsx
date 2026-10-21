import { Children, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iosText, useIOS } from "../../ios";
import { tap } from "../ui";

/** Inset grouped section (like Settings.app). */
export function Section({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const c = useIOS();
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ marginBottom: 35 }}>
      {header ? <Text style={[styles.header, { color: c.secondary }]}>{header.toUpperCase()}</Text> : null}
      <View style={[styles.group, { backgroundColor: c.cell }]}>
        {items.map((child, i) => (
          <View key={i}>
            {child}
            {i < items.length - 1 ? <View style={[styles.sep, { backgroundColor: c.separator }]} /> : null}
          </View>
        ))}
      </View>
      {footer ? <Text style={[styles.footer, { color: c.secondary }]}>{footer}</Text> : null}
    </View>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

/** Settings-style row: colored rounded-square icon, title, optional value, chevron. */
export function Row({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  onPress,
  chevron = true,
  destructive,
  center,
  toggle,
  onToggle,
}: {
  icon?: IconName;
  iconBg?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  center?: boolean;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  const c = useIOS();
  return (
    <Pressable
      disabled={!onPress}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.cellPressed }]}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: iconBg ?? "#8E8E93" }]}>
          <Ionicons name={icon} size={18} color="#fff" />
        </View>
      ) : null}
      <View style={{ flex: 1, paddingVertical: subtitle ? 9 : 11 }}>
        <Text
          numberOfLines={1}
          style={[
            iosText.body,
            { color: destructive ? "#FF3B30" : c.label },
            center && { textAlign: "center" },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[iosText.footnote, { color: c.secondary, marginTop: 1 }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={[iosText.body, { color: c.secondary, marginRight: 6 }]}>{value}</Text> : null}
      {toggle !== undefined ? (
        <Switch value={toggle} onValueChange={onToggle} trackColor={{ true: "#34C759", false: undefined }} />
      ) : chevron && onPress && !center && !destructive ? (
        <Ionicons name="chevron-forward" size={18} color={c.chevron} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 13, letterSpacing: -0.08, marginLeft: 32, marginBottom: 7 },
  footer: { fontSize: 13, letterSpacing: -0.08, marginHorizontal: 32, marginTop: 7, lineHeight: 18 },
  group: { marginHorizontal: 16, borderRadius: 10, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 59 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 44, paddingHorizontal: 16, gap: 15 },
  icon: { width: 29, height: 29, borderRadius: 7, alignItems: "center", justifyContent: "center" },
});

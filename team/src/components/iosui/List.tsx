import { Children, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { iosText, useIOS } from "../../ios";
import { tap } from "../ui";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

/** A rounded menu block, as the customer app's profile (white card with a soft shadow). */
export function Section({ header, footer, children }: { header?: string; footer?: string; children: ReactNode }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ marginBottom: 26 }}>
      {header ? <Text style={[styles.header, { color: c.secondary }]}>{header}</Text> : null}
      <View style={[styles.group, { backgroundColor: c.cell }, !dark && styles.shadow]}>
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

/**
 * Menu row as in the customer app: a light violet rounded square with an outline icon, title, optional
 * value, chevron. `iconBg` only picks pink (red / pink colours) or violet for the icon.
 */
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
        <View style={[styles.icon, { backgroundColor: pinkIcon(iconBg) ? "rgba(232,44,135,0.1)" : "rgba(139,61,255,0.12)" }]}>
          <Ionicons name={outline(icon)} size={21} color={pinkIcon(iconBg) ? PINK : VIOLET} />
        </View>
      ) : null}
      <View style={{ flex: 1, paddingVertical: subtitle ? 10 : 12 }}>
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
        <Switch value={toggle} onValueChange={onToggle} trackColor={{ true: VIOLET, false: undefined }} thumbColor="#fff" />
      ) : chevron && onPress && !center && !destructive ? (
        <Ionicons name="chevron-forward" size={19} color={c.chevron} />
      ) : null}
    </Pressable>
  );
}

/** the outline variant of an icon when Ionicons has one (cube → cube-outline) */
function outline(name: IconName): IconName {
  if (name.endsWith("-outline")) return name;
  const o = `${name}-outline` as IconName;
  return o in Ionicons.glyphMap ? o : name;
}
const pinkIcon = (bg?: string) => !!bg && /^#(ff3b30|e82c87|ff2d55)$/i.test(bg);

const styles = StyleSheet.create({
  header: { fontSize: 14, fontWeight: "600", marginLeft: 22, marginBottom: 8 },
  footer: { fontSize: 13, letterSpacing: -0.08, marginHorizontal: 22, marginTop: 7, lineHeight: 18 },
  group: { marginHorizontal: 16, borderRadius: 20, overflow: "hidden" },
  shadow: { boxShadow: "0 4px 18px rgba(31,41,55,0.07)" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 60, paddingHorizontal: 14, gap: 14 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});

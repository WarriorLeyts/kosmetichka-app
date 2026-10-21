import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { colors, fonts, gradient, radius, themed } from "../theme";

export function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type IconName = keyof typeof Ionicons.glyphMap;

type BtnProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  variant?: "primary" | "outline" | "ghost" | "danger";
  style?: ViewStyle;
  small?: boolean;
};

/** Pill button from the mockup: hot-pink gradient with a soft glow. */
export function Button({ title, onPress, loading, disabled, icon, variant = "primary", style, small }: BtnProps) {
  const inactive = disabled || loading;
  const h = small ? 42 : 52;
  const fg = variant === "primary" ? "#fff" : variant === "danger" ? colors.danger : colors.pink;
  const content = (
    <View style={[styles.btnInner, { height: h }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={fg} />}
          <Text style={[styles.btnText, { color: fg }, small && { fontSize: 14 }]}>{title}</Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      onPress={() => {
        if (inactive) return;
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        { opacity: inactive ? 0.5 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        variant === "primary" && !inactive && styles.glow,
        style,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 999 }}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={{
            borderRadius: 999,
            borderWidth: variant === "ghost" ? 0 : 1,
            borderColor: variant === "danger" ? colors.danger : colors.pink,
            backgroundColor: variant === "danger" ? colors.dangerBg : "transparent",
          }}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...props }: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.faint}
        keyboardAppearance={colors.statusBar === "light" ? "dark" : "light"}
        {...props}
        style={[styles.input, props.multiline && { height: 90, textAlignVertical: "top", paddingTop: 13 }, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/** Rounded search field from the mockup. */
export function SearchBar({
  value, onChangeText, onSubmit, placeholder = "Поиск товаров, брендов, артикулов", onPress, right,
}: {
  value?: string;
  onChangeText?: (t: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  /** when set, the bar is a button (e.g. on the home screen) */
  onPress?: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.search}>
      <Ionicons name="search-outline" size={18} color={colors.faint} />
      {onPress ? (
        <Text style={styles.searchPlaceholder} numberOfLines={1}>{placeholder}</Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={onSubmit}
          clearButtonMode="while-editing"
          autoCorrect={false}
          keyboardAppearance={colors.statusBar === "light" ? "dark" : "light"}
        />
      )}
      {right}
    </Pressable>
  );
}

/** Screen header from the mockup: back arrow (optional), title, actions on the right. */
export function Header({
  title, back, left, right, serif,
}: { title?: string; back?: boolean; left?: ReactNode; right?: ReactNode; serif?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {back ? (
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      ) : (
        left
      )}
      {title ? (
        <Text style={[styles.headerTitle, serif && styles.headerSerif]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{right}</View>
    </View>
  );
}

export function IconButton({ name, onPress, badge, color }: { name: IconName; onPress: () => void; badge?: number; color?: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={name} size={23} color={color ?? colors.text} />
      {badge ? (
        <View style={styles.badgeDot}>
          <Text style={styles.badgeDotText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Small rounded pill (filters / statuses). */
export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && <Ionicons name={icon} size={15} color={active ? "#fff" : colors.text} />}
      <Text style={[styles.chipText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.pink} />
      {text ? <Text style={[styles.muted, { marginTop: 12 }]}>{text}</Text> : null}
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.faint} />
      <Text style={styles.emptyTitle}>Не удалось загрузить</Text>
      <Text style={[styles.muted, { textAlign: "center", marginBottom: 16 }]}>{message}</Text>
      {onRetry && <Button title="Повторить" onPress={onRetry} variant="outline" small style={{ minWidth: 160 }} />}
    </View>
  );
}

export function Empty({
  icon, title, text, action, onAction,
}: { icon: IconName; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.pink} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={[styles.muted, { textAlign: "center", marginBottom: 18 }]}>{text}</Text> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ minWidth: 220 }} /> : null}
    </View>
  );
}

/** − n + control from the mockup (outlined circles). */
export function Stepper({ value, onChange, min = 0, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  return (
    <View style={styles.stepper}>
      <Pressable
        hitSlop={8}
        onPress={() => {
          tap();
          onChange(value - step < min ? 0 : value - step);
        }}
        style={styles.stepBtn}
      >
        <Ionicons name="remove" size={16} color={colors.text} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        hitSlop={8}
        onPress={() => {
          tap();
          onChange(value + step);
        }}
        style={styles.stepBtn}
      >
        <Ionicons name="add" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Status pill with a thin border. */
export function Badge({ text, fg, bg, border }: { text: string; fg: string; bg: string; border?: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
        borderWidth: border ? 1 : 0,
        borderColor: border,
      }}
    >
      <Text style={{ color: fg, fontSize: 11.5, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Notice({ tone, text }: { tone: "error" | "success" | "info"; text: string }) {
  const c =
    tone === "error"
      ? { fg: colors.danger, bg: colors.dangerBg, icon: "alert-circle-outline" as const }
      : tone === "success"
      ? { fg: colors.success, bg: colors.successBg, icon: "checkmark-circle-outline" as const }
      : { fg: colors.pink, bg: colors.pinkSoft, icon: "information-circle-outline" as const };
  return (
    <View style={{ flexDirection: "row", gap: 8, backgroundColor: c.bg, padding: 12, borderRadius: 14, marginBottom: 14 }}>
      <Ionicons name={c.icon} size={18} color={c.fg} />
      <Text style={{ color: c.fg, flex: 1, fontSize: 13.5, fontWeight: "600", lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

/** Uppercase serif section title, like «НОВАЯ КОЛЛЕКЦИЯ» in the mockup. */
export function SerifTitle({ children, size = 26, color, style }: { children: string; size?: number; color?: string; style?: object }) {
  return (
    <Text style={[{ fontFamily: fonts.serif, fontSize: size, lineHeight: size * 1.08, color: color ?? colors.text, letterSpacing: 0.5 }, style]}>
      {children}
    </Text>
  );
}

export const styles = themed(() => ({
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 22 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  glow: {
    shadowColor: "#ff1f8e",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    borderRadius: 999,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.text,
  },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 4 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchPlaceholder: { flex: 1, color: colors.faint, fontSize: 14 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, height: "100%" },
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingBottom: 8, backgroundColor: colors.bg },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.text, marginLeft: 4 },
  headerSerif: { fontFamily: fonts.serif, fontWeight: "normal", fontSize: 26, letterSpacing: 0.4 },
  badgeDot: {
    position: "absolute",
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeDotText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.pink, borderColor: colors.pink },
  chipText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  emptyIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 6, marginTop: 8, textAlign: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 2 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { minWidth: 30, textAlign: "center", fontSize: 15, fontWeight: "700", color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
}));

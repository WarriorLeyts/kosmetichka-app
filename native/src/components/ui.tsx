import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, gradient, radius, themed } from "../theme";

export function tap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type BtnProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "outline" | "ghost" | "danger";
  style?: ViewStyle;
  small?: boolean;
};

export function Button({ title, onPress, loading, disabled, icon, variant = "primary", style, small }: BtnProps) {
  const inactive = disabled || loading;
  const h = small ? 40 : 52;
  const content = (
    <View style={[styles.btnInner, { height: h }]}>
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.violet} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={small ? 16 : 19}
              color={variant === "primary" ? "#fff" : variant === "danger" ? colors.danger : colors.violet}
            />
          )}
          <Text
            style={[
              styles.btnText,
              small && { fontSize: 14 },
              variant !== "primary" && { color: variant === "danger" ? colors.danger : colors.violet },
            ]}
          >
            {title}
          </Text>
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
      style={({ pressed }) => [{ opacity: inactive ? 0.55 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.md }}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={{
            borderRadius: radius.md,
            borderWidth: variant === "ghost" ? 0 : 1.5,
            borderColor: variant === "danger" ? colors.dangerBg : colors.violetBorder,
            backgroundColor: variant === "danger" ? colors.dangerBg : colors.violetSoft,
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
        {...props}
        style={[styles.input, props.multiline && { height: 90, textAlignVertical: "top", paddingTop: 12 }, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Loading({ text }: { text?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.violet} />
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
}: { icon: keyof typeof Ionicons.glyphMap; title: string; text?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.center}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.violet} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={[styles.muted, { textAlign: "center", marginBottom: 18 }]}>{text}</Text> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ minWidth: 220 }} /> : null}
    </View>
  );
}

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
        <Ionicons name={value - step < Math.max(min, 1) ? "trash-outline" : "remove"} size={18} color={colors.violet} />
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
        <Ionicons name="add" size={18} color={colors.violet} />
      </Pressable>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Status pill like the site's: rounded-full px-3 py-1 text-xs font-bold + 1px border. */
export function Badge({ text, fg, bg, border }: { text: string; fg: string; bg: string; border?: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignSelf: "flex-start",
        borderWidth: border ? 1 : 0,
        borderColor: border,
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Notice({ tone, text }: { tone: "error" | "success" | "info"; text: string }) {
  const c =
    tone === "error"
      ? { fg: colors.danger, bg: colors.dangerBg, icon: "alert-circle" as const }
      : tone === "success"
      ? { fg: colors.success, bg: colors.successBg, icon: "checkmark-circle" as const }
      : { fg: colors.violet, bg: colors.violetSoft, icon: "information-circle" as const };
  return (
    <View style={{ flexDirection: "row", gap: 8, backgroundColor: c.bg, padding: 12, borderRadius: radius.md, marginBottom: 14 }}>
      <Ionicons name={c.icon} size={18} color={c.fg} />
      <Text style={{ color: c.fg, flex: 1, fontSize: 14, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export const styles = themed(() => ({
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.violetSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 6, marginTop: 8, textAlign: "center" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.violetSoft,
    borderRadius: 999,
    padding: 3,
  },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  stepValue: { minWidth: 36, textAlign: "center", fontSize: 15, fontWeight: "800", color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, borderWidth: 1, borderColor: colors.border },
}));

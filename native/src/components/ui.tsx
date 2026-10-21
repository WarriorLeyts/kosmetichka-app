import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, gradient, gradientEnd, gradientStart, pinkShadow, radius } from "../theme";

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
  const h = small ? 40 : 48;
  const fg =
    variant === "primary" ? "#fff" : variant === "danger" ? colors.danger : variant === "ghost" ? colors.violet : "#475569";
  const content = (
    <View style={[styles.btnInner, { height: h }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
          <Text style={[styles.btnText, { color: fg }, small && { fontSize: 13 }, variant !== "primary" && { fontWeight: "800" }]}>
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
      style={({ pressed }) => [
        { opacity: inactive ? 0.5 : pressed ? 0.9 : 1, transform: [{ translateY: pressed ? 1 : 0 }] },
        variant === "primary" && !inactive && pinkShadow,
        style,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={gradient} start={gradientStart} end={gradientEnd} style={{ borderRadius: radius.md }}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={{
            borderRadius: radius.md,
            borderWidth: variant === "ghost" ? 0 : 1,
            borderColor: variant === "danger" ? "#fecaca" : "#e2e8f0",
            backgroundColor: variant === "danger" ? colors.dangerBg : variant === "ghost" ? "transparent" : "#fff",
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
        <Ionicons name={icon} size={36} color={colors.pink} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={[styles.muted, { textAlign: "center", marginBottom: 18 }]}>{text}</Text> : null}
      {action && onAction ? <Button title={action} onPress={onAction} style={{ minWidth: 220 }} /> : null}
    </View>
  );
}

/** Quantity control like the site's .cart-qty: small rounded-square buttons with the number between. */
export function Stepper({ value, onChange, min = 0, step = 1, large }: { value: number; onChange: (v: number) => void; min?: number; step?: number; large?: boolean }) {
  const size = large ? 40 : 30;
  return (
    <View style={styles.stepper}>
      <Pressable
        hitSlop={8}
        onPress={() => {
          tap();
          onChange(value - step < min ? 0 : value - step);
        }}
        style={[styles.stepBtn, { width: size, height: size }]}
      >
        <Ionicons name="remove" size={large ? 18 : 16} color={colors.text} />
      </Pressable>
      <Text style={[styles.stepValue, large && { fontSize: 17, minWidth: 40 }]}>{value}</Text>
      <Pressable
        hitSlop={8}
        onPress={() => {
          tap();
          onChange(value + step);
        }}
        style={[styles.stepBtn, { width: size, height: size }]}
      >
        <Ionicons name="add" size={large ? 18 : 16} color={colors.text} />
      </Pressable>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ text, fg, bg }: { text: string; fg: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
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
      : { fg: colors.violet, bg: "#fdf4ff", icon: "information-circle" as const };
  return (
    <View style={{ flexDirection: "row", gap: 8, backgroundColor: c.bg, padding: 12, borderRadius: 14, marginBottom: 14, borderWidth: tone === "info" ? 1.5 : 0, borderColor: "#e9d5ff" }}>
      <Ionicons name={c.icon} size={18} color={c.fg} />
      <Text style={{ color: c.fg, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  label: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
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
    borderRadius: 24,
    backgroundColor: colors.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 6, marginTop: 8, textAlign: "center" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepBtn: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { minWidth: 28, textAlign: "center", fontSize: 14, fontWeight: "800", color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border },
});

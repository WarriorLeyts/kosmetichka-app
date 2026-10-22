import { forwardRef, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIOS } from "../../ios";
import { useReduceMotion } from "../../useReduceMotion";

type Props = TextInputProps & { label: string; error?: string; password?: boolean };

/** iOS form field: label above, soft field, smooth violet focus ring, error under the field, eye toggle for passwords. */
export const IOSField = forwardRef<TextInput, Props>(function IOSField({ label, error, password, style, onFocus, onBlur, multiline, ...rest }, ref) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(false);
  const focus = useRef(new Animated.Value(0)).current;
  const err = useRef(new Animated.Value(error ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(err, { toValue: error ? 1 : 0, duration: reduce ? 0 : 180, useNativeDriver: false }).start();
  }, [error, err, reduce]);

  const to = (v: number) => Animated.timing(focus, { toValue: v, duration: reduce ? 0 : 180, useNativeDriver: false }).start();
  const idle = dark ? "#3A3A3C" : "#E4E2EC";
  const borderColor = error
    ? "#FF3B30"
    : focus.interpolate({ inputRange: [0, 1], outputRange: [idle, "#8b3dff"] });

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.label, { color: c.label }]}>{label}</Text>
      <Animated.View
        style={[
          styles.box,
          multiline && { minHeight: 96, alignItems: "flex-start" },
          { borderColor, backgroundColor: dark ? "#1C1C1E" : "#F8F7FB" },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          multiline={multiline}
          secureTextEntry={password ? !shown : rest.secureTextEntry}
          placeholderTextColor={c.secondary}
          onFocus={(e) => {
            to(1);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            to(0);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && { textAlignVertical: "top", paddingTop: 14 }, { color: c.label }, style]}
          accessibilityLabel={label}
        />
        {password ? (
          <Pressable
            onPress={() => setShown((s) => !s)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={shown ? "Скрыть пароль" : "Показать пароль"}
            style={styles.eye}
          >
            <Ionicons name={shown ? "eye-off-outline" : "eye-outline"} size={22} color={c.secondary} />
          </Pressable>
        ) : null}
      </Animated.View>
      <Animated.View style={{ opacity: err, maxHeight: err.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) }}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: "600", marginBottom: 7 },
  box: { flexDirection: "row", alignItems: "center", minHeight: 52, borderRadius: 14, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 17, paddingHorizontal: 16, paddingVertical: 12 },
  eye: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  error: { color: "#FF3B30", fontSize: 13, marginTop: 5 },
});

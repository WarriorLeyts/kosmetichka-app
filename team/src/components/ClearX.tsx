import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tap } from "./ui";

/** ⓧ at the end of a search field: empties it at once (shown only while there is text). */
export function ClearX({ value, onClear, color, size = 20 }: { value: string; onClear: () => void; color: string; size?: number }) {
  if (!value) return null;
  return (
    <Pressable
      onPress={() => {
        tap();
        onClear();
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Очистить поиск"
      style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="close-circle" size={size} color={color} />
    </Pressable>
  );
}

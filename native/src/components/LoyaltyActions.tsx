import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useIOS } from "@/ios";
import { colors } from "@/theme";
import { useAuth } from "@/store/auth";

const actions = [
  { key: "link", label: "Привязать свою карту", detail: "По телефону или номеру карты", icon: "link-outline", href: "/loyalty-add" },
  { key: "order", label: "Оформить карту · 990 ₽", detail: "Скидочные цены и бонусы", icon: "card-outline", href: "/loyalty-order" },
] as const;

/** The same two visible choices in the profile and in both card forms. */
export function LoyaltyActions({ active, disabled = false }: { active?: "link" | "order"; disabled?: boolean }) {
  const c = useIOS();
  const linked = useAuth((s) => Boolean(s.customer?.cardLinked));
  return <View style={{ gap: 10, marginVertical: 14 }}>
    {actions.filter((action) => !linked || action.key !== "link").map((action) => {
      const selected = active === action.key;
      return <Pressable
        key={action.key}
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => {
          if (selected) return;
          if (active) router.replace(action.href);
          else router.push(action.href);
        }}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: selected ? colors.brand : c.separator, backgroundColor: selected ? c.blurTint === "dark" ? "#352044" : "#F4EBFF" : c.cell, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 })}
      >
        <Ionicons name={action.icon} size={24} color={colors.brand} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: selected ? colors.brand : c.label, fontSize: 16, fontWeight: "700" }}>{action.label}</Text>
          <Text style={{ color: c.secondary, fontSize: 13, marginTop: 3 }}>{action.detail}</Text>
        </View>
        <Ionicons name={selected ? "checkmark-circle" : "chevron-forward"} size={20} color={colors.brand} />
      </Pressable>;
    })}
  </View>;
}

import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIOS } from "@/ios";
import { colors } from "@/theme";
import { OrderReviewCard } from "@/components/OrderReviewCard";
import { useAuth } from "@/store/auth";

export default function OrderSuccess() {
  const c = useIOS(); const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>(); const orderId = Number(id);
  const customer = useAuth(s => s.customer);
  const valid = Number.isSafeInteger(orderId) && orderId > 0;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "android" ? "padding" : undefined}><ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 30, paddingHorizontal: 16 }}>
    <View style={{ maxWidth: 480, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: colors.brand, fontSize: 17, letterSpacing: 3, textAlign: "center", marginBottom: 28 }}>КОСМЕТИЧКА</Text>
      <View style={{ alignItems: "center" }}>
        <Ionicons name="checkmark-circle" size={58} color="#16a368" />
        <Text accessibilityRole="header" style={{ color: c.label, fontSize: 28, fontWeight: "800", textAlign: "center", marginTop: 12 }}>{valid ? "Спасибо за заказ!" : "Мои заказы"}</Text>
        {valid ? <><Text style={{ color: c.label, fontWeight: "600", marginTop: 8 }}>Заказ №{orderId} принят</Text><Text style={{ color: c.secondary, textAlign: "center", marginTop: 8 }}>Менеджер свяжется с вами для подтверждения.</Text></> : null}
      </View>
      {valid && customer ? <OrderReviewCard key={`${customer.id}:${orderId}`} orderId={orderId} onSkip={() => router.replace("/orders")} /> : null}
      {valid && customer ? <Text style={{ color: c.secondary, fontSize: 12, textAlign: "center", marginBottom: 14 }}>Отзыв необязателен и не влияет на ваш заказ.</Text> : null}
      {valid && customer ? <Pressable accessibilityRole="button" onPress={() => router.replace(`/order/${orderId}`)} style={{ padding: 14, minHeight: 44 }}><Text style={{ color: colors.brand, fontWeight: "700", textAlign: "center" }}>Перейти к заказу</Text></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={() => router.replace(customer ? "/orders" : "/login")} style={{ padding: 14, minHeight: 44 }}><Text style={{ color: c.secondary, textAlign: "center" }}>{customer ? "Мои заказы" : "Войти"}</Text></Pressable>
    </View>
  </ScrollView></KeyboardAvoidingView>;
}

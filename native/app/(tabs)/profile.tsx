import { Alert, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/store/auth";
import { useFavorites } from "@/store/favorites";
import { useWaitlistStore } from "@/store/waitlist";
import { gradient } from "@/theme";
import { iosFont, iosText, sys, useIOS } from "@/ios";
import { LOGO } from "@/components/PageTitle";
import { LargeTitleScreen } from "@/components/ios/LargeTitleScreen";
import { Row, Section } from "@/components/ios/List";
import { tap } from "@/components/ui";

const TIER: Record<string, string> = {
  retail: "Розничный покупатель",
  discount: "Постоянный клиент · скидка",
  wholesale: "Оптовый клиент",
  big_wholesale: "Крупный оптовый клиент",
};

/** Profile in iOS «Settings» style (sample screen for the iOS look). */
export default function Profile() {
  const c = useIOS();
  const customer = useAuth((s) => s.customer);
  const logout = useAuth((s) => s.logout);
  const favCount = useFavorites((s) => s.items.length);
  const waitCount = useWaitlistStore((s) => s.ids.length);

  const name = customer ? customer.companyName || customer.name || customer.phone || "Мой профиль" : "";
  const subtitle = customer
    ? [TIER[customer.priceType ?? ""] ?? "Покупатель", customer.phone || customer.email].filter(Boolean).join(" · ")
    : "";

  return (
    <LargeTitleScreen title="Профиль" left={<Image source={LOGO} style={{ width: 34, height: 34 }} contentFit="contain" />}>
      {/* account cell — like the Apple ID cell in Settings */}
      <Section>
        {customer ? (
          <Pressable
            onPress={() => { tap(); router.push("/edit-profile"); }}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, padding: 12, paddingLeft: 16 }, pressed && { backgroundColor: c.cellPressed }]}
          >
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 26, fontFamily: iosFont.semibold, fontWeight: iosFont.semibold ? undefined : "600" }}>
                {name.trim().charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={[iosText.title2, { color: c.label, fontSize: 21 }]}>{name}</Text>
              <Text numberOfLines={2} style={[iosText.footnote, { color: c.secondary, marginTop: 2 }]}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.chevron} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { tap(); router.push("/login"); }}
            style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, padding: 12, paddingLeft: 16 }, pressed && { backgroundColor: c.cellPressed }]}
          >
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#AEAEB2", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person" size={34} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[iosText.title2, { color: sys.pink, fontSize: 21 }]}>Войти</Text>
              <Text style={[iosText.footnote, { color: c.secondary, marginTop: 2 }]}>Оптовые цены, заказы и чат с менеджером</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.chevron} />
          </Pressable>
        )}
      </Section>

      {!customer && (
        <Section>
          <Row icon="person-add" iconBg={sys.blue} title="Регистрация" onPress={() => router.push("/register")} />
        </Section>
      )}

      {customer?.manager ? (
        <Section header="Ваш менеджер">
          <Row icon="person-circle" iconBg={sys.indigo} title={customer.manager} chevron={false} />
        </Section>
      ) : null}

      <Section header="Покупки">
        {customer ? <Row icon="cube" iconBg={sys.orange} title="Мои заказы" onPress={() => router.navigate("/orders")} /> : null}
        {customer ? (
          <Row icon="notifications" iconBg={sys.purple} title="Лист ожидания" value={waitCount ? String(waitCount) : undefined} onPress={() => router.push("/waitlist")} />
        ) : null}
        <Row icon="heart" iconBg={sys.pink} title="Избранное" value={favCount ? String(favCount) : undefined} onPress={() => router.push("/favorites")} />
      </Section>

      <Section header="Аккаунт и информация">
        {customer ? <Row icon="person" iconBg={sys.blue} title="Мои данные" onPress={() => router.push("/edit-profile")} /> : null}
        <Row icon="call" iconBg={sys.green} title="Контакты и документы" onPress={() => router.push("/info")} />
      </Section>

      {customer ? (
        <Section>
          <Row
            title="Выйти"
            destructive
            center
            onPress={() =>
              Alert.alert("Выйти из аккаунта?", undefined, [
                { text: "Отмена", style: "cancel" },
                { text: "Выйти", style: "destructive", onPress: () => logout() },
              ])
            }
          />
        </Section>
      ) : null}
    </LargeTitleScreen>
  );
}

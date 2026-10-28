import { Alert, Linking, Platform } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Row, Section } from "@/components/iosui/List";
import { ROLE_LABEL, useAuth } from "@/store/auth";
import { useTheme } from "@/theme";
import { PushStatusRow } from "@/components/PushStatus";

/** «Ещё»: profile, theme, statistics, staff, 1C exchange, sign out. */
export default function More() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const mode = useTheme((s) => s.mode);
  const toggle = useTheme((s) => s.toggle);
  const staff = user?.role === "admin" || user?.role === "manager";

  return (
    <Screen tab title="Ещё">
      <Section header="Профиль">
        <Row icon="person" iconBg="#8b3dff" title={user?.name || user?.login || "—"} subtitle={user ? ROLE_LABEL[user.role] : undefined} chevron={false} />
      </Section>
      {staff ? (
        <Section header="Работа">
          <Row icon="cube" iconBg="#FF9500" title="Товары" subtitle="Каталог, остатки, фото и варианты" onPress={() => router.navigate("/products")} />
          <Row icon="stats-chart" iconBg="#e82c87" title="Статистика" onPress={() => router.push("/stats")} />
          <Row icon="school" iconBg="#34C759" title="Тесты сотрудников" subtitle="Результаты на сайте" onPress={() => Linking.openURL("https://kosmetichka-opt.ru/academy/results").catch(() => {})} />
          {user?.role === "admin" ? <Row icon="people-circle" iconBg="#5856D6" title="Сотрудники" onPress={() => router.push("/users")} /> : null}
          {user?.role === "admin" ? <Row icon="megaphone" iconBg="#FF9500" title="Рассылки" subtitle="Push клиентам: акции и новости" onPress={() => router.push("/push")} /> : null}
          {user?.role === "admin" ? <Row icon="bug" iconBg="#FF3B30" title="Ошибки приложений" onPress={() => router.push("/app-errors")} /> : null}
          <Row icon="cloud-upload" iconBg="#30B0C7" title="Выгрузка заказов в 1С" onPress={() => router.push("/export")} />
          <Row icon="cloud-download" iconBg="#34C759" title="Импорт из 1С" onPress={() => router.push("/import")} />
        </Section>
      ) : null}
      <Section header="Оформление">
        <Row icon="moon" iconBg="#5856D6" title="Тёмная тема" toggle={mode === "dark"} onToggle={() => toggle()} chevron={false} />
      </Section>
      {Platform.OS === "web" ? (
        <Section header="Настройки">
          <PushStatusRow />
        </Section>
      ) : null}
      <Section>
        <Row
          title="Выйти"
          destructive
          center
          onPress={() =>
            Alert.alert("Выйти из аккаунта?", undefined, [
              { text: "Отмена", style: "cancel" },
              {
                text: "Выйти",
                style: "destructive",
                onPress: async () => {
                  await logout();
                  router.replace("/login");
                },
              },
            ])
          }
        />
      </Section>
    </Screen>
  );
}

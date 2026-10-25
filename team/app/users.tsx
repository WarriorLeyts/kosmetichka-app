import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Card, Empty, ErrorState, Loading, VIOLET } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get } from "@/api";
import { date } from "@/format";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";
import type { StaffUser } from "@/types";

/** Сотрудники (admin only, as /admin/users): list, add, edit. */
export default function Users() {
  const c = useIOS();
  const role = useAuth((s) => s.user?.role);
  const { data, error, loading, reload } = useLoad(() => get<{ users: StaffUser[]; totalCount: number }>("/api/team/users"), []);
  if (role !== "admin") {
    return (
      <Screen title="Сотрудники">
        <Empty icon="lock-closed-outline" text="Раздел сотрудников доступен только администратору" />
      </Screen>
    );
  }
  return (
    <Screen title="Сотрудники" onRefresh={reload}>
      <Pressable onPress={() => router.push("/user/new")} style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginBottom: 12 }} accessibilityRole="button">
        <Ionicons name="add-circle" size={24} color={VIOLET} />
        <Text style={{ color: VIOLET, fontSize: 17, fontWeight: "600" }}>Добавить сотрудника</Text>
      </Pressable>
      {loading && !data ? <Loading /> : !data ? <ErrorState text={error} onRetry={reload} /> : (
        data.users.map((u) => (
          <Card key={u.id} onPress={() => router.push({ pathname: "/user/[id]", params: { id: String(u.id) } })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: c.label, fontSize: 16.5, fontWeight: "700", flex: 1 }}>
                {u.name}
                {u.isSelf ? <Text style={{ color: c.secondary, fontWeight: "400" }}> (вы)</Text> : null}
              </Text>
              <Text style={{ color: VIOLET, fontWeight: "600" }}>{u.roleLabel}</Text>
            </View>
            <Text style={{ color: c.secondary, marginTop: 4 }}>
              {u.login} · с {date(u.createdAt)}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

import { useRef, useState } from "react";
import { Alert, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, ErrorState, Loading } from "@/components/kit";
import { UserForm } from "@/components/UserForm";
import { useLoad } from "@/useLoad";
import { del, get, patch } from "@/api";
import { date } from "@/format";
import { useIOS } from "@/ios";
import type { StaffUserDetail } from "@/types";

export default function EditUser() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useIOS();
  const [busy, setBusy] = useState("");
  const running = useRef(false);
  const { data, error, loading, reload } = useLoad(() => get<StaffUserDetail>(`/api/team/users/${id}`), [id]);
  const u = data?.user;
  return (
    <Screen title={u?.name ?? "Сотрудник"}>
      {loading && !data ? <Loading /> : !u ? <ErrorState text={error} onRetry={reload} /> : (
        <>
          <Text style={{ color: c.secondary, marginBottom: 10 }}>
            С {date(u.createdAt)} · заказов назначено: {u.assignedOrdersCount}
          </Text>
          <Card>
            <UserForm
              isNew={false}
              busy={busy === "save"}
              initial={{ name: u.name, login: u.login, password: "", role: u.role as "admin" | "manager" | "picker" }}
              onSubmit={async (d) => {
                if (running.current) return;
                running.current = true;
                setBusy("save");
                try {
                  await patch(`/api/admin/users/${id}`, { name: d.name, login: d.login, role: d.role, ...(d.password ? { password: d.password } : {}) });
                  router.back();
                } catch (e) {
                  Alert.alert("Не сохранено", e instanceof Error ? e.message : "Возможно, такой логин уже занят");
                } finally {
                  running.current = false;
                  setBusy("");
                }
              }}
            />
          </Card>
          {u.canDelete && !u.isSelf ? (
            <ActionButton
              label="Удалить сотрудника"
              kind="danger"
              loading={busy === "del"}
              onPress={() =>
                Alert.alert(`Удалить ${u.name}?`, "Сотрудник больше не сможет войти.", [
                  { text: "Отмена", style: "cancel" },
                  {
                    text: "Удалить",
                    style: "destructive",
                    onPress: async () => {
                      if (running.current) return;
                      running.current = true;
                      setBusy("del");
                      try {
                        await del(`/api/admin/users/${id}`);
                        router.back();
                      } catch (e) {
                        Alert.alert("Не удалён", e instanceof Error ? e.message : "");
                      } finally {
                        running.current = false;
                        setBusy("");
                      }
                    },
                  },
                ])
              }
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

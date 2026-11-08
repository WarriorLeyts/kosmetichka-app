import { useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/kit";
import { UserForm } from "@/components/UserForm";
import { get, post } from "@/api";
import { useLoad } from "@/useLoad";

export default function NewUser() {
  const [busy, setBusy] = useState(false);
  // two quick taps on «Добавить» must not create the account twice
  const running = useRef(false);
  const { data } = useLoad(() => get<{ groups?: string[] }>("/api/team/users"), []);
  return (
    <Screen title="Новый сотрудник">
      <Card>
        <UserForm
          isNew
          busy={busy}
          groups={data?.groups ?? []}
          initial={{ name: "", login: "", password: "", role: "manager", oneCGroup: "" }}
          onSubmit={async (d) => {
            if (running.current) return;
            running.current = true;
            setBusy(true);
            try {
              await post("/api/admin/users", d);
              router.back();
            } catch (e) {
              Alert.alert("Не добавлен", e instanceof Error ? e.message : "");
            } finally {
              running.current = false;
              setBusy(false);
            }
          }}
        />
      </Card>
    </Screen>
  );
}

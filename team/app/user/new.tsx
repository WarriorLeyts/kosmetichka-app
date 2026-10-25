import { useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/kit";
import { UserForm } from "@/components/UserForm";
import { post } from "@/api";

export default function NewUser() {
  const [busy, setBusy] = useState(false);
  return (
    <Screen title="Новый сотрудник">
      <Card>
        <UserForm
          isNew
          busy={busy}
          initial={{ name: "", login: "", password: "", role: "manager" }}
          onSubmit={async (d) => {
            setBusy(true);
            try {
              await post("/api/admin/users", d);
              router.back();
            } catch (e) {
              Alert.alert("Не добавлен", e instanceof Error ? e.message : "");
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>
    </Screen>
  );
}

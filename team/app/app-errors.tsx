import { useState } from "react";
import { Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Card, Empty, ErrorState, Loading } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get } from "@/api";
import { date, time } from "@/format";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";

type AppErr = {
  id: number; app: string; platform: string; fatal: boolean; message: string; stack: string | null; screen: string | null; version: string | null;
  count: number; customers: number; firstAt: string; lastAt: string;
};
const APP: Record<string, string> = { customer: "Косметичка", team: "Team" };
const PLATFORM: Record<string, string> = { ios: "iPhone", android: "Android", web: "Сайт" };

/** «Ошибки приложений» (admin only, as /admin/app-errors): crashes and errors of both apps, 30 days. Tap — the details. */
export default function AppErrors() {
  const c = useIOS();
  const role = useAuth((s) => s.user?.role);
  const { data, error, loading, reload } = useLoad(() => get<{ items: AppErr[] }>("/api/team/app-errors"), []);
  const [open, setOpen] = useState<number | null>(null);
  if (role !== "admin") {
    return (
      <Screen title="Ошибки приложений">
        <Empty icon="lock-closed-outline" text="Раздел доступен только администратору" />
      </Screen>
    );
  }
  return (
    <Screen title="Ошибки приложений" onRefresh={reload}>
      {loading && !data ? <Loading /> : !data ? <ErrorState text={error} onRetry={reload} /> : data.items.length === 0 ? (
        <Empty icon="checkmark-circle-outline" text="За 30 дней ошибок нет" />
      ) : (
        data.items.map((r) => (
          <Card key={r.id} onPress={() => setOpen(open === r.id ? null : r.id)}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <View style={{ borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: r.fatal ? "rgba(220,38,38,0.13)" : "rgba(217,119,6,0.14)" }}>
                <Text style={{ color: r.fatal ? "#DC2626" : "#B45309", fontWeight: "700", fontSize: 12 }}>{r.fatal ? "Падение" : "Ошибка"}</Text>
              </View>
              <Text style={{ color: c.secondary, fontSize: 12.5 }}>
                {APP[r.app] ?? r.app} · {PLATFORM[r.platform] ?? r.platform} · ×{r.count} · клиентов {r.customers}
              </Text>
            </View>
            <Text style={{ color: c.label, fontWeight: "600", marginTop: 6 }} numberOfLines={open === r.id ? undefined : 3}>{r.message}</Text>
            <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 4 }}>
              {r.screen ? `Экран ${r.screen} · ` : ""}последняя {date(r.lastAt)} {time(r.lastAt)}{r.version ? ` · версия ${r.version}` : ""}
            </Text>
            {open === r.id && r.stack ? (
              <Text selectable style={{ color: c.secondary, fontSize: 11.5, marginTop: 8, fontFamily: "monospace" }}>{r.stack}</Text>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

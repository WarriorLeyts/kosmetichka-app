import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, Empty, ErrorState, Loading } from "@/components/kit";
import { get } from "@/api";
import { useLoad } from "@/useLoad";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";
import { date, time } from "@/format";

type Review = { orderId: number; rating: number; comment: string | null; createdAt: string; order: { customer: { name: string; companyName: string | null } } };
type ReviewsPage = { items: Review[]; total: number; page: number; totalPages: number };
export default function Reviews() {
  const c = useIOS(); const role = useAuth(s => s.user?.role);
  const allowed = role === "admin" || role === "manager";
  const [rating, setRating] = useState(""); const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(async () => allowed ? get<ReviewsPage>(`/api/team/reviews?page=${page}${rating ? `&rating=${rating}` : ""}`) : null, [page, rating, allowed], { poll: 30000, refocus: true });
  return <Screen title="Отзывы" onRefresh={reload}>
    {!allowed ? <Empty icon="lock-closed-outline" text="Раздел доступен менеджерам и администратору" /> : <>
      <Text style={{ color: c.secondary, marginBottom: 14 }}>Впечатления клиентов об оформлении заказов</Text>
      <Chips items={[{ value: "", label: "Все оценки" }, ...[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} ★` }))]} value={rating} onChange={v => { setRating(v); setPage(1); }} />
      {loading ? <Loading /> : error ? <ErrorState text={error} onRetry={reload} /> : !data?.items.length ? <Empty icon="chatbubble-outline" text="Отзывов пока нет" /> : <>
        <Text style={{ color: c.secondary, marginBottom: 10 }}>Найдено: {data.total}</Text>
        {data.items.map(r => <Card key={r.orderId} onPress={() => router.push(`/order/${r.orderId}`)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><Text style={{ color: "#e82c87", fontSize: 20 }} accessibilityLabel={`Оценка ${r.rating} из 5`}>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</Text><Text style={{ color: c.secondary }}>Заказ №{r.orderId}</Text></View>
          <Text style={{ color: c.label, fontWeight: "700", marginTop: 8 }}>{r.order.customer.companyName || r.order.customer.name}</Text>
          <Text style={{ color: c.label, marginTop: 8 }}>{r.comment || "Без комментария"}</Text>
          <Text style={{ color: c.secondary, marginTop: 10, fontSize: 12 }}>{date(r.createdAt)} {time(r.createdAt)}</Text>
        </Card>)}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {page > 1 ? <ActionButton label="Назад" onPress={() => setPage(p => p - 1)} /> : null}
          {page < data.totalPages ? <ActionButton label="Далее" onPress={() => setPage(p => p + 1)} /> : null}
        </View>
      </>}
    </>}
  </Screen>;
}

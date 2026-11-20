import { useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { get, post } from "@/api";
import { useLoad } from "@/useLoad";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";
import { ActionButton, Card } from "./kit";

type MaxmaCard = { number: string; name: string; phone: string | null; email: string | null; birthdate: string | null; gender: number | null; externalId: string | null; level: string | null; cashback: string | null; bonuses: number | null; pendingBonuses: number | null };
type Snapshot = { linkedNumber: string | null; card: MaxmaCard | null; autoLinkDisabled: boolean; discount: boolean; canManage: boolean; warning?: string };
type HistoryItem = { at: string | null; amount: number | null; operation: string; title: string; detail: string | null; reference: string | null };
const bonus = (n: number | null) => n == null ? "Недоступно" : n.toLocaleString("ru-RU");
function born(iso: string | null) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "Не указана";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}.${month}${year === "1900" ? "" : `.${year}`}`;
}
function Field({ label, value }: { label: string; value?: string | null }) {
  const c = useIOS();
  return <View style={{ marginTop: 10 }}><Text style={{ color: c.secondary, fontSize: 12 }}>{label}</Text><Text selectable style={{ color: c.label, fontSize: 15, marginTop: 3 }}>{value || "Не указано"}</Text></View>;
}
function Profile({ card }: { card: MaxmaCard }) {
  const c = useIOS();
  return <>
    <Text selectable accessibilityLabel={`Номер карты ${card.number}`} style={{ color: c.label, fontWeight: "800", fontSize: 23, marginTop: 12 }}>{card.number}</Text>
    <Field label="Владелец карты · ФИО из MAXMA" value={card.name} />
    <Field label="Телефон владельца" value={card.phone} />
    <Field label="Email владельца" value={card.email} />
    <Field label="Дата рождения" value={born(card.birthdate)} />
    {card.gender ? <Field label="Пол" value={card.gender === 1 ? "Мужской" : "Женский"} /> : null}
    {card.externalId ? <Field label="Внешний ID клиента в MAXMA" value={card.externalId} /> : null}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
      <View style={{ flex: 1, minWidth: 100 }}><Text style={{ color: c.secondary, fontSize: 12 }}>Доступные бонусы</Text><Text style={{ color: "#8b3dff", fontSize: 23, fontWeight: "800", marginTop: 4 }}>{bonus(card.bonuses)}</Text></View>
      <View style={{ flex: 1, minWidth: 100 }}><Text style={{ color: c.secondary, fontSize: 12 }}>Ожидают начисления</Text><Text style={{ color: c.label, fontSize: 23, fontWeight: "700", marginTop: 4 }}>{bonus(card.pendingBonuses)}</Text></View>
    </View>
    {card.level ? <Field label="Уровень лояльности" value={card.level} /> : null}
    {card.cashback ? <Field label="Кешбэк" value={card.cashback} /> : null}
  </>;
}
export function CustomerLoyalty({ customerId }: { customerId: number }) {
  const user = useAuth(s => s.user);
  if (!user) return null;
  return <LoyaltyContent key={`${user.id}:${user.role}:${customerId}`} customerId={customerId} />;
}
function LoyaltyContent({ customerId }: { customerId: number }) {
  const c = useIOS(); const base = `/api/team/customers/${customerId}/loyalty`;
  const { data, error, loading, reload } = useLoad(() => get<Snapshot>(base), [base], { refocus: true });
  const [editing, setEditing] = useState(false); const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{ card: MaxmaCard; phoneMatches: boolean; expectedCard: string | null } | null>(null);
  const [unlinking, setUnlinking] = useState(false); const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(""); const running = useRef(false);
  const [history, setHistory] = useState(false);
  const run = async (action: string, fn: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(action); setActionError("");
    try { await fn(); }
    catch (e) { setActionError(e instanceof Error ? e.message : "Не получилось. Попробуйте ещё раз."); }
    finally { running.current = false; setBusy(""); }
  };
  const reset = () => { setEditing(false); setPreview(null); setUnlinking(false); setQuery(""); setActionError(""); setHistory(false); };
  return <Card>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><Ionicons name="card-outline" size={24} color="#8b3dff" /><Text accessibilityRole="header" style={{ color: c.label, fontWeight: "800", fontSize: 20, flex: 1 }}>Карта и бонусы</Text><Text style={{ color: "#8b3dff", fontWeight: "700", fontSize: 12 }}>MAXMA</Text></View>
    {loading && !data ? <ActivityIndicator color="#8b3dff" style={{ marginTop: 20 }} /> : error ? <><Text accessibilityRole="alert" style={{ color: c.secondary, marginTop: 12 }}>{error}</Text><ActionButton label="Повторить загрузку карты" kind="soft" onPress={reload} /></> : data ? <>
      {data.card ? <Profile card={data.card} /> : data.linkedNumber ? <Field label="Привязанный номер карты" value={data.linkedNumber} /> : <Text style={{ color: c.secondary, marginTop: 14 }}>Карта к аккаунту не привязана.</Text>}
      {data.warning ? <Text accessibilityRole="alert" style={{ color: c.secondary, marginTop: 12 }}>{data.warning}</Text> : null}
      {data.card && data.discount ? <Text style={{ color: "#16823e", marginTop: 12 }}>Скидочная карта · группа «Максма Скидка» в 1С</Text> : null}
      {!data.linkedNumber && data.autoLinkDisabled ? <Text style={{ color: c.secondary, marginTop: 10, fontSize: 12 }}>Карта отвязана вручную. Автоматическая привязка по телефону отключена до следующей явной привязки.</Text> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        <ActionButton label="Обновить карту" kind="soft" disabled={!!busy} loading={busy === "refresh"} onPress={() => run("refresh", async () => { reset(); await reload(); })} />
        {data.linkedNumber ? <ActionButton label={history ? "Скрыть историю" : "История бонусов"} kind="soft" disabled={!!busy} onPress={() => setHistory(v => !v)} /> : null}
      </View>
      {history && data.linkedNumber ? <History key={data.linkedNumber} base={base} number={data.linkedNumber} /> : null}
      {data.canManage ? <>
        {!editing && !unlinking ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <ActionButton label={data.linkedNumber ? "Привязать другую карту" : "Привязать карту"} icon="link-outline" onPress={() => { setEditing(true); setActionError(""); }} />
          {data.linkedNumber ? <ActionButton label="Отвязать карту" kind="danger" onPress={() => { setUnlinking(true); setActionError(""); }} /> : null}
        </View> : null}
        {unlinking ? <View style={{ marginTop: 18, gap: 12 }}>
          <Text style={{ color: c.label, fontWeight: "700" }}>Отвязать карту {data.linkedNumber}?</Text>
          <Text style={{ color: c.secondary }}>Карта и бонусы в MAXMA сохранятся. Клиент не сможет использовать эту карту в аккаунте до повторной привязки.</Text>
          <ActionButton label="Подтвердить отвязку" kind="danger" loading={busy === "unlink"} disabled={!!busy} onPress={() => run("unlink", async () => { await post(base, { action: "unlink", expectedCard: data.linkedNumber }); reset(); await reload(); })} />
          <ActionButton label="Отмена" kind="soft" disabled={!!busy} onPress={reset} />
        </View> : null}
        {editing ? <View style={{ marginTop: 18, gap: 12 }}>
          <Text style={{ color: c.label, fontWeight: "700" }}>Найдите карту в MAXMA</Text>
          <TextInput accessibilityLabel="Телефон или номер карты MAXMA" value={query} onChangeText={v => { setQuery(v); setPreview(null); }} editable={!busy} maxLength={64} placeholder="Телефон или номер карты" placeholderTextColor={c.secondary} autoCapitalize="none" autoCorrect={false} style={{ color: c.label, backgroundColor: c.cellPressed, padding: 14, borderRadius: 14, fontSize: 16, minHeight: 48 }} />
          <ActionButton label="Найти карту" disabled={!!busy || !query.trim()} loading={busy === "lookup"} onPress={() => run("lookup", async () => { setPreview(null); const r = await post<{ card: MaxmaCard; phoneMatches: boolean }>(base, { action: "lookup", query }); setPreview({ ...r, expectedCard: data.linkedNumber }); })} />
          {preview ? <View style={{ borderWidth: 1, borderColor: c.separator, borderRadius: 16, padding: 14 }}>
            <Text style={{ color: c.label, fontWeight: "700" }}>Проверьте владельца перед привязкой</Text>
            <Profile card={preview.card} />
            {!preview.phoneMatches ? <Text accessibilityRole="alert" style={{ color: "#b45c18", marginTop: 12 }}>Телефон карты отличается от телефона аккаунта или не указан. Убедитесь, что выбрана нужная карта.</Text> : null}
            {preview.expectedCard ? <Text style={{ color: c.secondary, marginTop: 12 }}>Текущая карта {preview.expectedCard} будет заменена.</Text> : null}
            <View style={{ marginTop: 14 }}><ActionButton label="Подтвердить привязку" loading={busy === "link"} disabled={!!busy} onPress={() => run("link", async () => { await post(base, { action: "link", cardNumber: preview.card.number, expectedCard: preview.expectedCard }); reset(); await reload(); })} /></View>
          </View> : null}
          <ActionButton label="Отмена" kind="soft" disabled={!!busy} onPress={reset} />
        </View> : null}
      </> : <Text style={{ color: c.secondary, fontSize: 12, marginTop: 12 }}>Привязку и отвязку выполняет администратор.</Text>}
      {actionError ? <Text accessibilityRole="alert" style={{ color: "#d12959", marginTop: 12 }}>{actionError}</Text> : null}
    </> : null}
  </Card>;
}
function History({ base, number }: { base: string; number: string }) {
  const c = useIOS(); const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useLoad(() => get<{ items: HistoryItem[]; total: number; hasMore: boolean }>(`${base}/history?card=${encodeURIComponent(number)}&offset=${offset}`), [base, number, offset]);
  return <View style={{ marginTop: 20 }}>
    <Text style={{ color: c.label, fontSize: 17, fontWeight: "700" }}>История бонусов из MAXMA</Text>
    {loading ? <ActivityIndicator color="#8b3dff" style={{ marginTop: 16 }} /> : error ? <><Text accessibilityRole="alert" style={{ color: c.secondary, marginTop: 10 }}>{error}</Text><ActionButton label="Повторить загрузку истории" kind="soft" onPress={reload} /></> : data ? <>
      <Text style={{ color: c.secondary, marginTop: 8 }}>{data.total ? `Всего операций: ${data.total}` : "Бонусных операций пока нет"}</Text>
      {data.items.map((e, i) => <View key={`${offset}:${i}`} style={{ borderTopWidth: 1, borderColor: c.separator, marginTop: 12, paddingTop: 12 }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}><Text style={{ color: c.label, fontWeight: "600", flex: 1 }}>{e.title}</Text><Text style={{ color: e.amount != null && e.amount >= 0 ? "#16823e" : "#d12959", fontWeight: "800" }}>{e.amount == null ? "—" : `${e.amount > 0 ? "+" : ""}${bonus(e.amount)}`}</Text></View>
        {e.at ? <Text style={{ color: c.secondary, marginTop: 4, fontSize: 12 }}>{new Date(e.at).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК</Text> : null}
        {e.detail ? <Text style={{ color: c.secondary, marginTop: 4 }}>{e.detail}</Text> : null}
        {e.reference ? <Text selectable style={{ color: c.secondary, marginTop: 4, fontSize: 12 }}>Документ: {e.reference}</Text> : null}
      </View>)}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>{offset > 0 ? <ActionButton label="Предыдущие операции" kind="soft" onPress={() => setOffset(v => Math.max(0, v - 30))} /> : null}{data.hasMore ? <ActionButton label="Следующие операции" kind="soft" onPress={() => setOffset(v => v + 30)} /> : null}</View>
    </> : null}
  </View>;
}

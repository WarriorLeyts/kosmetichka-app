import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { post } from "@/api";
import { useIOS } from "@/ios";
import { money } from "@/format";
import { ActionButton, Card } from "./kit";

/** Purchase of a new paid card; does not link an existing MAXMA card. */
export function AssemblyCardPurchase({ orderId, name, phone, hasPurchase, disabled, onChanged, onBusy }: { orderId: number; name: string | null; phone: string | null; hasPurchase: boolean; disabled?: boolean; onChanged: () => Promise<unknown>; onBusy?: (busy: boolean) => void }) {
  const c = useIOS(); const [open, setOpen] = useState(false); const [fullName, setFullName] = useState<string | null>(null); const [birthDate, setBirthDate] = useState("");
  const [busy, setBusy] = useState(false); const running = useRef(false); const [error, setError] = useState("");
  const [result, setResult] = useState<{ previousTotal: number; total: number; warning?: string } | null>(null);
  const submit = async () => {
    if (running.current || disabled) return;
    const fio = (fullName ?? name ?? "").trim();
    if (fio.split(/\s+/).length < 2) { setError("Укажите ФИО владельца карты"); return; }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(birthDate)) { setError("Укажите дату рождения в формате ДД.ММ.ГГГГ"); return; }
    running.current = true; setBusy(true); onBusy?.(true); setError("");
    try {
      const r = await post<{ previousTotal: number; total: number; warning?: string }>(`/api/team/orders/${orderId}/card-purchase`, { registration: { fullName: fio, birthDate } });
      setResult(r); setOpen(false); await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось добавить карту"); await onChanged(); }
    finally { running.current = false; setBusy(false); onBusy?.(false); }
  };
  return <Card>
    <Text style={{ color: c.label, fontSize: 18, fontWeight: "800" }}>Покупка карты «Косметичка»</Text>
    <Text style={{ color: c.secondary, marginTop: 8 }}>Карта — 990 ₽. Товары этого заказа сразу пересчитаются по скидочным ценам. Карту оформят на кассе по данным владельца.</Text>
    {result ? <View accessibilityLiveRegion="polite" style={{ marginTop: 12 }}><Text style={{ color: "#16823e", fontWeight: "700" }}>Карта добавлена, заказ пересчитан</Text><Text style={{ color: c.label, marginTop: 6 }}>Было: {money(result.previousTotal)} · Стало с картой: {money(result.total)}</Text>{result.warning ? <Text style={{ color: c.secondary, marginTop: 6 }}>{result.warning}</Text> : null}</View> : null}
    {hasPurchase ? <Text style={{ color: c.label, marginTop: 12 }}>Карта уже есть в заказе · 1 шт. · 990 ₽</Text> : !open ? <View style={{ marginTop: 14 }}><ActionButton label="Добавить карту Косметичка · 990 ₽" icon="card-outline" disabled={disabled} onPress={() => { setOpen(true); setError(""); setResult(null); }} /></View> : <View style={{ gap: 12, marginTop: 16 }}>
      <Text style={{ color: c.secondary }}>ФИО владельца карты</Text>
      <TextInput accessibilityLabel="ФИО для покупки карты" value={fullName ?? name ?? ""} onChangeText={setFullName} maxLength={200} autoCapitalize="words" autoCorrect={false} editable={!busy} style={{ color: c.label, backgroundColor: c.cellPressed, padding: 14, borderRadius: 14, minHeight: 48, fontSize: 16 }} />
      <Text style={{ color: c.secondary }}>Дата рождения</Text>
      <TextInput accessibilityLabel="Дата рождения для покупки карты" value={birthDate} placeholder="ДД.ММ.ГГГГ" placeholderTextColor={c.secondary} keyboardType="number-pad" editable={!busy} onChangeText={v => { const s = v.replace(/\D/g, "").slice(0, 8); setBirthDate(s.length > 4 ? `${s.slice(0,2)}.${s.slice(2,4)}.${s.slice(4)}` : s.length > 2 ? `${s.slice(0,2)}.${s.slice(2)}` : s); }} style={{ color: c.label, backgroundColor: c.cellPressed, padding: 14, borderRadius: 14, minHeight: 48, fontSize: 16 }} />
      <Text style={{ color: c.secondary }}>Телефон аккаунта: {phone || "не указан — заполните его в карточке клиента"}</Text>
      <ActionButton label="Добавить за 990 ₽ и пересчитать" disabled={disabled || !phone || busy} loading={busy} onPress={submit} />
      <ActionButton label="Отмена" kind="soft" disabled={busy} onPress={() => { setOpen(false); setError(""); }} />
    </View>}
    {error ? <Text accessibilityRole="alert" style={{ color: "#d12959", marginTop: 12 }}>{error}</Text> : null}
  </Card>;
}

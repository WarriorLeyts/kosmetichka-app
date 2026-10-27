import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, Empty, ErrorState, Loading, SectionTitle } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get, post } from "@/api";
import { date, time } from "@/format";
import { useIOS } from "@/ios";
import { useAuth } from "@/store/auth";

type PushData = {
  promo: number;
  withApp: number;
  audiences: { value: string; label: string }[];
  history: { id: number; title: string; body: string; audienceLabel: string; recipients: number; devices: number; createdAt: string }[];
};

/** «Рассылки» (admin only, as /admin/push): promo push to customers who agreed to «Акции и новости». */
export default function Push() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const role = useAuth((s) => s.user?.role);
  const { data, error, loading, reload } = useLoad(() => get<PushData>("/api/team/push"), []);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [article, setArticle] = useState("");
  const [busy, setBusy] = useState(false);

  if (role !== "admin") {
    return (
      <Screen title="Рассылки">
        <Empty icon="lock-closed-outline" text="Рассылки доступны только администратору" />
      </Screen>
    );
  }

  const input = [styles.input, { color: c.label, backgroundColor: dark ? "#2B193D" : "#F2F2F7" }];

  const send = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Заполните заголовок и текст");
      return;
    }
    const who = data?.audiences.find((a) => a.value === audience)?.label ?? "";
    Alert.alert("Отправить рассылку?", `${who}. Получат клиенты, включившие «Акции и новости».`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Отправить",
        onPress: async () => {
          setBusy(true);
          try {
            const r = await post<{ recipients: number; devices: number }>("/api/team/push", { title, body, audience, article: article.trim() || undefined });
            Alert.alert("Отправлено", `Клиентов: ${r.recipients}, push на устройства: ${r.devices}`);
            setTitle("");
            setBody("");
            setArticle("");
            reload();
          } catch (e) {
            Alert.alert("Не отправлено", e instanceof Error ? e.message : "Ошибка");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen title="Рассылки" onRefresh={reload}>
      {loading && !data ? <Loading /> : !data ? <ErrorState text={error} onRetry={reload} /> : (
        <>
          <Text style={{ color: c.secondary, marginBottom: 12, lineHeight: 20 }}>
            Получат только клиенты, включившие «Акции и новости»: сейчас {data.promo}. С приложением и push: {data.withApp}. Уведомления о заказах, чате и бонусах приходят всем автоматически.
          </Text>
          <Card>
            <Text style={[styles.label, { color: c.label }]}>Заголовок</Text>
            <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="Скидка 20% на парфюм" placeholderTextColor={c.secondary} style={input} />
            <Text style={[styles.label, { color: c.label }]}>Текст</Text>
            <TextInput value={body} onChangeText={setBody} maxLength={400} multiline placeholder="Только до воскресенья — на все ароматы" placeholderTextColor={c.secondary} style={[input, { minHeight: 90, textAlignVertical: "top" }]} />
            <Text style={[styles.label, { color: c.label }]}>Кому</Text>
            <Chips items={data.audiences} value={audience} onChange={setAudience} />
            <Text style={[styles.label, { color: c.label }]}>Открыть товар (необязательно)</Text>
            <TextInput value={article} onChangeText={setArticle} placeholder="Артикул или штрихкод" placeholderTextColor={c.secondary} style={input} autoCapitalize="none" />
            <View style={{ marginTop: 14 }}>
              <ActionButton label="Отправить" icon="paper-plane-outline" loading={busy} onPress={send} />
            </View>
          </Card>

          <SectionTitle>История</SectionTitle>
          {data.history.length === 0 ? (
            <Text style={{ color: c.secondary }}>Рассылок ещё не было.</Text>
          ) : (
            data.history.map((h) => (
              <Card key={h.id}>
                <Text style={{ color: c.secondary, fontSize: 12.5 }}>
                  {date(h.createdAt)} {time(h.createdAt)} · {h.audienceLabel} · клиентов {h.recipients} · устройств {h.devices}
                </Text>
                <Text style={{ color: c.label, fontWeight: "700", marginTop: 4 }}>{h.title}</Text>
                <Text style={{ color: c.label, marginTop: 2 }}>{h.body}</Text>
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: "700", fontSize: 14, marginTop: 12, marginBottom: 6 },
  input: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});

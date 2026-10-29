import { useRef, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, ErrorState, KV, Loading, SectionTitle } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get, post, put } from "@/api";
import { date } from "@/format";
import { useIOS } from "@/ios";
import { CustomerBadge } from "@/components/CustomerBadge";
import type { CustomerDetail } from "@/types";
import { PhoneKV } from "@/components/PhoneKV";

/** Customer card: contacts, 1C data, price type; approve / return to «waiting» (as the site's buttons). */
export default function Customer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useIOS();
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState<Form | null>(null); // «Изменить данные»
  const running = useRef(false);
  const { data, error, loading, reload } = useLoad(() => get<CustomerDetail>(`/api/team/customers/${id}`), [id]);
  const x = data?.customer;

  const act = (kind: "approve" | "block") => {
    const title = kind === "approve" ? "Подтвердить клиента?" : "Снять подтверждение?";
    const text = kind === "approve" ? "Клиент увидит свои цены и сможет оформлять заказы." : "Клиент вернётся в статус «Ожидает».";
    Alert.alert(title, text, [
      { text: "Отмена", style: "cancel" },
      {
        text: kind === "approve" ? "Подтвердить" : "Снять",
        style: kind === "block" ? "destructive" : "default",
        onPress: async () => {
          if (running.current) return;
          running.current = true;
          setBusy(kind);
          try {
            await post(`/api/admin/customers/${id}/${kind}`);
            await reload();
          } catch (e) {
            Alert.alert("Не получилось", e instanceof Error ? e.message : "");
          } finally {
            running.current = false;
            setBusy("");
          }
        },
      },
    ]);
  };

  const decide = (action: "approve" | "reject") => {
    const label = x?.roleRequestLabel ?? "";
    Alert.alert(
      action === "approve" ? `Одобрить «${label}»?` : "Отклонить заявку?",
      action === "approve" ? "Клиент сразу получит эти цены и сможет сам переключаться на розницу и обратно." : "Клиент увидит, что заявка отклонена.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: action === "approve" ? "Одобрить" : "Отклонить",
          style: action === "reject" ? "destructive" : "default",
          onPress: async () => {
            if (running.current) return;
            running.current = true;
            setBusy(action);
            try {
              await post(`/api/admin/customers/${id}/role-request`, { action });
              await reload();
            } catch (e) {
              Alert.alert("Не получилось", e instanceof Error ? e.message : "");
            } finally {
              running.current = false;
              setBusy("");
            }
          },
        },
      ]
    );
  };

  return (
    <Screen title={x?.displayName ?? "Клиент"} onRefresh={reload}>
      {loading && !data ? <Loading /> : !x ? <ErrorState text={error || "Клиент не найден"} onRetry={reload} /> : (
        <>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <CustomerBadge c={x} />
              <Text style={{ color: c.secondary }}>с {date(x.createdAt)}</Text>
            </View>
            <View style={{ height: 8 }} />
            <KV k="Контактное лицо" v={x.name} />
            <KV k="Компания" v={x.companyName} />
            <PhoneKV phone={x.phone} />
            <KV k="Email" v={x.email} onPress={x.email ? () => Linking.openURL(`mailto:${x.email}`).catch(() => {}) : undefined} />
            <KV k="ИНН" v={x.inn} />
            <KV k="Адрес" v={x.address} />
            <KV k="Тип цен" v={x.priceTypeLabel} />
            <KV k="Доступ к опту" v={x.wholesaleAccess === "big_wholesale" ? "Крупный опт" : x.wholesaleAccess === "wholesale" ? "Опт" : "Нет"} />
            <KV k="Менеджер 1С" v={x.manager} />
            <KV k="Код 1С" v={x.oneCId} />
            <KV k="Заказов" v={x.ordersCount} onPress={() => router.navigate({ pathname: "/orders", params: { all: "1", status: "", customer: x.phone || x.companyName || x.name || "" } })} />
          </Card>
          {x.roleRequestStatus === "pending" && x.roleRequestLabel ? (
            <Card>
              <Text style={{ color: c.label, fontSize: 16.5, fontWeight: "700" }}>Заявка на «{x.roleRequestLabel}»</Text>
              <Text style={{ color: c.secondary, marginTop: 4 }}>
                Сейчас: {x.priceTypeLabel}
                {x.roleRequestedAt ? ` · ${date(x.roleRequestedAt)}` : ""}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <ActionButton label="Одобрить" kind="success" loading={busy === "approve"} onPress={() => decide("approve")} />
                <ActionButton label="Отклонить" kind="danger" loading={busy === "reject"} onPress={() => decide("reject")} />
              </View>
            </Card>
          ) : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {!x.isApproved ? <ActionButton label="Подтвердить" kind="success" loading={busy === "approve"} onPress={() => act("approve")} /> : null}
            {x.isApproved ? <ActionButton label="Снять подтверждение" kind="danger" loading={busy === "block"} onPress={() => act("block")} /> : null}
          </View>
          {form ? (
            <CustomerForm
              form={form}
              setForm={setForm}
              busy={busy === "save"}
              onCancel={() => setForm(null)}
              onSave={async () => {
                if (running.current) return;
                running.current = true;
                setBusy("save");
                try {
                  await put(`/api/admin/customers/${id}`, { ...form, isActive: form.isActive === "active", isApproved: form.isApproved === "yes" });
                  setForm(null);
                  await reload();
                } catch (e) {
                  Alert.alert("Не сохранено", e instanceof Error ? e.message : "");
                } finally {
                  running.current = false;
                  setBusy("");
                }
              }}
            />
          ) : (
            <View style={{ marginTop: 8 }}>
              <ActionButton
                label="Изменить данные"
                kind="soft"
                icon="create-outline"
                onPress={() =>
                  setForm({
                    name: x.name ?? "", companyName: x.companyName ?? "", phone: x.phone ?? "", email: x.email ?? "", inn: x.inn ?? "",
                    address: x.address ?? "", manager: x.manager ?? "", oneCId: x.oneCId ?? "",
                    priceType: x.priceType, wholesaleAccess: x.wholesaleAccess ?? "",
                    isActive: x.isActive ? "active" : "blocked", isApproved: x.isApproved ? "yes" : "no", password: "",
                  })
                }
              />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

type Form = {
  name: string; companyName: string; phone: string; email: string; inn: string; address: string;
  manager: string; oneCId: string; priceType: string; wholesaleAccess: string; isActive: "active" | "blocked"; isApproved: "yes" | "no"; password: string;
};

/** «Изменить данные» — the same fields as the old admin form */
function CustomerForm({ form, setForm, busy, onCancel, onSave }: { form: Form; setForm: (f: Form) => void; busy: boolean; onCancel: () => void; onSave: () => void }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const set = (p: Partial<Form>) => setForm({ ...form, ...p });
  const field = (k: keyof Form, label: string, opts: { keyboard?: "phone-pad" | "email-address" | "number-pad"; secure?: boolean; placeholder?: string } = {}) => (
    <View style={{ marginBottom: 10 }}>
      <Text style={[fs.label, { color: c.secondary }]}>{label}</Text>
      <TextInput
        value={form[k]}
        onChangeText={(t) => set({ [k]: t } as Partial<Form>)}
        keyboardType={opts.keyboard}
        secureTextEntry={opts.secure}
        placeholder={opts.placeholder}
        placeholderTextColor={c.tertiary}
        autoCapitalize={opts.keyboard === "email-address" || opts.secure ? "none" : "sentences"}
        autoCorrect={false}
        style={[fs.input, { color: c.label, backgroundColor: dark ? "#2B193D" : "#F8F7FB", borderColor: dark ? "rgba(200,160,255,0.2)" : "#E9E4F5" }]}
      />
    </View>
  );
  return (
    <>
      <SectionTitle>Изменить данные</SectionTitle>
      <Card>
        {field("name", "Контактное лицо")}
        {field("companyName", "Компания")}
        {field("phone", "Телефон", { keyboard: "phone-pad" })}
        {field("email", "Email", { keyboard: "email-address" })}
        {field("inn", "ИНН", { keyboard: "number-pad" })}
        {field("address", "Адрес")}
        <Text style={[fs.label, { color: c.secondary }]}>Тип цен</Text>
        <Chips
          items={[
            { value: "retail", label: "Розница" },
            { value: "discount", label: "Скидка по карте" },
            { value: "wholesale", label: "Опт" },
            { value: "big_wholesale", label: "Крупный опт" },
          ]}
          value={form.priceType}
          onChange={(v) => set({ priceType: v })}
        />
        <Text style={[fs.label, { color: c.secondary }]}>Доступ к оптовым ценам</Text>
        <Chips
          items={[
            { value: "", label: "Нет" },
            { value: "wholesale", label: "Опт" },
            { value: "big_wholesale", label: "Крупный опт" },
          ]}
          value={form.wholesaleAccess}
          onChange={(v) => set({ wholesaleAccess: v })}
        />
        <Text style={[fs.label, { color: c.secondary }]}>Аккаунт</Text>
        <Chips items={[{ value: "active", label: "Активен" }, { value: "blocked", label: "Заблокирован" }]} value={form.isActive} onChange={(v) => set({ isActive: v })} />
        <Text style={[fs.label, { color: c.secondary }]}>Подтверждение</Text>
        <Chips items={[{ value: "yes", label: "Подтверждён" }, { value: "no", label: "Не подтверждён" }]} value={form.isApproved} onChange={(v) => set({ isApproved: v })} />
        {field("manager", "Менеджер (1С)")}
        {field("oneCId", "ID в 1С")}
        {field("password", "Новый пароль", { secure: true, placeholder: "Оставьте пустым, чтобы не менять" })}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
          <ActionButton label="Отмена" kind="soft" onPress={onCancel} />
          <ActionButton label="Сохранить" kind="primary" loading={busy} onPress={onSave} />
        </View>
      </Card>
    </>
  );
}

const fs = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginLeft: 2 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});

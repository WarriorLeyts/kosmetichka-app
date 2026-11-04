import { useRef, useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, ErrorState, KV, Loading, SectionTitle } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { BASE_URL, get, post, put } from "@/api";
import { date } from "@/format";
import { useIOS } from "@/ios";
import { CustomerBadge } from "@/components/CustomerBadge";
import type { CustomerDetail } from "@/types";
import { PhoneKV } from "@/components/PhoneKV";
import { useAuth } from "@/store/auth";

/** Customer card: contacts, 1C data, price type; approve / return to «waiting» (as the site's buttons). */
export default function Customer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useIOS();
  // managers only view customers: approving, price-type requests and editing are for the admin
  const canEdit = useAuth((s) => s.user?.role === "admin");
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

  /** confirm → call → reload (one at a time) */
  const confirmRun = (key: string, title: string, text: string, ok: string, destructive: boolean, call: () => Promise<unknown>) =>
    Alert.alert(title, text, [
      { text: "Отмена", style: "cancel" },
      {
        text: ok,
        style: destructive ? "destructive" : "default",
        onPress: async () => {
          if (running.current) return;
          running.current = true;
          setBusy(key);
          try {
            await call();
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
  const setStale = (stale: boolean) =>
    confirmRun(
      stale ? "stale" : "unstale",
      stale ? "В неактуальные?" : "Вернуть в заявки?",
      stale
        ? "Заявка уйдёт в «Неактуальные»: клиент не подтверждён и не заблокирован. Если он снова отправит заявку, она вернётся в заявки."
        : "Заявка снова появится в «Ожидают» или «Заявки на опт».",
      stale ? "В неактуальные" : "Вернуть",
      false,
      () => post(`/api/admin/customers/${id}/stale`, { stale })
    );
  const setBlocked = (blocked: boolean) =>
    confirmRun(
      blocked ? "lock" : "unlock",
      blocked ? "Заблокировать клиента?" : "Разблокировать клиента?",
      blocked ? "Клиент не сможет войти и оформлять заказы." : "Клиент снова сможет войти.",
      blocked ? "Заблокировать" : "Разблокировать",
      blocked,
      () => put(`/api/admin/customers/${id}`, { isActive: !blocked })
    );
  // an open request: a sign-up waiting for approval or a wholesale request; «Неактуальные» — set aside
  const signupOpen = !!x && x.isActive && !x.isApproved && !x.requestStaleAt;
  const roleOpen = !!x && x.isActive && x.roleRequestStatus === "pending";
  const stale = !!x && x.isActive && ((!x.isApproved && !!x.requestStaleAt) || x.roleRequestStatus === "stale");

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
          {/* wholesale proof the customer sent: where he resells + photos / videos */}
          {x.shopType || x.proofs?.length ? (
            <Card>
              <Text style={{ color: c.label, fontSize: 16.5, fontWeight: "700" }}>Подтверждение</Text>
              <View style={{ height: 6 }} />
              <KV k="Где продаёт" v={x.shopTypeLabel} />
              {x.shopLink ? (
                <KV
                  k="Онлайн-магазин"
                  v={x.shopLink}
                  onPress={() => {
                    const u = /^https?:\/\//i.test(x.shopLink!) ? x.shopLink! : `https://${x.shopLink!.replace(/^@/, "instagram.com/")}`;
                    void WebBrowser.openBrowserAsync(u).catch(() => {});
                  }}
                />
              ) : null}
              {x.proofs?.length ? (
                <View style={styles.proofs}>
                  {x.proofs.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => void WebBrowser.openBrowserAsync(BASE_URL + p.url).catch(() => {})}
                      accessibilityRole="button"
                      accessibilityLabel={p.kind === "video" ? "Открыть видео" : "Открыть фото"}
                      style={[styles.proof, { backgroundColor: c.cellPressed }]}
                    >
                      {p.kind === "video" ? (
                        <View style={styles.proofVideo}>
                          <Ionicons name="play-circle" size={34} color="#8b3dff" />
                          <Text style={{ color: c.secondary, fontSize: 12 }}>{Math.max(1, Math.round(p.size / 1048576))} МБ</Text>
                        </View>
                      ) : (
                        <Image source={{ uri: BASE_URL + p.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      )}
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={{ color: c.secondary, marginTop: 6 }}>Фото и видео ещё не загружены</Text>
              )}
            </Card>
          ) : null}
          {x.roleRequestStatus === "pending" && x.roleRequestLabel ? (
            <Card>
              <Text style={{ color: c.label, fontSize: 16.5, fontWeight: "700" }}>Заявка на «{x.roleRequestLabel}»</Text>
              <Text style={{ color: c.secondary, marginTop: 4 }}>
                Сейчас: {x.priceTypeLabel}
                {x.roleRequestedAt ? ` · ${date(x.roleRequestedAt)}` : ""}
              </Text>
              {canEdit ? <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <ActionButton label="Одобрить" kind="success" loading={busy === "approve"} onPress={() => decide("approve")} />
                <ActionButton label="Отклонить" kind="danger" loading={busy === "reject"} onPress={() => decide("reject")} />
              </View> : <Text style={{ color: c.secondary, marginTop: 8 }}>Решение принимает администратор</Text>}
            </Card>
          ) : null}
          {stale ? (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="archive-outline" size={20} color={c.secondary} />
                <Text style={{ color: c.label, fontSize: 16.5, fontWeight: "700", flex: 1 }}>
                  Заявка неактуальна{x.roleRequestStatus === "stale" && x.roleRequestLabel ? ` · «${x.roleRequestLabel}»` : ""}
                </Text>
              </View>
              <Text style={{ color: c.secondary, marginTop: 6 }}>
                {x.requestStaleAt ? `С ${date(x.requestStaleAt)}. ` : ""}Если клиент снова отправит заявку, она вернётся в заявки.
              </Text>
              {canEdit ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <ActionButton label="Вернуть в заявки" kind="soft" loading={busy === "unstale"} onPress={() => setStale(false)} />
                  <ActionButton label="Заблокировать" kind="danger" loading={busy === "lock"} onPress={() => setBlocked(true)} />
                </View>
              ) : null}
            </Card>
          ) : null}
          {!canEdit ? null : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {!x.isApproved && x.isActive ? <ActionButton label="Подтвердить" kind="success" loading={busy === "approve"} onPress={() => act("approve")} /> : null}
            {x.isApproved && x.isActive ? <ActionButton label="Снять подтверждение" kind="danger" loading={busy === "block"} onPress={() => act("block")} /> : null}
            {signupOpen || roleOpen ? <ActionButton label="В неактуальные" kind="soft" loading={busy === "stale"} onPress={() => setStale(true)} /> : null}
            {(signupOpen || roleOpen) ? <ActionButton label="Заблокировать" kind="danger" loading={busy === "lock"} onPress={() => setBlocked(true)} /> : null}
            {!x.isActive ? <ActionButton label="Разблокировать" kind="success" loading={busy === "unlock"} onPress={() => setBlocked(false)} /> : null}
          </View>}
          {!canEdit ? null : form ? (
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

const styles = StyleSheet.create({
  proofs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  proof: { width: 92, height: 92, borderRadius: 14, overflow: "hidden" },
  proofVideo: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
});

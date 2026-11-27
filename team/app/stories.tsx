import { useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Chips, Empty, ErrorState, Loading } from "@/components/kit";
import { StoryPreview } from "@/components/stories/StoryPreview";
import { pickFile, prepareForUpload } from "@/components/chat/Attach";
import { formFile, get, post, put, request } from "@/api";
import { storyLink, storyMediaUrl, storyState, type Story, type StoryContent } from "@/stories";
import { useLoad } from "@/useLoad";
import { useAuth } from "@/store/auth";
import { useIOS } from "@/ios";

const blank = (): StoryContent => ({ title: "", kind: "img", mediaUrl: "", coverUrl: "", link: "", linkLabel: "Подробнее", position: 0, published: false, expiresAt: null });
const LIFE = [{ value: "1", label: "24 часа" }, { value: "3", label: "3 дня" }, { value: "7", label: "7 дней" }, { value: "30", label: "30 дней" }, { value: "forever", label: "Без срока" }];
const when = (s: string) => new Date(s).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default function StoriesScreen() {
  const c = useIOS(), role = useAuth(s => s.user?.role);
  const [form, setForm] = useState<StoryContent | null>(null), [editing, setEditing] = useState<Story | null>(null), [life, setLife] = useState("1");
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [preview, setPreview] = useState(false);
  const lock = useRef(false), scroll = useRef<ScrollView>(null), creationId = useRef("");
  const { data, error: loadError, loading, reload } = useLoad(() => role === "admin" ? get<{ items: Story[] }>("/api/team/stories") : Promise.resolve({ items: [] }), [role], { refocus: true, poll: 60000, paused: !!form || !!busy });
  if (role !== "admin") return <Screen title="Сторис"><Empty icon="lock-closed-outline" text="Сторис доступны только администратору" /></Screen>;
  const change = (patch: Partial<StoryContent>) => setForm(f => f ? { ...f, ...patch } : f);
  const edit = (s: Story | null) => { creationId.current = Array.from({ length: 4 }, () => Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, "0")).join(""); setPreview(false); setEditing(s); setForm(s ? { ...s } : blank()); setLife(s ? "keep" : "1"); setError(""); scroll.current?.scrollTo({ y: 0, animated: true }); };
  const expiry = () => life === "keep" ? form?.expiresAt ?? null : life === "forever" ? null : new Date(Date.now() + Number(life) * 86400000).toISOString();
  const upload = async (cover: boolean) => {
    if (lock.current) return;
    lock.current = true; setError(""); setBusy(cover ? "cover" : "upload");
    try {
      const f = await pickFile("library", cover); if (!f) return;
      const prepared = await prepareForUpload(f);
      const body = new FormData(); body.append("file", await formFile(prepared.uri, prepared.name, prepared.mime), prepared.name);
      const r = await request<{ kind: "img" | "video"; mediaUrl: string; coverUrl: string }>("/api/team/stories/upload", { method: "POST", body });
      if (cover) { if (r.kind !== "img") throw new Error("Для обложки выберите фото"); change({ coverUrl: r.coverUrl }); }
      else change({ kind: r.kind, mediaUrl: r.mediaUrl, coverUrl: r.coverUrl });
    } catch (e) { setError(e instanceof Error ? e.message : "Файл не загружен"); }
    finally { lock.current = false; setBusy(""); }
  };
  const save = async (published: boolean) => {
    if (lock.current || !form) return;
    const content = { ...form, title: form.title.trim(), link: form.link.trim(), linkLabel: form.linkLabel.trim(), expiresAt: expiry(), published };
    const problem = !content.title ? "Добавьте подпись под кружком" : !storyMediaUrl(content.mediaUrl) ? "Загрузите фото или видео" : !storyMediaUrl(content.coverUrl) ? "Выберите фото для обложки видео" : !storyLink(content.link) ? "Укажите ссылку https://… или страницу /product/… либо /catalog" : content.link && !content.linkLabel ? "Подпишите кнопку со ссылкой" : published && content.expiresAt && Date.parse(content.expiresAt) <= Date.now() ? "Выберите новый срок показа" : null;
    if (problem) { setError(problem); return; }
    lock.current = true; setBusy("save"); setError("");
    try {
      if (editing) await put(`/api/team/stories/${editing.id}`, { ...content, updatedAt: editing.updatedAt }); else await post("/api/team/stories", { ...content, requestId: creationId.current });
      setPreview(false); setForm(null); setEditing(null); await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить сторис"); }
    finally { lock.current = false; setBusy(""); }
  };
  const hide = async (s: Story) => {
    if (lock.current) return; lock.current = true; setBusy(s.id); setError("");
    try { await put(`/api/team/stories/${s.id}`, { ...s, published: false }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось скрыть"); }
    finally { lock.current = false; setBusy(""); }
  };
  const remove = (s: Story) => Alert.alert("Удалить сторис?", `«${s.title}» исчезнет из списка и с главной клиентов.`, [{ text: "Отмена", style: "cancel" }, { text: "Удалить", style: "destructive", onPress: async () => {
    if (lock.current) return; lock.current = true; setBusy(s.id); setError("");
    try { await request(`/api/team/stories/${s.id}`, { method: "DELETE", body: JSON.stringify({ updatedAt: s.updatedAt }) }); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось удалить"); }
    finally { lock.current = false; setBusy(""); }
  } }]);
  const field = { color: c.label, backgroundColor: c.blurTint === "dark" ? "#382345" : "#F5F0FC", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 12 };
  const label = { color: c.label, fontWeight: "700" as const, fontSize: 14, marginBottom: 7 };
  return <Screen title="Сторис" scrollRef={scroll} onRefresh={form ? undefined : reload}>
    <Text style={{ color: c.secondary, lineHeight: 21, marginBottom: 16 }}>Фото и видео в круглых превью под поиском на главной у клиентов. Публикации видны на сайте и в приложении.</Text>
    {error ? <Text accessibilityRole="alert" style={{ color: c.blurTint === "dark" ? "#fca5a5" : "#b91c1c", marginBottom: 14 }}>{error}</Text> : null}
    {form ? <Card>
      <Text style={{ color: c.label, fontSize: 20, fontWeight: "700", marginBottom: 16 }}>{editing ? "Изменить сторис" : "Новая сторис"}</Text>
      <Text style={label}>Подпись под кружком</Text><TextInput accessibilityLabel="Подпись сторис" value={form.title} onChangeText={title => change({ title })} placeholder="Новинки, акции, обзор…" placeholderTextColor={c.secondary} maxLength={40} style={field} editable={!busy} />
      <ActionButton label={busy === "upload" ? "Загружаем файл…" : form.mediaUrl ? "Заменить фото или видео" : "Загрузить фото или видео"} icon="images-outline" kind="soft" loading={busy === "upload"} disabled={!!busy} onPress={() => void upload(false)} />
      <Text style={{ color: c.secondary, fontSize: 12, marginTop: 7, marginBottom: 14 }}>Фото сжимаются автоматически. Видео — MP4/MOV/WebM, до 50 МБ; для совместимости рекомендуем MP4 (H.264). Вертикальный формат 9:16.</Text>
      {form.coverUrl ? <Image source={{ uri: storyMediaUrl(form.coverUrl)! }} style={{ width: 94, height: 94, borderRadius: 47, marginBottom: 12 }} contentFit="cover" /> : null}
      {form.kind === "video" ? <><Text style={label}>Обложка для кружка</Text><ActionButton label={form.coverUrl ? "Заменить обложку" : "Выбрать фото для обложки"} kind="soft" loading={busy === "cover"} disabled={!!busy} onPress={() => void upload(true)} /><View style={{ height: 14 }} /></> : null}
      <Text style={label}>Ссылка (необязательно)</Text><TextInput accessibilityLabel="Ссылка сторис" value={form.link} onChangeText={link => change({ link })} placeholder="https://… или /product/123" placeholderTextColor={c.secondary} style={field} autoCapitalize="none" autoCorrect={false} editable={!busy} />
      <Text style={{ color: c.secondary, fontSize: 12, marginBottom: 14 }}>Товар, акция или любая ссылка: Instagram, WhatsApp, Telegram. Для акционных товаров — /catalog?quick=promo.</Text>
      {form.link ? <><Text style={label}>Текст кнопки</Text><TextInput accessibilityLabel="Текст кнопки сторис" value={form.linkLabel} onChangeText={linkLabel => change({ linkLabel })} maxLength={40} placeholder="Открыть товар" placeholderTextColor={c.secondary} style={field} editable={!busy} /></> : null}
      <Text style={label}>Срок показа</Text>
      {editing ? <Text style={{ color: c.secondary, fontSize: 13, marginBottom: 8 }}>Сейчас: {form.expiresAt ? `до ${when(form.expiresAt)} МСК` : "без срока"}</Text> : null}
      <Chips items={editing ? [{ value: "keep", label: "Оставить срок" }, ...LIFE] : LIFE} value={life} onChange={v => { if (!busy) setLife(v); }} />
      <Text style={label}>Порядок (меньше — левее)</Text><TextInput accessibilityLabel="Порядок сторис" value={String(form.position)} onChangeText={v => { if (/^\d{0,4}$/.test(v)) change({ position: Number(v) }); }} keyboardType="number-pad" style={field} editable={!busy} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><Text style={{ color: c.label }}>Показывать клиентам</Text><Switch accessibilityLabel="Показывать клиентам" value={form.published} onValueChange={published => change({ published })} disabled={!!busy} trackColor={{ true: "#8b3dff" }} /></View>
      <View style={{ gap: 10 }}>
        <ActionButton label="Предпросмотр" icon="eye-outline" kind="soft" disabled={!form.mediaUrl || !!busy} onPress={() => setPreview(true)} />
        <ActionButton label={form.published ? "Опубликовать сторис" : "Сохранить черновик"} loading={busy === "save"} disabled={!!busy} onPress={() => void save(form.published)} />
        <ActionButton label="Отмена" kind="soft" disabled={!!busy} onPress={() => { setPreview(false); setForm(null); setEditing(null); setError(""); }} />
      </View>
    </Card> : <View style={{ marginBottom: 18 }}><ActionButton label="Создать сторис" icon="add-circle-outline" onPress={() => edit(null)} disabled={!!busy} /></View>}
    {loading && !data ? <Loading /> : !data ? <ErrorState text={loadError} onRetry={reload} /> : !data.items.length ? <Empty icon="play-circle-outline" text="Сторис пока нет. Создайте первую публикацию — она появится у клиентов после публикации." /> : data.items.map(s => <Card key={s.id}>
      <View style={{ flexDirection: "row", gap: 14, marginBottom: 14 }}><Image source={{ uri: storyMediaUrl(s.coverUrl)! }} contentFit="cover" style={{ width: 68, height: 68, borderRadius: 34 }} /><View style={{ flex: 1, gap: 5 }}><Text style={{ color: c.label, fontSize: 18, fontWeight: "700" }}>{s.title}</Text><Text style={{ color: storyState(s) === "Опубликована" ? "#16a34a" : c.secondary, fontWeight: "600" }}>{storyState(s)} · {s.kind === "img" ? "Фото" : "Видео"}</Text><Text style={{ color: c.secondary, fontSize: 12 }}>{s.expiresAt ? `До ${when(s.expiresAt)} МСК` : "Без срока"} · порядок {s.position}</Text></View></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}><ActionButton label="Изменить" kind="soft" disabled={!!busy || !!form} onPress={() => edit(s)} />{storyState(s) === "Опубликована" ? <ActionButton label="Скрыть" kind="soft" disabled={!!busy || !!form} onPress={() => void hide(s)} /> : null}<Pressable accessibilityRole="button" disabled={!!busy || !!form} onPress={() => remove(s)} style={{ padding: 14, opacity: busy || form ? 0.4 : 1 }}><Text style={{ color: c.blurTint === "dark" ? "#fca5a5" : "#b91c1c", fontWeight: "600" }}>Удалить</Text></Pressable></View>
    </Card>)}
    {preview && form ? <StoryPreview story={form} onClose={() => setPreview(false)} /> : null}
  </Screen>;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api";
import { useAuth } from "@/store/auth";
import { TitleBar } from "@/components/iosui/TitleBar";
import { GradientButton, OutlineButton } from "@/components/iosui/Buttons";
import { WholesaleProofForm } from "@/components/WholesaleProof";
import { clearProofDraft, loadProofDraft, removeProofFile, saveProofDraft, type ProofDraft, type ProofFile } from "@/proofs/storage";
import { useIOS } from "@/ios";

export default function Proofs() {
  const c = useIOS(), insets = useSafeAreaInsets();
  const customerId = useAuth(s => s.customer?.id);
  const [draft, setDraft] = useState<ProofDraft | null>(null), [files, setFiles] = useState<ProofFile[]>([]);
  const [received, setReceived] = useState(0), [error, setError] = useState(""), [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [ready, setReady] = useState(false), [completed, setCompleted] = useState(false);
  const sending = useRef(false), controller = useRef<AbortController | null>(null), mounted = useRef(true), current = useRef<ProofDraft | null>(null);
  const persist = async (next: ProofDraft) => { current.current = next; setDraft(next); await saveProofDraft(next); };
  const load = useCallback(async () => {
    try {
      const customer = useAuth.getState().customer;
      if (customer?.id !== customerId) return;
      setReady(false);
      const stored = await loadProofDraft();
      const active = stored && (customer?.id === stored.customerId || !customer && stored.registration) ? stored : null;
      const next = active ?? (customer ? { customerId: customer.id, token: null, registration: false, autoLogin: true, message: "", files: [], createdAt: Date.now() } : null);
      if (!next) throw new Error("Не удалось найти незавершённую загрузку. Войдите в аккаунт или напишите в поддержку.");
      current.current = next; setDraft(next);
      const status = await api.proofStatus(next.token);
      const savedIds = new Set(status.files.map(f => f.uploadId));
      const remaining = next.files.filter(f => !savedIds.has(f.id));
      setReceived(status.files.length); setFiles(remaining);
      for (const sent of next.files.filter(f => savedIds.has(f.id))) await removeProofFile(sent);
      if (active) await saveProofDraft({ ...next, files: remaining });
      current.current = { ...next, files: remaining }; setDraft(current.current);
      setError(""); setReady(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось проверить загрузку"); }
  }, [customerId]);
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; controller.current?.abort(); }; }, [load]);

  const changeFiles = (selected: ProofFile[]) => {
    if (sending.current || !current.current) return;
    setFiles(selected); void persist({ ...current.current, files: selected }).catch(() => setError("Не удалось сохранить загрузку на устройстве. Не закрывайте экран до завершения отправки."));
  };
  const finish = async (discardFailed: boolean) => {
    const currentDraft = current.current; if (!currentDraft) return;
    await api.completeProofs(currentDraft.token, discardFailed);
    await clearProofDraft();
    for (const file of currentDraft.files) await removeProofFile(file);
    current.current = null; setFiles([]); setCompleted(true); setProgress("");
    if (currentDraft.registration && currentDraft.autoLogin) { await useAuth.getState().refresh(); }
  };
  const upload = async () => {
    if (sending.current || !ready || !current.current || !files.length) return;
    sending.current = true; setBusy(true); setError(""); controller.current = new AbortController();
    const batch = [...files];
    try {
      for (let i = 0; i < batch.length; i++) {
        if (controller.current.signal.aborted) return;
        setProgress(`Файл ${i + 1} из ${batch.length} · 0%`);
        await api.uploadProof(batch[i], current.current!.token, { signal: controller.current.signal, onProgress: p => { if (mounted.current) setProgress(p === 100 ? "Сохраняем файл на сервере…" : `Файл ${i + 1} из ${batch.length} · ${p}%`); } });
        const next: ProofDraft = { ...current.current!, files: current.current!.files.filter(f => f.id !== batch[i].id) };
        current.current = next; await saveProofDraft(next); await removeProofFile(batch[i]);
        if (mounted.current) { setFiles(next.files); setDraft(next); setReceived(n => n + 1); }
      }
      if (mounted.current) await finish(false);
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : "Файл не загрузился. Повторите отправку."); }
    finally { sending.current = false; if (mounted.current) { setBusy(false); setProgress(""); } }
  };
  const completeReceived = () => {
    if (!received || sending.current) return;
    if (preparing) return;
    const send = async () => { sending.current = true; setBusy(true); try { await finish(true); } catch (e) { setError(e instanceof Error ? e.message : "Не удалось завершить загрузку"); } finally { sending.current = false; setBusy(false); } };
    if (files.length) Alert.alert("Завершить с полученными файлами?", `Менеджер получит ${received} файлов. Неотправленных: ${files.length}.`, [{ text: "Продолжить загрузку", style: "cancel" }, { text: "Завершить", onPress: () => void send() }]);
    else void send();
  };
  return <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 18, paddingBottom: insets.bottom + 32, gap: 16 }} keyboardShouldPersistTaps="handled">
    <TitleBar title="Фото и видео магазина" />
    {completed ? <>
      <Text style={{ color: c.label, fontSize: 22, fontWeight: "700" }}>Файлы получены</Text>
      <Text style={{ color: c.secondary }}>{draft?.registration && !draft.autoLogin ? "Заявка передана менеджеру вместе с фото и видео. Он проверит её и свяжется с вами." : "Менеджер сможет посмотреть фото и видео в вашей карточке."}</Text>
      <GradientButton title={draft?.autoLogin ? "Перейти в каталог" : "На главную"} onPress={() => router.replace(draft?.autoLogin ? "/catalog" : "/")} />
    </> : <>
      <Text style={{ color: c.label, fontSize: 18, fontWeight: "700" }}>{draft?.registration ? "Завершите отправку фото" : "Добавьте фото или видео"}</Text>
      <Text style={{ color: c.secondary }}>{draft?.registration ? "Аккаунт создан. Чтобы менеджер получил вашу заявку с подтверждением, дождитесь окончания загрузки. При сбое можно продолжить с этого места." : "Подойдут фотографии или видео магазина либо онлайн-заказов. Большие фотографии сжимаются перед отправкой."}</Text>
      <Text accessibilityLiveRegion="polite" style={{ color: c.label, fontWeight: "600" }}>Получено сервером: {received} файлов</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: "#E5484D" }}>{error}</Text> : null}
      {error ? <Pressable onPress={() => router.push("/info")} accessibilityRole="button"><Text style={{ color: "#8b3dff", fontWeight: "600" }}>Связаться с поддержкой</Text></Pressable> : null}
      {!ready ? <OutlineButton title="Проверить загрузку" onPress={() => void load()} /> : null}
      {ready && received < 10 ? <WholesaleProofForm shopType={null} setShopType={() => {}} hideShopType maxFiles={Math.max(0, 10 - received)} files={files} setFiles={changeFiles} errors={{}} disabled={busy} onPreparing={setPreparing} /> : null}
      {busy ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><ActivityIndicator color="#8b3dff" /><Text accessibilityLiveRegion="polite" style={{ color: c.label }}>{progress || "Завершаем отправку…"}</Text></View> : null}
      {files.length ? <GradientButton title={busy ? progress || "Отправляем…" : error ? "Повторить отправку" : `Отправить файлы · ${files.length}`} disabled={!ready || preparing} loading={busy} onPress={() => void upload()} /> : null}
      {received > 0 && !busy ? <OutlineButton title={files.length ? `Завершить с загруженными файлами · ${received}` : "Завершить отправку"} onPress={completeReceived} /> : null}
      {draft?.registration && !busy ? <Pressable onPress={() => router.replace("/")} accessibilityRole="button"><Text style={{ color: c.secondary, textAlign: "center", padding: 12 }}>Продолжить загрузку позже</Text></Pressable> : null}
    </>}
  </ScrollView>;
}

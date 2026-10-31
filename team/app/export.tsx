import { Platform } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Screen } from "@/components/Screen";
import { ActionButton, Card, Empty, ErrorState, Loading, StatusPill } from "@/components/kit";
import { useLoad } from "@/useLoad";
import { get, requestText } from "@/api";
import { date, money } from "@/format";
import { useIOS } from "@/ios";
import { clientName, type OrdersPage } from "@/types";

/**
 * Exported files are kept in the app's documents (not the cache): after the export the orders are
 * «Выгружен в 1С» and the same XML can't be downloaded again, so a closed share sheet must not lose it.
 * The last KEEP_FILES files are kept (a new export must not replace a file nobody has sent yet).
 */
const KEEP_FILES = 10;
const EXPORT_DIR = (FileSystem.documentDirectory ?? "") + "1c-export/";

/** browser version: the XML is saved by the browser like any download */
function downloadInBrowser(xml: string, name: string) {
  const blob = new Blob([xml], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

async function latestExport(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const names = (await FileSystem.readDirectoryAsync(EXPORT_DIR)).filter((n) => n.endsWith(".xml")).sort();
    return names.length ? EXPORT_DIR + names[names.length - 1] : null;
  } catch {
    return null;
  }
}

async function shareFile(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/xml", UTI: "public.xml", dialogTitle: "Orders.xml" });
  } else Alert.alert("Готово", "Заказы выгружены, файл сохранён в приложении.");
}

/** Выгрузка в 1С (as /admin/orders/export): orders «Подтверждён» and «Заказ оформлен» → Orders.xml, they become «Выгружен в 1С». */
export default function ExportScreen() {
  const c = useIOS();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [lastFile, setLastFile] = useState<string | null>(null);
  useEffect(() => {
    latestExport().then(setLastFile);
  }, []);
  const { data, error, loading, reload } = useLoad(async () => {
    // every page of both statuses — the export takes them all
    const all = async (status: string) => {
      const out: OrdersPage["orders"] = [];
      for (let page = 1; page <= 40; page++) {
        const r = await get<OrdersPage>(`/api/team/orders?date=&status=${status}&page=${page}`);
        out.push(...r.orders);
        if (page >= r.totalPages) break;
      }
      return out;
    };
    const [a, b] = await Promise.all([all("approved"), all("payment")]);
    return [...a, ...b].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  }, []);
  const sum = data?.reduce((s, o) => s + o.total, 0) ?? 0;

  const run = () =>
    Alert.alert("Выгрузить в 1С?", `${data?.length ?? 0} заказ(ов) на ${money(sum)} получат статус «Выгружен в 1С». Файл Orders.xml можно будет отправить себе.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Выгрузить",
        onPress: async () => {
          // one export at a time: a second POST would mark nothing and return an empty file
          if (running.current) return;
          running.current = true;
          setBusy(true);
          let uri: string | null = null;
          try {
            const xml = await requestText("/api/admin/orders/export", { method: "POST" });
            if (Platform.OS === "web") {
              const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
              downloadInBrowser(xml, `Orders-${stamp}.xml`);
              reload();
              return;
            }
            await FileSystem.makeDirectoryAsync(EXPORT_DIR, { intermediates: true }).catch(() => {});
            const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
            const target = `${EXPORT_DIR}Orders-${stamp}.xml`;
            await FileSystem.writeAsStringAsync(target, xml);
            uri = target;
            const names = (await FileSystem.readDirectoryAsync(EXPORT_DIR).catch(() => [] as string[])).filter((n) => n.endsWith(".xml")).sort();
            for (const n of names.slice(0, Math.max(0, names.length - KEEP_FILES))) FileSystem.deleteAsync(EXPORT_DIR + n, { idempotent: true }).catch(() => {});
            setLastFile(uri);
          } catch (e) {
            Alert.alert("Не выгружено", e instanceof Error ? e.message : "");
          } finally {
            running.current = false;
            setBusy(false);
          }
          reload();
          if (uri) await shareFile(uri).catch((e) => Alert.alert("Файл не отправлен", e instanceof Error ? e.message : ""));
        },
      },
    ]);

  return (
    <Screen title="Выгрузка в 1С" onRefresh={reload}>
      {loading && !data ? <Loading /> : !data ? <ErrorState text={error} onRetry={reload} /> : (
        <>
          <Card>
            <Text style={{ color: c.label, fontSize: 17, fontWeight: "700" }}>В очереди: {data.length}</Text>
            <Text style={{ color: c.secondary, marginTop: 4 }}>На сумму {money(sum)}</Text>
            <View style={{ marginTop: 14 }}>
              <ActionButton label={data.length ? "Выгрузить и получить файл" : "Нечего выгружать"} icon="cloud-upload-outline" loading={busy} disabled={data.length === 0} onPress={run} />
            </View>
            {lastFile ? (
              <View style={{ marginTop: 10 }}>
                <ActionButton label="Отправить последний файл ещё раз" icon="share-outline" kind="soft" onPress={() => shareFile(lastFile).catch(() => {})} />
              </View>
            ) : null}
          </Card>
          {data.length === 0 ? <Empty icon="checkmark-done-outline" text="Нечего выгружать" /> : null}
          {data.map((o) => (
            <Card key={o.id} onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(o.id) } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: c.label, fontWeight: "700", fontSize: 16 }}>№ {o.id}</Text>
                <StatusPill status={o.status} label={o.statusLabel} />
              </View>
              <Text style={{ color: c.label, marginTop: 4 }} numberOfLines={1}>
                {clientName(o.customer)}
              </Text>
              <Text style={{ color: c.secondary, marginTop: 2 }}>
                {date(o.createdAt)} · {money(o.total)}
              </Text>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

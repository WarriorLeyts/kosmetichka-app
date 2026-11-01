import { useEffect, useRef, useState } from "react";
import { Alert, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { ActionButton, Card } from "@/components/kit";
import { get, post } from "@/api";
import { useIOS } from "@/ios";

type Kind = "catalog" | "customers";
type Job = {
  status?: "idle" | "running" | "done" | "error";
  startedAt?: number | null;
  duration?: string | null;
  error?: string | null;
  // the counts (old and new answers alike)
  products?: number;
  categories?: number;
  brands?: number;
  prices?: number;
  images?: number;
  customers?: number;
};

const ENDPOINT: Record<Kind, string> = { catalog: "/api/admin/import/1c", customers: "/api/admin/import-customers" };

function lines(kind: Kind, r: Job): string[] {
  if (kind === "catalog") return [`Каталог загружен за ${r.duration}`, `Товаров: ${r.products}`, `Категорий: ${r.categories}`, `Брендов: ${r.brands}`, `Цен: ${r.prices}`, `Фото: ${r.images}`];
  return [`Контрагенты загружены за ${r.duration}`, `Клиентов: ${r.customers}`];
}

/**
 * Импорт из 1С: catalog (products, prices, stock, photos) and customers — the site's import commands.
 * The site runs a long import in the background: the screen shows «идёт загрузка» and checks every
 * 3 s (it used to wait in one request, which timed out and left nobody knowing whether it finished).
 */
export default function ImportScreen() {
  const c = useIOS();
  const [busy, setBusy] = useState<Kind | "">("");
  const [since, setSince] = useState<number | null>(null);
  const [result, setResult] = useState<string[]>([]);
  // one import at a time (two quick taps open two confirmations → two parallel imports on the server)
  const running = useRef(false);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const follow = async (kind: Kind, first: Job) => {
    let r = first;
    while (alive.current && r.status === "running") {
      setSince(r.startedAt ?? null);
      await new Promise((ok) => setTimeout(ok, 3000));
      try {
        r = await get<Job>(ENDPOINT[kind]);
      } catch {
        /* a dropped connection: ask again */
      }
    }
    if (!alive.current) return;
    if (r.status === "error") Alert.alert("Импорт не выполнен", r.error ?? "");
    else setResult(lines(kind, r));
  };

  // opened while an import started earlier is still running: show it
  useEffect(() => {
    (async () => {
      for (const kind of ["catalog", "customers"] as Kind[]) {
        const r = await get<Job>(ENDPOINT[kind]).catch(() => null);
        if (r?.status === "running" && !running.current) {
          running.current = true;
          setBusy(kind);
          await follow(kind, r);
          running.current = false;
          if (alive.current) setBusy("");
          return;
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = (kind: Kind) =>
    Alert.alert(kind === "catalog" ? "Загрузить каталог из 1С?" : "Загрузить контрагентов из 1С?", "Это может занять несколько минут. Экран можно закрыть — загрузка продолжится.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Загрузить",
        onPress: async () => {
          if (running.current) return;
          running.current = true;
          setBusy(kind);
          setResult([]);
          try {
            const r = await post<Job>(ENDPOINT[kind]);
            await follow(kind, r.status ? r : { ...r, status: "done" });
          } catch (e) {
            Alert.alert("Импорт не выполнен", e instanceof Error ? e.message : "");
          } finally {
            running.current = false;
            if (alive.current) {
              setBusy("");
              setSince(null);
            }
          }
        },
      },
    ]);

  const runningText = since ? `Идёт загрузка… начата в ${new Date(since).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}` : "Идёт загрузка…";

  return (
    <Screen title="Импорт из 1С">
      <Card>
        <Text style={{ color: c.label, fontSize: 16, fontWeight: "700" }}>Каталог</Text>
        <Text style={{ color: c.secondary, marginTop: 4, marginBottom: 12 }}>Товары, категории, бренды, цены, остатки и фото из последней выгрузки 1С.</Text>
        <ActionButton label="Загрузить каталог" icon="cloud-download-outline" loading={busy === "catalog"} disabled={!!busy && busy !== "catalog"} onPress={() => run("catalog")} />
        {busy === "catalog" ? <Text style={{ color: c.secondary, marginTop: 8 }}>{runningText}</Text> : null}
      </Card>
      <Card>
        <Text style={{ color: c.label, fontSize: 16, fontWeight: "700" }}>Контрагенты</Text>
        <Text style={{ color: c.secondary, marginTop: 4, marginBottom: 12 }}>Клиенты из 1С: реквизиты, типы цен, менеджеры.</Text>
        <ActionButton label="Загрузить контрагентов" icon="people-outline" kind="soft" loading={busy === "customers"} disabled={!!busy && busy !== "customers"} onPress={() => run("customers")} />
        {busy === "customers" ? <Text style={{ color: c.secondary, marginTop: 8 }}>{runningText}</Text> : null}
      </Card>
      {result.length ? (
        <Card>
          {result.map((l, i) => (
            <Text key={i} style={{ color: i === 0 ? "#16A34A" : c.label, fontWeight: i === 0 ? "700" : "400", marginVertical: 2 }}>
              {l}
            </Text>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

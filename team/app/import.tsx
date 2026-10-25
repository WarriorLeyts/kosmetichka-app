import { useRef, useState } from "react";
import { Alert, Text } from "react-native";
import { Screen } from "@/components/Screen";
import { ActionButton, Card } from "@/components/kit";
import { post } from "@/api";
import { useIOS } from "@/ios";

/** Импорт из 1С: catalog (products, prices, stock, photos) and customers — the site's import commands. */
export default function ImportScreen() {
  const c = useIOS();
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<string[]>([]);
  // one import at a time (two quick taps open two confirmations → two parallel imports on the server)
  const running = useRef(false);

  const run = (kind: "catalog" | "customers") =>
    Alert.alert(kind === "catalog" ? "Загрузить каталог из 1С?" : "Загрузить контрагентов из 1С?", "Это может занять несколько минут.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Загрузить",
        onPress: async () => {
          if (running.current) return;
          running.current = true;
          setBusy(kind);
          try {
            if (kind === "catalog") {
              const r = await post<{ products: number; categories: number; brands: number; prices: number; images: number; duration: string }>("/api/admin/import/1c");
              setResult([`Каталог загружен за ${r.duration}`, `Товаров: ${r.products}`, `Категорий: ${r.categories}`, `Брендов: ${r.brands}`, `Цен: ${r.prices}`, `Фото: ${r.images}`]);
            } else {
              const r = await post<{ customers: number; duration: string }>("/api/admin/import-customers");
              setResult([`Контрагенты загружены за ${r.duration}`, `Клиентов: ${r.customers}`]);
            }
          } catch (e) {
            Alert.alert("Импорт не выполнен", e instanceof Error ? e.message : "");
          } finally {
            running.current = false;
            setBusy("");
          }
        },
      },
    ]);

  return (
    <Screen title="Импорт из 1С">
      <Card>
        <Text style={{ color: c.label, fontSize: 16, fontWeight: "700" }}>Каталог</Text>
        <Text style={{ color: c.secondary, marginTop: 4, marginBottom: 12 }}>Товары, категории, бренды, цены, остатки и фото из последней выгрузки 1С.</Text>
        <ActionButton label="Загрузить каталог" icon="cloud-download-outline" loading={busy === "catalog"} onPress={() => run("catalog")} />
      </Card>
      <Card>
        <Text style={{ color: c.label, fontSize: 16, fontWeight: "700" }}>Контрагенты</Text>
        <Text style={{ color: c.secondary, marginTop: 4, marginBottom: 12 }}>Клиенты из 1С: реквизиты, типы цен, менеджеры.</Text>
        <ActionButton label="Загрузить контрагентов" icon="people-outline" kind="soft" loading={busy === "customers"} onPress={() => run("customers")} />
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

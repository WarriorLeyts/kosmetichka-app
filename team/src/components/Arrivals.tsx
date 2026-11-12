import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Card, SectionTitle } from "./kit";
import { useLoad } from "../useLoad";
import { get } from "../api";
import { date } from "../format";
import { useIOS } from "../ios";

type ArrivalItem = { productId: number; name: string; imageUrl: string | null; stock: number; arrivedAt: string; isNew: boolean; places: string[] };

/**
 * «Новые поступления» for staff (Сводка): everything that came in the last 10 days to the warehouse
 * (приходы) or to the shop (перемещения на Мегу) and is in stock; where it came; «Новинка».
 */
export function Arrivals() {
  const c = useIOS();
  const { data } = useLoad(() => get<{ days: number; items: ArrivalItem[] }>("/api/team/arrivals"), [], { refocus: true });
  if (!data?.items.length) return null;
  const fresh = data.items.filter((i) => i.isNew).length;
  return (
    <>
      <SectionTitle>
        Новые поступления · {data.items.length}
        {fresh ? ` · новинок ${fresh}` : ""}
      </SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
        {data.items.map((it) => (
          <Card key={it.productId} style={styles.card} onPress={() => router.push({ pathname: "/product/[id]", params: { id: String(it.productId) } })}>
            <View style={styles.imgBox}>
              {it.imageUrl ? <Image source={{ uri: it.imageUrl }} style={styles.img} contentFit="contain" /> : null}
              {it.isNew ? (
                <LinearGradient colors={["#8b3dff", "#e82c87"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                  <Text style={styles.badgeText}>Новинка</Text>
                </LinearGradient>
              ) : null}
            </View>
            <Text style={[styles.name, { color: c.label }]} numberOfLines={2}>
              {it.name}
            </Text>
            <Text style={{ color: c.secondary, fontSize: 12.5, marginTop: 4 }}>
              {it.places.join(" + ")} · {date(it.arrivedAt)}
            </Text>
          </Card>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  card: { width: 170, padding: 10 },
  imgBox: { height: 120, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "90%", height: "90%" },
  badge: { position: "absolute", top: 6, left: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 11.5 },
  name: { marginTop: 8, fontWeight: "600", fontSize: 13.5, lineHeight: 18 },
});

import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors, themed } from "@/theme";
import { SHOPS } from "@/stores";
import { Empty, Header } from "@/components/ui";

export default function Stores() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header back title="Наши магазины" />
      {SHOPS.length === 0 ? (
        <Empty
          icon="storefront-outline"
          title="Скоро здесь появятся магазины"
          text="Адреса, часы работы и телефоны наших магазинов"
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
          {SHOPS.map((s) => (
            <View key={s.address} style={styles.card}>
              {s.photo ? <Image source={{ uri: s.photo }} style={styles.photo} contentFit="cover" /> : null}
              <View style={styles.body}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{s.name}</Text>
                  <Text style={styles.addr}>{s.address}</Text>
                  {s.hours ? (
                    <View style={styles.hours}>
                      <Ionicons name="time-outline" size={14} color={colors.pink} />
                      <Text style={styles.hoursText}>{s.hours}</Text>
                    </View>
                  ) : null}
                </View>
                {s.phone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${s.phone}`)} style={styles.round}>
                    <Ionicons name="call-outline" size={19} color={colors.text} />
                  </Pressable>
                ) : null}
                {s.mapUrl ? (
                  <Pressable onPress={() => Linking.openURL(s.mapUrl!)} style={styles.round}>
                    <Ionicons name="navigate-outline" size={19} color={colors.text} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = themed(() => ({
  card: { backgroundColor: colors.card, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  photo: { width: "100%", height: 170 },
  body: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  addr: { color: colors.muted, fontSize: 13, marginTop: 3 },
  hours: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  hoursText: { color: colors.muted, fontSize: 12.5 },
  round: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
}));

import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { tap } from "@/components/ui";
import { iosText, useIOS } from "@/ios";
import { api } from "@/api";

const VIOLET = "#8b3dff";
const PINK = "#e82c87";

export type ProofFile = { uri: string; name: string; mime: string; video: boolean };
export type ShopType = "offline" | "online" | "both";

export const PROOF_MAX = 10;
const MB = 1024 * 1024;
const LIMIT = { img: 15 * MB, video: 50 * MB };

/** The text every wholesale applicant reads (the owner's wording). */
export function WholesaleTerms() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <View style={[st.terms, { backgroundColor: dark ? "#2A1F38" : "#F5EEFB" }]}>
      <Text style={[st.termsTitle, { color: c.label }]}>Здравствуйте!</Text>
      <Text style={[st.termsText, { color: c.label }]}>
        Вы регистрируетесь как оптовый клиент. Чтобы мы подтвердили аккаунт, нужно показать, что вы покупаете товар для перепродажи. Для этого подойдут фотографии или видео вашего магазина или онлайн-заказов.
      </Text>
      <View style={st.rule}>
        <Ionicons name="cart-outline" size={18} color={VIOLET} />
        <Text style={[st.termsText, { color: c.label, flex: 1 }]}>
          Минимальный оптовый заказ — <Text style={st.b}>5 000 ₽</Text>, эту сумму нужно набирать в каждом заказе.
        </Text>
      </View>
      <View style={st.rule}>
        <Ionicons name="business-outline" size={18} color={VIOLET} />
        <Text style={[st.termsText, { color: c.label, flex: 1 }]}>
          Крупный опт — от <Text style={st.b}>50 000 ₽</Text>, эту сумму тоже нужно набирать каждый раз.
        </Text>
      </View>
      <View style={st.rule}>
        <Ionicons name="car-outline" size={18} color={PINK} />
        <Text style={[st.termsText, { color: c.label, flex: 1 }]}>
          При заказе от <Text style={st.b}>50 000 ₽</Text> — бесплатная доставка по Чеченской Республике, Ингушетии и Дагестану.
        </Text>
      </View>
    </View>
  );
}

const TYPES: { value: ShopType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "offline", label: "Магазин", icon: "storefront-outline" },
  { value: "online", label: "Онлайн", icon: "globe-outline" },
  { value: "both", label: "И то, и другое", icon: "git-merge-outline" },
];

/**
 * «Где вы продаёте» + photos / videos of the shop or online orders (no link: the photos are enough).
 * State is the parent's; errors: { shopType?, proofs? }.
 */
export function WholesaleProofForm({
  shopType,
  setShopType,
  files,
  setFiles,
  errors,
}: {
  shopType: ShopType | null;
  setShopType: (t: ShopType) => void;
  files: ProofFile[];
  setFiles: (f: ProofFile[]) => void;
  errors: { shopType?: string; proofs?: string };
}) {
  const c = useIOS();
  const dark = c.blurTint === "dark";

  const add = async () => {
    tap();
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, PROOF_MAX - files.length),
        quality: 0.8,
        videoMaxDuration: 120,
      });
      if (r.canceled) return;
      const picked: ProofFile[] = [];
      let tooBig = 0;
      for (const a of r.assets) {
        const video = a.type === "video";
        const ext = (a.fileName?.split(".").pop() || a.uri.split(".").pop() || (video ? "mp4" : "jpg")).toLowerCase().slice(0, 5);
        if (a.fileSize && a.fileSize > (video ? LIMIT.video : LIMIT.img)) {
          tooBig++;
          continue;
        }
        picked.push({
          uri: a.uri,
          video,
          name: a.fileName || `${video ? "video" : "photo"}-${Date.now()}-${picked.length}.${ext}`,
          mime: a.mimeType || (video ? (ext === "mov" ? "video/quicktime" : "video/mp4") : ext === "png" ? "image/png" : "image/jpeg"),
        });
      }
      setFiles([...files, ...picked].slice(0, PROOF_MAX));
      if (tooBig) Alert.alert("Слишком большие файлы", `Не добавлено: ${tooBig}. Фото — до 15 МБ, видео — до 50 МБ.`);
    } catch (e) {
      Alert.alert("Не получилось", e instanceof Error ? e.message : "Попробуйте ещё раз");
    }
  };

  return (
    <View style={{ gap: 4, marginBottom: 14 }}>
      <Text style={[st.label, { color: c.secondary }]}>Где вы продаёте</Text>
      <View style={st.types}>
        {TYPES.map((t) => {
          const on = shopType === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => {
                tap();
                setShopType(t.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[st.type, { borderColor: on ? VIOLET : c.separator, backgroundColor: on ? (dark ? "rgba(139,61,255,0.22)" : "rgba(139,61,255,0.08)") : "transparent" }]}
            >
              <Ionicons name={t.icon} size={20} color={on ? VIOLET : c.secondary} />
              <Text style={[st.typeText, { color: on ? VIOLET : c.label }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {errors.shopType ? <Text style={st.err}>{errors.shopType}</Text> : null}


      <Text style={[st.label, { color: c.secondary, marginTop: 6 }]}>Фото или видео магазина либо онлайн-заказов</Text>
      <View style={st.grid}>
        {files.map((f, i) => (
          <View key={f.uri + i} style={[st.thumb, { backgroundColor: c.cellPressed }]}>
            {f.video ? (
              <View style={st.videoThumb}>
                <Ionicons name="videocam" size={26} color={VIOLET} />
                <Text style={{ color: c.secondary, fontSize: 12 }}>видео</Text>
              </View>
            ) : (
              <Image source={{ uri: f.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            )}
            <Pressable
              onPress={() => setFiles(files.filter((_, k) => k !== i))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Убрать файл"
              style={st.remove}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {files.length < PROOF_MAX ? (
          <Pressable
            onPress={add}
            accessibilityRole="button"
            accessibilityLabel="Добавить фото или видео"
            style={[st.thumb, st.addBtn, { borderColor: errors.proofs ? "#ff3b30" : VIOLET }]}
          >
            <Ionicons name="add" size={28} color={VIOLET} />
            <Text style={{ color: VIOLET, fontSize: 12, fontWeight: "600" }}>Добавить</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={[iosText.footnote, { color: errors.proofs ? "#ff3b30" : c.secondary }]}>
        {errors.proofs || `Хотя бы одно фото или видео, до ${PROOF_MAX} файлов. Фото — до 15 МБ, видео — до 50 МБ.`}
      </Text>
    </View>
  );
}

/** Uploads the files one by one; returns those that didn't go (to retry). `onStep(done, total)`. */
export async function uploadProofs(files: ProofFile[], token: string | null, onStep?: (done: number, total: number) => void): Promise<{ failed: ProofFile[]; error: string }> {
  const failed: ProofFile[] = [];
  let error = "";
  for (let i = 0; i < files.length; i++) {
    onStep?.(i, files.length);
    try {
      await api.uploadProof(files[i], token);
    } catch (e) {
      failed.push(files[i]);
      error = e instanceof Error ? e.message : "Файл не загрузился";
    }
  }
  onStep?.(files.length, files.length);
  return { failed, error };
}

const st = StyleSheet.create({
  terms: { borderRadius: 18, padding: 16, gap: 10, marginTop: 14 },
  termsTitle: { fontSize: 17, fontWeight: "700" },
  termsText: { fontSize: 15, lineHeight: 21 },
  b: { fontWeight: "700" },
  rule: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  types: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  type: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  typeText: { fontSize: 15, fontWeight: "600" },
  err: { color: "#ff3b30", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 76, height: 76, borderRadius: 14, overflow: "hidden" },
  videoThumb: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  remove: { position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  addBtn: { borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
});

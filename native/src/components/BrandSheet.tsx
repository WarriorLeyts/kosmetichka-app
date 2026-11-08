import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { api } from "@/api";
import { brandLogo } from "@/brandLogos";
import { useIOS } from "@/ios";
import { GradientButton } from "@/components/iosui/Buttons";
import { ClearX } from "@/components/ClearX";
import { tap } from "@/components/ui";
import { plural } from "@/format";
import { SUB_FILTERS } from "@/subFilters";
import type { useCatalogStore } from "@/store/catalog";

type Facet = { guid: string; name: string; count: number };
type Store = ReturnType<typeof useCatalogStore>["store"];

const VIOLET = "#8b3dff";
/** a computer / tablet: a window in the middle; a phone: a sheet from the bottom */
const WIDE = 700;

/** «шик» finds SHIK, «эстель» — ESTEL: the search also tries the Latin spelling of what is typed */
const TR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n",
  о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};
const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]/gu, "");
const latin = (s: string) => [...s].map((ch) => TR[ch] ?? ch).join("");

/**
 * «Бренд» in the catalogue: the brands of what the search / filters found, as cards with the brand's
 * logo (or its name set as a wordmark), the number of products, ticks (several at once), a search over
 * them, «Сбросить» and «Показать N товаров». A computer: a window with 3 columns; a phone: a sheet
 * from the bottom with 2 columns, the buttons pinned above the safe area and the keyboard.
 */
export function BrandSheet({ open, onClose, store }: { open: boolean; onClose: () => void; store: Store }) {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE;
  const [brands, setBrands] = useState<Facet[] | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [q, setQ] = useState("");
  // the brands chosen when the window opened go first (no jumping while ticking)
  const [firstAtOpen, setFirstAtOpen] = useState<string[]>([]);
  const [visible, setVisible] = useState(open);
  const anim = useRef(new Animated.Value(0)).current;

  // in and out
  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== "web" }).start();
    } else if (visible) {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== "web" }).start(() => setVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // each opening: the current choice, and the brands of what is found now
  useEffect(() => {
    if (!open) return;
    const s = store.getState();
    setPicked(s.brandGuids);
    setFirstAtOpen(s.brandGuids);
    setQ("");
    setError("");
    setBrands(null);
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const type = s.categoryGuid && s.typeLabel ? SUB_FILTERS[s.categoryGuid]?.find((x) => x.label === s.typeLabel) : undefined;
    api
      .brandFacets({ search: s.search || undefined, categoryGuids: s.categoryGuidsFor(s.categoryGuid), onlyStock: s.onlyStock, quick: s.quick, nameAny: type?.q }, ctl?.signal)
      .then((r) => setBrands(r.brands))
      .catch((e) => {
        if (!ctl?.signal.aborted) setError(e instanceof Error ? e.message : "Не удалось загрузить бренды");
      });
    return () => ctl?.abort();
  }, [open, store]);

  const shown = useMemo(() => {
    const list = brands ?? [];
    const t = norm(q.trim());
    const lt = latin(t);
    const hit = t ? list.filter((b) => { const n = norm(b.name); return n.includes(t) || (lt !== t && n.includes(lt)); }) : list;
    if (!firstAtOpen.length) return hit;
    return [...hit.filter((b) => firstAtOpen.includes(b.guid)), ...hit.filter((b) => !firstAtOpen.includes(b.guid))];
  }, [brands, q, firstAtOpen]);
  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const found = useMemo(() => (brands ?? []).filter((b) => pickedSet.has(b.guid)).reduce((n, b) => n + b.count, 0), [brands, pickedSet]);

  const toggle = useCallback((g: string) => {
    tap();
    setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));
  }, []);
  const apply = () => {
    const s = store.getState();
    const same = picked.length === s.brandGuids.length && picked.every((g) => s.brandGuids.includes(g));
    onClose();
    if (!same) s.set({ brandGuids: picked });
  };

  // the grid: 3 columns in the window, 2 on a phone
  const columns = wide ? 3 : 2;
  const gap = wide ? 12 : 10;
  const pad = wide ? 24 : 16;
  const boxW = wide ? Math.min(780, width - 48) : width;
  const cardW = Math.floor((boxW - pad * 2 - gap * (columns - 1)) / columns);
  const cardH = wide ? 138 : 128;

  const renderItem = useCallback(
    ({ item, index }: { item: Facet; index: number }) => (
      <View style={{ width: cardW, marginLeft: index % columns ? gap : 0, marginBottom: gap }}>
        <BrandCard brand={item} on={pickedSet.has(item.guid)} onToggle={toggle} dark={dark} wide={wide} height={cardH} />
      </View>
    ),
    [cardW, columns, gap, pickedSet, toggle, dark, wide, cardH]
  );

  const title = wide ? "Выберите бренды" : "Бренды";
  const fieldBg = dark ? "#2B193D" : "rgba(118,118,128,0.10)";

  const head = (
    <View style={{ paddingHorizontal: pad, paddingTop: wide ? 20 : 6 }}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: c.label, fontSize: wide ? 22 : 20 }]} accessibilityRole="header">
          {title}
        </Text>
        {picked.length > 0 ? (
          <View style={styles.counter} accessibilityLabel={`Выбрано брендов: ${picked.length}`}>
            <Text style={styles.counterText}>{picked.length}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть" hitSlop={8} style={[styles.close, { backgroundColor: dark ? "#2B193D" : "#F1ECF8" }]}>
          <Ionicons name="close" size={20} color={c.secondary} />
        </Pressable>
      </View>
      <View style={[styles.search, { backgroundColor: fieldBg, height: wide ? 46 : 44 }]}>
        <Ionicons name="search-outline" size={19} color={c.secondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Найти бренд"
          placeholderTextColor={c.secondary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.input, { color: c.label }, Platform.OS === "web" && ({ outlineStyle: "none" } as object)]}
          accessibilityLabel="Найти бренд"
        />
        <ClearX value={q} onClear={() => setQ("")} color={c.secondary} />
      </View>
    </View>
  );

  const body =
    brands === null && !error ? (
      <View style={styles.state}>
        <ActivityIndicator color={VIOLET} />
      </View>
    ) : error ? (
      <View style={styles.state}>
        <Ionicons name="cloud-offline-outline" size={30} color={c.secondary} />
        <Text style={[styles.stateText, { color: c.secondary }]}>{error}</Text>
      </View>
    ) : shown.length === 0 ? (
      <View style={styles.state}>
        <Ionicons name="search-outline" size={30} color={c.secondary} />
        <Text style={[styles.stateTitle, { color: c.label }]}>{q.trim() ? "Бренды не найдены" : "Нет брендов"}</Text>
        {q.trim() ? <Text style={[styles.stateText, { color: c.secondary }]}>Среди найденных товаров нет такого бренда</Text> : null}
      </View>
    ) : (
      <FlatList
        key={columns}
        data={shown}
        numColumns={columns}
        keyExtractor={(b) => b.guid}
        renderItem={renderItem}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 4, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={18}
        maxToRenderPerBatch={18}
        windowSize={7}
        removeClippedSubviews={Platform.OS === "android"}
        getItemLayout={(_, i) => ({ length: cardH + gap, offset: (cardH + gap) * Math.floor(i / columns), index: i })}
      />
    );

  const foot = (
    <View
      style={[
        styles.foot,
        { paddingHorizontal: pad, paddingBottom: wide ? 18 : Math.max(insets.bottom, 12), borderTopColor: dark ? "rgba(200,160,255,0.14)" : "#EFE9F7", backgroundColor: wide ? c.cell : c.bg },
      ]}
    >
      <Pressable
        onPress={() => { tap(); setPicked([]); }}
        disabled={picked.length === 0}
        accessibilityRole="button"
        accessibilityState={{ disabled: picked.length === 0 }}
        style={({ pressed }) => [styles.reset, { borderColor: dark ? "rgba(200,160,255,0.35)" : "#DCCDF6", opacity: picked.length === 0 ? 0.45 : pressed ? 0.7 : 1 }]}
      >
        <Text style={styles.resetText}>Сбросить</Text>
      </Pressable>
      <GradientButton
        style={{ flex: 1 }}
        title={
          picked.length === 0
            ? "Показать товары"
            : width < 360
              ? `Показать · ${found.toLocaleString("ru-RU")}`
              : `Показать ${found.toLocaleString("ru-RU")} ${plural(found, "товар", "товара", "товаров")}`
        }
        onPress={apply}
      />
    </View>
  );

  if (!visible) return null;
  const fade = { opacity: anim };
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(20,8,36,0.45)" }, fade]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть" />
      </Animated.View>
      {wide ? (
        <View style={styles.center} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.dialog,
              { width: boxW, height: Math.min(height - 64, 760), backgroundColor: c.cell },
              { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] },
            ]}
          >
            {head}
            <View style={{ flex: 1, marginTop: 14 }}>{body}</View>
            {foot}
          </Animated.View>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.bottom} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.sheet,
              { height: Math.round(height * 0.88), backgroundColor: c.bg },
              { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.4, 0] }) }] },
            ]}
          >
            <View style={styles.grabber} />
            {head}
            <View style={{ flex: 1, marginTop: 12 }}>{body}</View>
            {foot}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

/** One brand: the logo (or the name as a wordmark), the name, the number of products; a tick in the corner. */
const BrandCard = memo(function BrandCard({
  brand,
  on,
  onToggle,
  dark,
  wide,
  height,
}: {
  brand: Facet;
  on: boolean;
  onToggle: (g: string) => void;
  dark: boolean;
  wide: boolean;
  height: number;
}) {
  const logo = brandLogo(brand.name);
  const count = `${brand.count.toLocaleString("ru-RU")} ${plural(brand.count, "товар", "товара", "товаров")}`;
  const web = Platform.OS === "web";
  return (
    <Pressable
      onPress={() => onToggle(brand.guid)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${brand.name}, ${count}`}
      style={(st) => {
        const hovered = (st as { hovered?: boolean }).hovered;
        return [
          styles.card,
          { height },
          dark
            ? { backgroundColor: on ? "rgba(139,61,255,0.22)" : "#2B193D", borderColor: on ? VIOLET : "rgba(200,160,255,0.18)" }
            : { backgroundColor: on ? "#F5EEFF" : "#FFFFFF", borderColor: on ? VIOLET : hovered ? "#D9C8F5" : "#ECE4F8" },
          on && { borderWidth: 1.5 },
          hovered && !on && { boxShadow: "0 6px 18px rgba(103,47,190,0.12)" },
          st.pressed && { transform: [{ scale: 0.985 }] },
          web && ({ transitionProperty: "background-color, border-color, box-shadow, transform", transitionDuration: "160ms", cursor: "pointer" } as object),
        ];
      }}
    >
      <View style={[styles.check, on ? styles.checkOn : { borderColor: dark ? "rgba(200,160,255,0.45)" : "#CDBFE6", backgroundColor: dark ? "transparent" : "#fff" }]}>
        {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      <View style={[styles.logoBox, { width: wide ? 96 : 88, height: wide ? 52 : 46, backgroundColor: dark ? "#FFFFFF" : "transparent", borderRadius: 10 }]}>
        {logo ? (
          <Image
            source={{ uri: logo }}
            style={{ width: wide ? 86 : 78, height: wide ? 44 : 38 }}
            contentFit="contain"
            transition={120}
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text style={[styles.wordmark, { color: dark ? "#3B1F66" : "#3B1F66" }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {brand.name.toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={[styles.name, { color: dark ? "#FAF7FD" : "#1C1326" }]} numberOfLines={1}>
        {brand.name}
      </Text>
      <Text style={[styles.count, { color: dark ? "#C3AECF" : "#8A7F99" }]} numberOfLines={1}>
        {count}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 8, overflow: "hidden" },
  grabber: { alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: "rgba(127,127,127,0.35)", marginBottom: 8 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  dialog: { borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 70px rgba(40,10,80,0.28)" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  title: { fontWeight: "800" },
  counter: { minWidth: 26, height: 24, borderRadius: 12, paddingHorizontal: 8, backgroundColor: VIOLET, alignItems: "center", justifyContent: "center" },
  counterText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, paddingLeft: 14, paddingRight: 6 },
  input: { flex: 1, minWidth: 0, fontSize: 16, height: "100%" },
  card: { borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10 },
  check: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: VIOLET, borderColor: VIOLET },
  logoBox: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  wordmark: { fontSize: 13, fontWeight: "800", letterSpacing: 1.2, textAlign: "center", paddingHorizontal: 4 },
  name: { fontSize: 14, fontWeight: "600", maxWidth: "100%" },
  count: { fontSize: 12.5, marginTop: 2 },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 30, paddingBottom: 30 },
  stateTitle: { fontSize: 17, fontWeight: "700" },
  stateText: { fontSize: 14.5, textAlign: "center" },
  foot: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12, borderTopWidth: 1 },
  reset: { height: 52, paddingHorizontal: 20, borderRadius: 26, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  resetText: { color: VIOLET, fontSize: 16, fontWeight: "600" },
});

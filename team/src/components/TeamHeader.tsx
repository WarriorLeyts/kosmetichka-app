import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Wordmark } from "./Wordmark";
import { iosText, useIOS } from "../ios";
import { useDesktop } from "../useDesktop";

/** «КОСМЕТИЧКА» + «TEAM» chip — the same wordmark as the customer app, marked as the staff app */
export function TeamMark({ size = 19 }: { size?: number }) {
  return (
    <View style={styles.mark} accessible accessibilityLabel="Косметичка Team">
      <Wordmark size={size} />
      <LinearGradient colors={["#8b3dff", "#b832e0", "#e82c87"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
        <Text style={styles.chipText}>TEAM</Text>
      </LinearGradient>
    </View>
  );
}

/** top of every tab screen: wordmark centred, large title below */
export function TeamHeader({ title, right }: { title?: string; right?: React.ReactNode }) {
  const c = useIOS();
  const desktop = useDesktop();
  return (
    <View>
      {/* computer: the mark is in the side menu */}
      <View style={[styles.top, desktop && { justifyContent: "flex-end", minHeight: right ? 44 : 8 }]}>
        {desktop ? null : <TeamMark />}
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {title ? (
        <Text style={[iosText.largeTitle, styles.title, { color: c.label }]} accessibilityRole="header">
          {title}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: "row", alignItems: "flex-end", alignSelf: "center", gap: 8 },
  chip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 3 },
  chipText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  top: { height: 50, alignItems: "center", justifyContent: "center" },
  right: { position: "absolute", right: 0, top: 3, height: 44, flexDirection: "row", alignItems: "center", gap: 6 },
  title: { marginTop: 4, marginBottom: 14 },
});

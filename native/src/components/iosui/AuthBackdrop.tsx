import { StyleSheet, View } from "react-native";
import { useIOS } from "../../ios";

/** Soft pink blob in the top-right corner (as on the login mockups). */
export function AuthBackdrop() {
  const c = useIOS();
  if (c.blurTint === "dark") return null;
  return (
    <View style={[{ pointerEvents: "none" }, StyleSheet.absoluteFill]}>
      <View style={styles.blob} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute", top: -120, right: -110, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(232,44,135,0.06)" },
});

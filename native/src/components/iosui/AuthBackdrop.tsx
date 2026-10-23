import { StyleSheet, View } from "react-native";
import { useIOS } from "../../ios";

/** Soft pink blob in the top-right corner (as on the login mockups). */
export function AuthBackdrop() {
  const c = useIOS();
  const dark = c.blurTint === "dark";
  return (
    <View style={[{ pointerEvents: "none" }, StyleSheet.absoluteFill]}>
      <View style={[styles.blob, dark && { backgroundColor: "rgba(239,65,154,0.14)" }]} />
      {dark ? <View style={styles.blobViolet} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: "absolute", top: -120, right: -110, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(232,44,135,0.06)" },
  blobViolet: { position: "absolute", bottom: -140, left: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: "rgba(121,37,214,0.16)" },
});

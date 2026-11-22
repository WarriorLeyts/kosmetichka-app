import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useIOS } from "@/ios";

export function ProofPhoto({ uri }: { uri: string }) {
  const c = useIOS();
  const [loading, setLoading] = useState(true), [failed, setFailed] = useState(false);
  useEffect(() => { setLoading(true); setFailed(false); }, [uri]);
  return <View style={StyleSheet.absoluteFill}>
    <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} />
    {loading ? <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color="#8b3dff" /></View> : null}
    {failed ? <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", padding: 4, backgroundColor: c.cellPressed }]}><Text style={{ color: c.secondary, fontSize: 10, textAlign: "center" }}>Фото не загрузилось. Нажмите, чтобы открыть.</Text></View> : null}
  </View>;
}

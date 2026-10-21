import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { fonts } from "../theme";
import { Silk } from "./Silk";
import { LOGO } from "./PageTitle";

const W = Dimensions.get("window").width;

/** Launch screen from the mockup: silk backdrop, logo, serif brand, progress line. */
export function Splash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const logo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logo, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: 0.8, duration: 1400, useNativeDriver: false }).start();
  }, [logo, progress]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      Animated.timing(progress, { toValue: 1, duration: 300, useNativeDriver: false }).start(() =>
        Animated.timing(fade, { toValue: 0, duration: 380, useNativeDriver: true }).start(onFinish)
      );
    }, 700);
    return () => clearTimeout(t);
  }, [ready, fade, progress, onFinish]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#110910" }]} />
      <Silk intensity={1.2} />
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logo,
            transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
            alignItems: "center",
          }}
        >
          <View style={styles.logoGlow}>
            <Image source={LOGO} style={{ width: 120, height: 120 }} contentFit="contain" />
          </View>
          <Text style={styles.brand}>КОСМЕТИЧКА</Text>
          <Text style={styles.tagline}>КОСМЕТИКА • ПАРФЮМЕРИЯ • КРАСОТА</Text>
        </Animated.View>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.bar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.6] }) }]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  logoGlow: {
    borderRadius: 70,
    shadowColor: "#ff1f8e",
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
    marginBottom: 26,
  },
  brand: { fontFamily: fonts.serif, color: "#fff", fontSize: 40, letterSpacing: 2 },
  tagline: { color: "rgba(255,255,255,0.8)", fontSize: 11, letterSpacing: 2, marginTop: 8, fontWeight: "600" },
  track: {
    position: "absolute",
    bottom: 70,
    left: W * 0.2,
    width: W * 0.6,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  bar: { height: 3, borderRadius: 2, backgroundColor: "#ff4fa8" },
});

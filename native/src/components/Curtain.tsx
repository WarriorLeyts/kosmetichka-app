import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/** Deep plum → brand violet → magenta: the curtain in both themes (same tones as the dark home header and buttons). */
export const CURTAIN_GRAD = ["#1E0A33", "#3B0F73", "#7A1BD2", "#B41ACB"] as const;

type Colors = readonly [string, string, ...string[]];

/**
 * Geometry of the curved edge. The shape is a tall rectangle plus a big circle whose lower arc is the
 * edge: the circle centre sits at the left screen edge, so the edge is lowest on the left and rises to the right
 * (as on the reference). No SVG needed — the circle is a View with a huge border radius.
 */
function useShape(bottom: number) {
  const { width: W, height: H } = useWindowDimensions();
  const R = W * 1.2;
  /** how much higher the edge is at the right screen side than at the left */
  const rise = R - Math.sqrt(R * R - W * W);
  const top = bottom - H * 1.8 - 120; // highest point the curtain ever needs to paint
  /** the gradient covers one screen above the edge (what is seen while the curtain covers the screen) */
  const gradTop = bottom - H - rise - 24;
  return { W, H, R, rise, top, bottom, gradTop };
}

/** The curved gradient shape; its lowest edge point (left side) is at `bottom` in its own coordinates. */
function Shape({ bottom, colors = CURTAIN_GRAD, children }: { bottom: number; colors?: Colors; children?: ReactNode }) {
  const s = useShape(bottom);
  const gradH = s.bottom - s.gradTop;
  // (left, top) = where the shape's top-left corner is inside the piece being filled
  const fill = (left: number, top: number) => (
    <>
      <View style={{ position: "absolute", left, top, width: s.W, height: s.gradTop - s.top + 1, backgroundColor: colors[0] }} />
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ position: "absolute", left, top: top + s.gradTop - s.top, width: s.W, height: gradH }}
      />
    </>
  );
  const rectH = s.bottom - s.R - s.top;
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      {/* everything above the circle centre */}
      <View style={{ position: "absolute", left: 0, top: s.top, width: s.W, height: rectH + 1, overflow: "hidden" }}>{fill(0, 0)}</View>
      {/* the arc */}
      <View
        style={{
          position: "absolute",
          left: -s.R,
          top: s.bottom - 2 * s.R,
          width: 2 * s.R,
          height: 2 * s.R,
          borderRadius: s.R,
          overflow: "hidden",
        }}
      >
        {fill(s.R, s.top - (s.bottom - 2 * s.R))}
      </View>
      {children}
    </View>
  );
}

/**
 * Translation of the curtain for a progress value: 0 = covers the whole screen, 1 = rests as a header
 * whose lowest edge point is at `rest`, 2 = gone above the screen.
 */
export function useCurtainRange(rest: number) {
  const s = useShape(rest);
  const cover = s.H + s.rise + 24 - rest; // even the high right side is below the screen bottom
  const gone = -rest - 24;
  return { inputRange: [0, 1, 2], outputRange: [cover, 0, gone] };
}

/**
 * Full-screen animated curtain. `progress` 0 → 1 lifts it into the header, 1 → 0 drops it back over the screen,
 * → 2 lifts it away. `children` are drawn at screen coordinates (they don't move); `riding` is laid out at screen coordinates while the curtain covers the screen and then moves with it.
 */
export function Curtain({
  progress, rest, colors, riding, children,
}: { progress: Animated.Value; rest: number; colors?: Colors; riding?: ReactNode; children?: ReactNode }) {
  const range = useCurtainRange(rest);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: progress.interpolate(range) }] }]}>
        <Shape bottom={rest} colors={colors} />
        {riding ? <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: -range.outputRange[0] }] }]}>{riding}</View> : null}
      </Animated.View>
      {children}
    </View>
  );
}

/** The curtain at rest: a static header at the top of a scroll view (the overlay hands over to it). */
export function CurtainHeader({ rest, children }: { rest: number; children?: ReactNode }) {
  return (
    <View style={{ height: rest, overflow: "hidden" }}>
      <Shape bottom={rest} />
      {children}
    </View>
  );
}

/** Easing of the lift: quick start, long soft landing (like the reference). */
export const curtainEase = Easing.bezier(0.65, 0, 0.2, 1);

/** Three bouncing dots (loader inside the shrunken button). */
export function Dots({ color = "#fff" }: { color?: string }) {
  const v = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(
        140,
        v.map((d) =>
          Animated.sequence([
            Animated.timing(d, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(d, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ])
        )
      )
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View style={styles.dots}>
      {v.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
              transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 6, alignItems: "center", height: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});

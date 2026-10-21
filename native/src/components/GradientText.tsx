import { Text, TextStyle } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Text filled with a gradient — the site's `bg-gradient-to-r ... bg-clip-text text-transparent`.
 * Default colors: from-pink-500 via-purple-500 to-blue-700.
 */
export function GradientText({
  children,
  style,
  colors = ["#ec4899", "#a855f7", "#1d4ed8"],
}: {
  children: string | number;
  style?: TextStyle | TextStyle[];
  colors?: readonly [string, string, ...string[]];
}) {
  return (
    <MaskedView style={{ alignSelf: "flex-start" }} maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={[style as TextStyle, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

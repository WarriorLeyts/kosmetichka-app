import { Text, TextStyle, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { gradient, gradientEnd, gradientStart } from "../theme";

/** Text filled with the brand gradient — like the site's `.accent-price` / active price. */
export function GradientText({ children, style }: { children: string; style?: TextStyle }) {
  return (
    <MaskedView maskElement={<Text style={[style, { backgroundColor: "transparent" }]}>{children}</Text>}>
      <LinearGradient colors={gradient} start={gradientStart} end={gradientEnd}>
        <View>
          <Text style={[style, { opacity: 0 }]}>{children}</Text>
        </View>
      </LinearGradient>
    </MaskedView>
  );
}

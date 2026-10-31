import { useEffect, useState } from "react";
import { View, type ImageStyle, type StyleProp } from "react-native";
import { Image, type ImageProps } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

/**
 * A product photo that shows the «no photo» icon when the file can't be loaded (deleted on the
 * server, broken link) — instead of an empty white square.
 */
export function SafeImage({
  uri, style, iconSize = 34, iconColor = "#C7C7CC", ...rest
}: Omit<ImageProps, "source" | "style"> & { uri: string; style?: StyleProp<ImageStyle>; iconSize?: number; iconColor?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (failed) {
    return (
      <View style={[style as object, { alignItems: "center", justifyContent: "center" }]} accessibilityLabel="Фото не загрузилось">
        <Ionicons name="image-outline" size={iconSize} color={iconColor} />
      </View>
    );
  }
  return <Image {...rest} source={{ uri }} style={style} onError={() => setFailed(true)} />;
}

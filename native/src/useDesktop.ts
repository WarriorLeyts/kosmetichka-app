import { Platform, useWindowDimensions } from "react-native";

/** Website on a computer (wide browser window): top menu instead of the bottom tab bar, wider layouts. */
export const DESKTOP_MIN_WIDTH = 1024;
export const DESKTOP_MAX_CONTENT = 1240;

export function useDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
}

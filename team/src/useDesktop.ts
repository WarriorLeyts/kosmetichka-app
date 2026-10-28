import { Platform, useWindowDimensions } from "react-native";

/** Admin site on a computer (wide browser window): side menu instead of the bottom tab bar, wide lists. */
export const DESKTOP_MIN_WIDTH = 1024;
export function useDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_MIN_WIDTH;
}

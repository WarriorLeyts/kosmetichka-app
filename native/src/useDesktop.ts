import { Platform, useWindowDimensions } from "react-native";
import { webPageScale } from "./webScale";

/** Website on a computer (wide browser window): top menu instead of the bottom tab bar, wider layouts. */
export const DESKTOP_MIN_WIDTH = 1024;
export const DESKTOP_MAX_CONTENT = 1240;
/** home and catalog (categories on the left + 5 goods in a row) and the top menu above them */
export const DESKTOP_WIDE = 1400;

export function useDesktop(): boolean {
  const { width } = useWindowDimensions();
  // a scaled-down phone page (wider layout) counts by the screen's own width, so a phone on its side stays a phone
  return Platform.OS === "web" && width * webPageScale() >= DESKTOP_MIN_WIDTH;
}

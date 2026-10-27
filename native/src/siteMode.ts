import { Platform } from "react-native";

/**
 * The website (this app built for the browser) is for wholesale customers only for now:
 * registration «Опт» / «Крупный опт», no switch to retail, no MAXMA card or bonuses.
 * The phone apps keep everything. Mirrors SITE_RETAIL_ENABLED on the site.
 */
export const RETAIL_ENABLED = Platform.OS !== "web";

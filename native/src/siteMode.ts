import { Platform } from "react-native";

/**
 * The website (this app built for the browser) is for wholesale customers only for now:
 * registration «Опт» / «Крупный опт», no switch to retail, no MAXMA card or bonuses.
 * The phone apps keep everything. Mirrors SITE_RETAIL_ENABLED on the site.
 */
export const RETAIL_ENABLED = Platform.OS !== "web";

/**
 * A retail customer («Розница») with a linked MAXMA card sees and pays the discount price («Скидка по
 * карте») — first on the website, now in the phone apps too. Mirrors SITE_RETAIL_DISCOUNT / APPS_TOO
 * on the site.
 */
export const SITE_RETAIL_DISCOUNT = true;

/** Linked retail bonus and discount cards may accrue and spend bonuses in the cart. */
export const BONUS_SPEND = true;

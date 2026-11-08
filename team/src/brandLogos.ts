import { BASE_URL } from "./api";

/**
 * Logos of the brands (kept in the customer app: native/public/brands — the website serves them at /brands/…), by the brand's name
 * as it comes from 1C: compared without case, spaces and punctuation. A brand not here has no logo.
 */
const LOGOS: Record<string, string> = {
  viviennesabo: "vivienne-sabo",
  zebo: "zebo",
  shik: "shik",
  conte: "conte",
  fabrikcosmetology: "fabrik",
  fabrik: "fabrik",
  shaik: "shaik",
  artvisage: "art-visage",
  stellary: "stellary",
  influence: "influence-beauty",
  influencebeauty: "influence-beauty",
  mixit: "mixit",
  kamali: "kamali",
  lattafa: "lattafa",
  dolcemilk: "dolce-milk",
  compliment: "compliment",
  boutiquedesavon: "boutique-de-savon",
  eveline: "eveline",
  evelinecosmetics: "eveline",
  zielinskirozen: "zielinski-rozen",
  luxvisage: "luxvisage",
  estel: "estel",
  estelprofessional: "estel",
  ollin: "ollin",
  ollinprofessional: "ollin",
};

const key = (name: string) => name.toLowerCase().replace(/ó/g, "o").replace(/[^a-z0-9а-яё]/g, "");

/** the logo picture of a brand, or null */
export function brandLogo(name: string | null | undefined): string | null {
  if (!name) return null;
  const file = LOGOS[key(name)];
  return file ? `${BASE_URL}/brands/${file}.png` : null;
}

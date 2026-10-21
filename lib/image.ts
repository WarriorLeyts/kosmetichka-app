// Returns the correct image URL (always absolute in the app — images live on the site server).
import { imageUrl } from "./api";

export function resolveImageUrl(path: string | null | undefined): string | null {
  return imageUrl(path);
}

/**
 * Build-time switches for debugging a published Expo Go version (EXPO_PUBLIC_DISABLE="blur,mask,fit").
 * Empty in normal builds — nothing is disabled.
 */
const list: string[] = String(process.env.EXPO_PUBLIC_DISABLE ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
export const disabled = (name: string) => list.includes(name);

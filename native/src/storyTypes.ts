export type Story = {
  id: string; title: string; kind: "img" | "video"; mediaUrl: string; coverUrl: string;
  link: string; linkLabel: string; published: boolean; expiresAt: string | null;
  position: number; updatedAt: string;
};
/** Story media is always an upload on our site. Never load a link supplied as video HTML. */
export function storyMediaUrl(path: string) {
  return /^\/api\/stories\/media\/story-[a-f0-9]{32}(?:-thumb)?\.(webp|mp4|mov|webm)$/.test(path) ? `https://kosmetichka-opt.ru${path}` : null;
}
export function storyDestination(value: string): string | null {
  if (!value || value.startsWith("//") || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://kosmetichka-opt.ru");
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.hostname === "kosmetichka-opt.ru" || url.hostname === "www.kosmetichka-opt.ru") {
      return /^\/(?:catalog\/?|product\/\d+\/?|info\/?)$/.test(url.pathname) ? url.pathname + url.search : url.href;
    }
    return url.href;
  } catch { return null; }
}

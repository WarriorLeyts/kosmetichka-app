export type Story = {
  id: string; title: string; kind: "img" | "video"; mediaUrl: string; coverUrl: string;
  link: string; linkLabel: string; published: boolean; expiresAt: string | null;
  position: number; updatedAt: string;
};
export type StoryContent = Omit<Story, "id" | "updatedAt">;
export function storyMediaUrl(path: string) {
  return /^\/api\/stories\/media\/story-[a-f0-9]{32}(?:-thumb)?\.(webp|mp4|mov|webm)$/.test(path) ? `https://kosmetichka-opt.ru${path}` : null;
}
export function storyLink(value: string) {
  if (!value) return true;
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (/^\/(?:catalog(?:\/?\?|\/?$)|product\/\d+\/?(?:\?|$)|info\/?$)/.test(value)) return true;
  try { const u = new URL(value); return u.protocol === "https:" && !!u.hostname && !u.username && !u.password; } catch { return false; }
}
export function storyState(s: Story, now = Date.now()) { return !s.published ? "Черновик" : s.expiresAt && Date.parse(s.expiresAt) <= now ? "Завершена" : "Опубликована"; }

import { afterEach, expect, it, vi } from "vitest";
import { api } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("turns a proxy HTML page with HTTP 200 into a retryable error instead of returning null to screens", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>gateway page</html>", { status: 200 })));
  await expect(api.catalog({})).rejects.toMatchObject({ status: 502, message: expect.stringContaining("некорректный ответ") });
});
it("accepts real catalog JSON after a transient proxy failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("<html>bad</html>")).mockResolvedValueOnce(new Response(JSON.stringify({ products: [], total: 0, page: 1, hasMore: false }))));
  await expect(api.catalog({})).rejects.toMatchObject({ status: 502 });
  await expect(api.catalog({})).resolves.toMatchObject({ products: [], total: 0 });
});
it("keeps readable server validation errors", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "Неверный пароль" }), { status: 400 })));
  await expect(api.deleteAccount("wrong")).rejects.toMatchObject({ status: 400, message: "Неверный пароль" });
});

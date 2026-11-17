import { useWaitlistStore } from "./store/waitlist";
import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ wishlist: vi.fn(), wishlistToggle: vi.fn(), wishlistRemove: vi.fn() }));
vi.mock("./api", () => ({ api }));
beforeEach(() => { vi.resetAllMocks(); useWaitlistStore.getState().reset(); });
it("uses the shared subscription state for catalog and detail: add, then remove", async () => {
  api.wishlistToggle.mockResolvedValueOnce({ added: true }).mockResolvedValueOnce({ added: false });
  await useWaitlistStore.getState().toggle(12);
  expect(useWaitlistStore.getState().ids).toEqual([12]);
  await useWaitlistStore.getState().toggle(12);
  expect(useWaitlistStore.getState().ids).toEqual([]);
});
it("does not show a successful subscription when the API fails", async () => {
  api.wishlistToggle.mockRejectedValue(new Error("offline"));
  await expect(useWaitlistStore.getState().toggle(12)).rejects.toThrow("offline");
  expect(useWaitlistStore.getState().ids).toEqual([]);
});
it("drops a subscription result that arrives after logout", async () => {
  let resolve!: (v: { added: boolean }) => void;
  api.wishlistToggle.mockReturnValue(new Promise((r) => { resolve = r; }));
  const pending = useWaitlistStore.getState().toggle(12);
  useWaitlistStore.getState().reset();
  resolve({ added: true });
  await pending;
  expect(useWaitlistStore.getState().ids).toEqual([]);
});
it("does not remove a new account's local subscription when an old account's request finishes", async () => {
  let resolve!: () => void;
  api.wishlistRemove.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
  const pending = useWaitlistStore.getState().remove(12);
  useWaitlistStore.getState().reset();
  useWaitlistStore.setState({ ids: [12] });
  resolve();
  await pending;
  expect(useWaitlistStore.getState().ids).toEqual([12]);
});

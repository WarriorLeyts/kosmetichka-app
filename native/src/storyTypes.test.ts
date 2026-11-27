import { describe, expect, it } from "vitest";
import { storyDestination, storyMediaUrl } from "./storyTypes";
describe("story navigation", () => {
  it("opens own product and promotion inside the app", () => {
    expect(storyDestination("https://kosmetichka-opt.ru/product/123")).toBe("/product/123");
    expect(storyDestination("/catalog?quick=promo")).toBe("/catalog?quick=promo");
    expect(storyDestination("https://t.me/shop")).toBe("https://t.me/shop");
  });
  it("does not embed arbitrary URLs in video HTML", () => {
    expect(storyMediaUrl('/api/stories/media/abc.mp4" onerror="alert(1)')).toBeNull();
    expect(storyMediaUrl("https://other.test/video.mp4")).toBeNull();
    expect(storyMediaUrl(`/api/stories/media/story-${"a".repeat(32)}.mp4`)).toBe("https://kosmetichka-opt.ru/api/stories/media/story-" + "a".repeat(32) + ".mp4");
  });
  it("rejects script, http and credential-bearing links", () => {
    for (const link of ["javascript:alert(1)", "http://test.test", "https://user@site.test", "https://a.test\\@b.test"]) expect(storyDestination(link)).toBeNull();
  });
});

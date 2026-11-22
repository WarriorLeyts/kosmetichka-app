import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const configure = require("../app.config.js");
const original = require("../app.json").expo;
afterEach(() => vi.unstubAllEnvs());
describe("iPhone distribution profiles", () => {
  it("keeps the existing sideload signing and OTA behavior", () => {
    vi.stubEnv("IOS_DISTRIBUTION", "sideload");
    const c = configure({ config: original });
    expect(c.plugins).toContain("./plugins/withNoPushEntitlementIOS");
    expect(c.runtimeVersion).toBe("6");
    expect(c.extra.iosPushEnabled).toBe(false);
    expect(c.updates.enabled).not.toBe(false);
  });
  it("enables APNs only in official store builds and isolates their runtime", () => {
    vi.stubEnv("IOS_DISTRIBUTION", "app-store");
    const c = configure({ config: original });
    expect(c.plugins).not.toContain("./plugins/withNoPushEntitlementIOS");
    expect(c.ios.entitlements["aps-environment"]).toBe("production");
    expect(c.extra.iosPushEnabled).toBe(true);
    expect(c.extra.eas.projectId).toBe(original.extra.eas.projectId);
    expect(c.runtimeVersion).toBe("6-app-store");
    expect(c.updates.enabled).toBe(false);
  });
  it("rejects misspelled distribution profiles instead of silently creating a wrong build", () => {
    vi.stubEnv("IOS_DISTRIBUTION", "appstore");
    expect(() => configure({ config: original })).toThrow("IOS_DISTRIBUTION");
  });
});

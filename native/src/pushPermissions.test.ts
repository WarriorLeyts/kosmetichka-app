import { registerPush } from "./push";
import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  platform: { OS: "ios" }, config: { extra: { iosPushEnabled: false, eas: { projectId: "project" } } },
  notifications: { setNotificationHandler: vi.fn(), getPermissionsAsync: vi.fn(), requestPermissionsAsync: vi.fn(), getExpoPushTokenAsync: vi.fn() },
  save: vi.fn(async () => ({})),
}));
vi.mock("react-native", () => ({ Platform: mock.platform, Alert: { alert: vi.fn() } }));
vi.mock("expo-constants", () => ({ default: { expoConfig: mock.config } }));
vi.mock("expo-notifications", () => mock.notifications);
vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: async () => "1", setItem: vi.fn(), multiRemove: vi.fn() } }));
vi.mock("./api", () => ({ api: { pushTokenSave: mock.save } }));
vi.mock("./store/notifications", () => ({ useNotifications: { getState: () => ({ refresh: vi.fn(), bump: vi.fn() }) } }));
beforeEach(() => { vi.clearAllMocks(); mock.config.extra.iosPushEnabled = false; });
it("does not ask for APNs permissions in the existing sideload app", async () => {
  await registerPush();
  expect(mock.notifications.getPermissionsAsync).not.toHaveBeenCalled();
});
it("leaves the App Store app working when the user denies notifications", async () => {
  mock.config.extra.iosPushEnabled = true;
  mock.notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
  mock.notifications.requestPermissionsAsync.mockResolvedValue({ granted: false });
  await registerPush();
  expect(mock.notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(mock.save).not.toHaveBeenCalled();
});
it("registers an iOS token after permission is granted in the official store build", async () => {
  mock.config.extra.iosPushEnabled = true;
  mock.notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
  mock.notifications.getExpoPushTokenAsync.mockResolvedValue({ data: "ExpoPushToken[allowed]" });
  await registerPush();
  expect(mock.save).toHaveBeenCalledWith("ExpoPushToken[allowed]", "ios");
});

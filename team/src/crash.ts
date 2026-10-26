import { Platform } from "react-native";
import Constants from "expo-constants";
import { BASE_URL } from "./api";

/**
 * Crash / error reports → POST /api/app-errors (shown on the site in «Ошибки приложений»).
 * JS errors only (a native crash kills the app before JS can send anything). Never throws,
 * at most 10 reports per launch, the same error once.
 */
let screen = "";
let sent = 0;
const seen = new Set<string>();

export function setCrashScreen(path: string) {
  screen = path;
}

export function reportError(error: unknown, fatal = false) {
  try {
    const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error));
    // no network / server said no — normal life of a phone app, not a bug
    if (!fatal && (e.name === "ApiError" || /Network request failed|Aborted|timed? ?out/i.test(e.message))) return;
    const key = e.message + "|" + (e.stack ?? "").slice(0, 200);
    if (seen.has(key) || sent >= 10) return;
    seen.add(key);
    sent++;
    const cfg = Constants.expoConfig;
    fetch(BASE_URL + "/api/app-errors", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: "team",
        platform: Platform.OS,
        version: [cfg?.version, typeof cfg?.runtimeVersion === "string" ? "rt" + cfg.runtimeVersion : null].filter(Boolean).join(" "),
        message: e.message,
        stack: e.stack,
        screen,
        fatal,
      }),
    }).catch(() => {});
  } catch {
    /* reporting must never break the app */
  }
}

type Handler = (e: unknown, fatal?: boolean) => void;
let installed = false;

/** Global handler for uncaught errors and unhandled promise rejections (once per launch). */
export function installCrashReporter() {
  if (installed || __DEV__) return;
  installed = true;
  const g = globalThis as unknown as {
    ErrorUtils?: { getGlobalHandler: () => Handler; setGlobalHandler: (h: Handler) => void };
    HermesInternal?: { enablePromiseRejectionTracker?: (o: { allRejections: boolean; onUnhandled: (id: number, r: unknown) => void }) => void };
  };
  const prev = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((e, fatal) => {
    reportError(e, !!fatal);
    prev?.(e, fatal);
  });
  g.HermesInternal?.enablePromiseRejectionTracker?.({
    allRejections: true,
    onUnhandled: (_id, reason) => reportError(reason, false),
  });
}

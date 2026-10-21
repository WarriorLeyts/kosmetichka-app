"use client";

/**
 * Runs before any page renders in the app:
 *  - points relative API calls at the live server (see lib/api.ts)
 *  - fixes deep links: the phone's local web server falls back to the root
 *    index.html for unknown paths, so if we booted the home page under another
 *    URL, hand the URL to the client router.
 *  - native touches: status bar, splash, Android back button.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { installRemoteFetch } from "@/lib/api";
import "@/lib/bootPath";

installRemoteFetch();

export function AppBootstrap() {
  const router = useRouter();

  useEffect(() => {
    let removeBack: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { SplashScreen } = await import("@capacitor/splash-screen");
        SplashScreen.hide().catch(() => {});

        const { StatusBar, Style } = await import("@capacitor/status-bar");
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});

        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) window.history.back();
          else App.exitApp();
        });
        removeBack = () => handle.remove();
      } catch {
        /* running in a normal browser */
      }
    })();

    return () => removeBack?.();
  }, [router]);

  return null;
}

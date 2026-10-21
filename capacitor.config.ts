import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.kosmetichkaopt.app",
  appName: "Косметичка",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    // Native HTTP: requests to kosmetichka-opt.ru go through iOS/Android networking,
    // so the site's login cookie works and the server needs no CORS changes.
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "LIGHT",
    },
  },
  ios: {
    contentInset: "never",
  },
};

export default config;

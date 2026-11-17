// app.json is the config; this only adds Firebase (push on Android) once google-services.json
// is in the folder — without the file the build still works, just without push.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const hasFirebase = fs.existsSync(path.join(__dirname, "google-services.json"));
  // website build (npx expo export -p web): one-page app; WEB_BASE_URL=/new serves it under a path
  const baseUrl = process.env.WEB_BASE_URL || "";
  const distribution = process.env.IOS_DISTRIBUTION || "sideload";
  if (!["sideload", "app-store"].includes(distribution)) throw new Error("IOS_DISTRIBUTION must be sideload or app-store");
  const appStore = distribution === "app-store";
  return {
    ...config,
    // Store builds use Apple's reviewed updates; sideload builds retain compatible Expo updates.
    ...(appStore ? {
      plugins: (config.plugins || []).filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== "./plugins/withNoPushEntitlementIOS"),
      runtimeVersion: `${config.runtimeVersion}-app-store`,
      updates: { ...config.updates, enabled: false },
      ios: { ...config.ios, entitlements: { ...config.ios?.entitlements, "aps-environment": "production" } },
    } : {}),
    extra: { ...config.extra, iosPushEnabled: appStore },
    android: { ...config.android, ...(hasFirebase ? { googleServicesFile: "./google-services.json" } : {}) },
    web: { ...(config.web || {}), output: "single", bundler: "metro", favicon: "./assets/icon.png", name: "Косметичка", lang: "ru" },
    experiments: { ...(config.experiments || {}), ...(baseUrl ? { baseUrl } : {}) },
  };
};

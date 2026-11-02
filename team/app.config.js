// app.json is the config; this adds the browser build (npx expo export -p web): a one-page app;
// WEB_BASE_URL=/admin serves it under a path (the admin site). Firebase (push on Android) is added
// once google-services.json is in the folder — without it the build works, just without push.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const baseUrl = process.env.WEB_BASE_URL || "";
  const hasFirebase = fs.existsSync(path.join(__dirname, "google-services.json"));
  return {
    ...config,
    android: { ...config.android, ...(hasFirebase ? { googleServicesFile: "./google-services.json" } : {}) },
    web: { ...(config.web || {}), output: "single", bundler: "metro", favicon: "./assets/icon.png", name: "Косметичка Team", lang: "ru" },
    experiments: { ...(config.experiments || {}), ...(baseUrl ? { baseUrl } : {}) },
  };
};

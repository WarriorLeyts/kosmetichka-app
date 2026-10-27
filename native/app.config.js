// app.json is the config; this only adds Firebase (push on Android) once google-services.json
// is in the folder — without the file the build still works, just without push.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const hasFirebase = fs.existsSync(path.join(__dirname, "google-services.json"));
  // website build (npx expo export -p web): one-page app; WEB_BASE_URL=/new serves it under a path
  const baseUrl = process.env.WEB_BASE_URL || "";
  return {
    ...config,
    android: { ...config.android, ...(hasFirebase ? { googleServicesFile: "./google-services.json" } : {}) },
    web: { ...(config.web || {}), output: "single", bundler: "metro", favicon: "./assets/icon.png", name: "Косметичка", lang: "ru" },
    experiments: { ...(config.experiments || {}), ...(baseUrl ? { baseUrl } : {}) },
  };
};

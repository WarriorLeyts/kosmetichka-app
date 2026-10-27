// app.json is the config; this only adds Firebase (push on Android) once google-services.json
// is in the folder — without the file the build still works, just without push.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const hasFirebase = fs.existsSync(path.join(__dirname, "google-services.json"));
  return {
    ...config,
    android: { ...config.android, ...(hasFirebase ? { googleServicesFile: "./google-services.json" } : {}) },
  };
};

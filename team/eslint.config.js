// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "android/*", "ios/*", "web-build/*", "plugins/*"],
  },
  // config files run in Node (CommonJS)
  {
    files: ["app.config.js", "eslint.config.js", "metro.config.js", "babel.config.js"],
    languageOptions: { globals: { __dirname: "readonly", require: "readonly", module: "writable", process: "readonly" } },
  },
]);

/**
 * Pins every native dependency to the exact version range Expo SDK expects
 * (from expo/bundledNativeModules.json), then the caller runs `npm install` again.
 * Keeps CI reproducible without `expo install` rewriting node_modules mid-run.
 */
const fs = require("fs");
const path = require("path");

const WANT = [
  "@expo/vector-icons", "@react-native-async-storage/async-storage", "expo-build-properties", "expo-camera",
  "expo-constants", "expo-haptics", "expo-image", "expo-linear-gradient", "expo-linking", "expo-router",
  "expo-splash-screen", "expo-status-bar", "expo-web-browser", "react", "react-native",
  "react-native-safe-area-context", "react-native-screens", "react-native-webview",
];
const DEV = ["typescript", "@types/react"];

const bundled = require(path.join(process.cwd(), "node_modules/expo/bundledNativeModules.json"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const missing = [];
for (const name of WANT) {
  if (!bundled[name]) missing.push(name);
  else pkg.dependencies[name] = bundled[name];
}
pkg.devDependencies = pkg.devDependencies || {};
const DEV_DEFAULTS = { typescript: "~5.9.2", "@types/react": "~19.1.10" };
for (const name of DEV) pkg.devDependencies[name] = bundled[name] || DEV_DEFAULTS[name];
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log("pinned:", WANT.length - missing.length, "missing from SDK list:", missing.join(", ") || "none");

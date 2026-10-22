/**
 * Adds attachBaseContext overrides to MainApplication and MainActivity so the
 * app-wide interface size (modules/ui-scale) is applied to every screen.
 */
const { withMainActivity, withMainApplication } = require("expo/config-plugins");

function inject(src, classRegex, marker) {
  if (src.includes("UiScale.wrap")) return src;
  const m = src.match(classRegex);
  if (!m) throw new Error(`withUiScale: ${marker} class not found`);
  const at = m.index + m[0].length;
  const code =
    "\n  override fun attachBaseContext(base: android.content.Context) {\n" +
    "    super.attachBaseContext(expo.modules.uiscale.UiScale.wrap(base))\n" +
    "  }\n";
  return src.slice(0, at) + code + src.slice(at);
}

module.exports = function withUiScale(config) {
  config = withMainApplication(config, (c) => {
    c.modResults.contents = inject(c.modResults.contents, /class MainApplication[^{]*\{/, "MainApplication");
    return c;
  });
  config = withMainActivity(config, (c) => {
    c.modResults.contents = inject(c.modResults.contents, /class MainActivity[^{]*\{/, "MainActivity");
    return c;
  });
  return config;
};

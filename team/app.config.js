// app.json is the config; this adds the browser build (npx expo export -p web): a one-page app;
// WEB_BASE_URL=/team-web serves it under a path (the admin site preview).
module.exports = ({ config }) => {
  const baseUrl = process.env.WEB_BASE_URL || "";
  return {
    ...config,
    web: { ...(config.web || {}), output: "single", bundler: "metro", favicon: "./assets/icon.png", name: "Косметичка Team", lang: "ru" },
    experiments: { ...(config.experiments || {}), ...(baseUrl ? { baseUrl } : {}) },
  };
};

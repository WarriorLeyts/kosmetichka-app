// babel-preset-expo as before + `import.meta` polyfill: zustand's ESM build reads import.meta.env,
// which breaks the website build («Cannot use 'import.meta' outside a module»).
module.exports = function (api) {
  api.cache(true);
  return { presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]] };
};

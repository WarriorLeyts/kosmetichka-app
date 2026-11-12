// Pure logic under test imports `Platform` only (src/siteMode.ts): the phone app's behaviour
export const Platform = { OS: "ios", select: (o: Record<string, unknown>) => o.ios ?? o.default };

// Captured before React hydrates (Next may normalise the URL afterwards).
let initial: string | null =
  typeof window !== "undefined" ? window.location.pathname + window.location.search : null;

/** Path the app was opened on, if it isn't the home page; otherwise null. Returns it only once. */
export function bootPath(): string | null {
  const value = initial;
  initial = null;
  if (!value) return null;
  const path = value.split("?")[0];
  if (path === "/" || path === "" || path === "/index.html") return null;
  return value;
}

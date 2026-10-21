import type { NextConfig } from "next";

// The app is a static bundle that ships inside the iOS/Android app (Capacitor).
// All data comes from the live site's API — see lib/api.ts.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;

import path from "path";
import { defineConfig } from "vitest/config";

// Unit tests for the app's pure logic (prices, formatting): no React Native runtime needed
export default defineConfig({
  resolve: { alias: { "react-native": path.resolve(__dirname, "test/react-native.stub.ts") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});

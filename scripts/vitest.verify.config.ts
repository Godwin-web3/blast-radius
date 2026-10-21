import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "..") } },
  test: { include: ["scripts/**/*.test.ts"], root: path.resolve(__dirname, "..") },
});

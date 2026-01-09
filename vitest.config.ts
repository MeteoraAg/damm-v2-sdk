import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    isolate: false,
    fileParallelism: false,
    testTimeout: 1000000,
    hookTimeout: 1000000,
    include: ["tests/**/*.test.ts"],
    globals: true,
    sequence: {
      concurrent: false,
    },
  },
});

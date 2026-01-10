import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    isolate: false,
    fileParallelism: false,
    maxConcurrency: 1,
    testTimeout: 1000000,
    hookTimeout: 1000000,
    include: ["tests/**/*.test.ts"],
    globals: true,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
  },
});

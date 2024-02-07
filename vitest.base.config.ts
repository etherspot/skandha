import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxConcurrency: 1,
    threads: false,
    reporters: ["default", "hanging-process"],
    coverage: {
      clean: true,
      all: false,
      extension: [".ts"],
      provider: "v8",
      reporter: [["lcovonly", { file: "lcov.info" }], ["text"]],
      reportsDirectory: "./coverage",
      exclude: [
        "**/*.d.ts",
        "**/*.js",
        "**/lib/**",
        "**/coverage/**",
        "**/scripts/**",
        "**/test/**",
        "**/types/**",
        "**/bin/**",
        "**/node_modules/**",
      ],
    },
  },
});

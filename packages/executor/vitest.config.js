import { mergeConfig, defineConfig } from "vitest/config";
import vitestConfig from "../../vitest.base.config";

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      setupFiles: "./test/vitestSetup.ts",
    }
  })
);

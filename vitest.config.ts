import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import { configDefaults, defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, "spec/*"],
      root: fileURLToPath(new URL("./", import.meta.url)),
      browser: { enabled: true, name: "chrome" },
    },
  })
);

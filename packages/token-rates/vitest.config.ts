import path from "node:path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "@talismn/chaindata-provider": path.join(packagesDir, "chaindata-provider/src"),
      "@talismn/util": path.join(packagesDir, "util/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
})

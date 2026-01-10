import path from "path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "@talismn/chaindata-provider": path.join(packagesDir, "chaindata-provider/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
})

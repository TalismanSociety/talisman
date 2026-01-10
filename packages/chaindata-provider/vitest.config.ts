import path from "path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "@talismn/util": path.join(packagesDir, "util/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
})

import path from "node:path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(import.meta.dirname, "..")

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

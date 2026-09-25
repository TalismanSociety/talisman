import path from "node:path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(import.meta.dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "@talismn/crypto": path.join(packagesDir, "crypto/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
})

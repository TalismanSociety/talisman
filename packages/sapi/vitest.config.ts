import path from "path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "@talismn/scale": path.join(packagesDir, "scale/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
})

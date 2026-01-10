import path from "path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    alias: {
      "@talismn/(.+)": path.join(packagesDir, "$1/src"),
    },
  },
})

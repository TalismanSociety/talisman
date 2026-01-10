import path from "path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "@talismn/balances": path.join(packagesDir, "balances/src"),
      "@talismn/chain-connectors": path.join(packagesDir, "chain-connectors/src"),
      "@talismn/chaindata-provider": path.join(packagesDir, "chaindata-provider/src"),
      "@talismn/connection-meta": path.join(packagesDir, "connection-meta/src"),
      "@talismn/scale": path.join(packagesDir, "scale/src"),
      "@talismn/token-rates": path.join(packagesDir, "token-rates/src"),
      "@talismn/util": path.join(packagesDir, "util/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
})

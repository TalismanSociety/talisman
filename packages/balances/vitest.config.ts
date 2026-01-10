import path from "path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "@talismn/chain-connectors": path.join(packagesDir, "chain-connectors/src"),
      "@talismn/chaindata-provider": path.join(packagesDir, "chaindata-provider/src"),
      "@talismn/crypto": path.join(packagesDir, "crypto/src"),
      "@talismn/sapi": path.join(packagesDir, "sapi/src"),
      "@talismn/scale": path.join(packagesDir, "scale/src"),
      "@talismn/solana": path.join(packagesDir, "solana/src"),
      "@talismn/token-rates": path.join(packagesDir, "token-rates/src"),
      "@talismn/util": path.join(packagesDir, "util/src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
})

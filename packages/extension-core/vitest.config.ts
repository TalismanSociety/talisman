import path from "path"

import { defineConfig } from "vitest/config"

const packagesDir = path.resolve(__dirname, "..")

export default defineConfig({
  resolve: {
    alias: {
      "rxjs/internal/": "rxjs/dist/cjs/internal/",
      // Map workspace package internal paths to source (must be before the main pattern)
      "@talismn/chaindata-provider/src/": path.join(packagesDir, "chaindata-provider/src/"),
      "@talismn/chaindata-provider": path.join(packagesDir, "chaindata-provider/src"),
      "@talismn/balances/src/": path.join(packagesDir, "balances/src/"),
      "@talismn/balances": path.join(packagesDir, "balances/src"),
      "@talismn/crypto": path.join(packagesDir, "crypto/src"),
      "@talismn/util": path.join(packagesDir, "util/src"),
      "@talismn/keyring": path.join(packagesDir, "keyring/src"),
      "@talismn/sapi": path.join(packagesDir, "sapi/src"),
      "@talismn/scale": path.join(packagesDir, "scale/src"),
      "@talismn/connection-meta": path.join(packagesDir, "connection-meta/src"),
      "@talismn/chain-connectors": path.join(packagesDir, "chain-connectors/src"),
      "@talismn/solana": path.join(packagesDir, "solana/src"),
      "@talismn/token-rates": path.join(packagesDir, "token-rates/src"),
      "@talismn/on-chain-id": path.join(packagesDir, "on-chain-id/src"),
      "@talismn/orb": path.join(packagesDir, "orb/src"),
    },
  },
  test: {
    environment: "./tests/vitest-env-jsdom.ts",
    globals: true,
    testTimeout: 20_000,
    setupFiles: ["fake-indexeddb/auto", "./tests/setup.ts", "./tests/mocks/index.ts"],
  },
})

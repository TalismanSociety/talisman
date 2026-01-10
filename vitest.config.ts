import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      // Utility packages (node environment)
      "packages/util",
      "packages/scale",
      "packages/on-chain-id",
      "packages/token-rates",
      "packages/connection-meta",
      "packages/sapi",
      "packages/solana",
      "packages/icons",

      // Crypto packages (node environment)
      "packages/crypto",
      "packages/keyring",

      // Chain packages
      "packages/chain-connectors",
      "packages/chaindata-provider",
      "packages/balances",
      "packages/balances-react",

      // Extension packages (jsdom environment with custom setup)
      "packages/extension-core",

      // Extension app (jsdom environment with custom setup)
      "apps/extension",
    ],
  },
})

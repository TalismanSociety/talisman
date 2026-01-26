import { webcrypto } from "node:crypto"

import { log } from "extension-shared"

import { setupModuleSol } from "./common/setupModuleSol"
import { testSubscribeBalancesSol } from "./common/testSubscribeBalancesSol"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "solana-mainnet",
  rpcs: ["https://api.mainnet-beta.solana.com"],
  nativeCurrency: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
  },
  tokens: {},
}

setupModuleSol(NETWORK_CONFIG, "sol-native")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test (sol-native)...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what "normal" event loop delay looks like
    await testSubscribeBalancesSol(NETWORK_CONFIG, setup.tokens, {
      module: "sol-native",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalancesSol(NETWORK_CONFIG, setup.tokens, {
      module: "sol-native",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
    })

    log.log("Thread blocking test completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error:", error)
    process.exit(1)
  })

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
  tokens: {
    "sol-spl": [
      {
        mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      },
      {
        mintAddress: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", // fartcoin
      },
      {
        mintAddress: "vooz4rKUS7PJ2a1r1T3q81E7b5NpGYjsT5YxciCJ4rF", // vooz
      },
    ],
  },
}

setupModuleSol(NETWORK_CONFIG, "sol-spl")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test (sol-spl)...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what "normal" event loop delay looks like
    await testSubscribeBalancesSol(NETWORK_CONFIG, setup.tokens, {
      module: "sol-spl",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalancesSol(NETWORK_CONFIG, setup.tokens, {
      module: "sol-spl",
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

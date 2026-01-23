import { webcrypto } from "node:crypto"

import { log } from "extension-shared"

import { setupModule } from "./common/setupModule"
import { testSubscribeBalances } from "./common/testSubscribeBalances"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "hydration",
  rpcs: ["wss://hydration.dotters.network"],
  nativeCurrency: { coingeckoId: "polkadot" },
  tokens: {
    "substrate-hydration": [
      {
        onChainId: 30, // MYTH
        name: "Mythos native token",
      },
      {
        onChainId: 1000795, // SKY
        coingeckoId: "sky",
      },
      {
        onChainId: 69, // GIGADOT
      },
      {
        onChainId: 1000082, // WIFD - external
        symbol: "WIFD",
        name: "dog wif dots",
        decimals: 10,
      },
    ],
  },
}

setupModule(NETWORK_CONFIG, "substrate-hydration")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test (substrate-hydration)...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what "normal" event loop delay looks like
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-hydration",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-hydration",
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

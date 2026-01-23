import { webcrypto } from "node:crypto"

import { log } from "extension-shared"

import { setupModule } from "./common/setupModule"
import { testSubscribeBalances } from "./common/testSubscribeBalances"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "aleph-zero",
  rpcs: ["wss://ws.azero.dev"],
  nativeCurrency: { coingeckoId: "aleph-zero" },
  tokens: {
    "substrate-psp22": [
      {
        contractAddress: "5GSGAcvqpF5SuH2MhJ1YUdbLAbssCjeqCn2miMUCWUjnr5DQ",
        symbol: "PANX",
        coingeckoId: "panorama-swap-token",
      },
    ],
  },
}

setupModule(NETWORK_CONFIG, "substrate-psp22")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test (substrate-psp22)...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what "normal" event loop delay looks like
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-psp22",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-psp22",
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

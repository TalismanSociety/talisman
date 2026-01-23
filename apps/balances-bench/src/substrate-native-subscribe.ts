import { webcrypto } from "node:crypto"

import { log } from "extension-shared"

import { setupModule } from "./common/setupModule"
import { testSubscribeBalances } from "./common/testSubscribeBalances"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "polkadot",
  rpcs: ["wss://rpc.polkadot.io"],
  nativeCurrency: { coingeckoId: "polkadot" },
  tokens: {},
}

setupModule(NETWORK_CONFIG, "substrate-native")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test (substrate-native)...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what "normal" event loop delay looks like
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-native",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-native",
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

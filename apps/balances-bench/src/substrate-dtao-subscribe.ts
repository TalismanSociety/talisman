import { webcrypto } from "crypto"

import { log } from "extension-shared"

import { setupModule } from "./common/setupModule"
import { testSubscribeBalances } from "./common/testSubscribeBalances"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "bittensor",
  rpcs: ["wss://entrypoint-finney.opentensor.ai"],
  nativeCurrency: { coingeckoId: "bittensor" },
  tokens: {},
}

// Set up the module and run performance test
setupModule(NETWORK_CONFIG, "substrate-dtao")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what “normal” event loop delay looks like
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-dtao",
      testDuration: 30000, // 30 seconds
      monitoringInterval: 5, // Check every 5ms
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-dtao",
      testDuration: 30000, // 30 seconds
      monitoringInterval: 5, // Check every 5ms
      setupTimeout: 30000, // 30 second timeout for setup
    })

    log.log("Thread blocking test completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error:", error)
    process.exit(1)
  })

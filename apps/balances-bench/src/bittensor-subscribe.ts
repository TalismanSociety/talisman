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
    log.log("Running subscribeBalances performance test...")
    log.log("=".repeat(80))
    log.log()

    // Run the performance test
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-dtao",
      iterations: 3, // Measure 3 poll iterations
      iterationTimeout: 30000, // 30 second timeout per iteration
    })

    log.log("Performance test completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error:", error)
    process.exit(1)
  })

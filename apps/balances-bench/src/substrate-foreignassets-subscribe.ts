import { webcrypto } from "node:crypto"

import { log } from "extension-shared"

import { setupModule } from "./common/setupModule"
import { testSubscribeBalances } from "./common/testSubscribeBalances"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "polkadot-asset-hub",
  rpcs: ["wss://sys.dotters.network/statemint"],
  nativeCurrency: { coingeckoId: "polkadot" },
  tokens: {
    "substrate-foreignassets": [
      {
        onChainId:
          '{"parents":2,"interior":{"type":"X2","value":[{"type":"GlobalConsensus","value":{"type":"Ethereum","value":{"chain_id":"bigint:1"}}},{"type":"AccountKey20","value":{"key":"hex:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc0"}}]}}',
        coingeckoId: "weth",
      },
      {
        onChainId:
          '{"parents":1,"interior":{"type":"X1","value":{"type":"Parachain","value":3369}}}',
        coingeckoId: "mythos",
      },
    ],
  },
}

setupModule(NETWORK_CONFIG, "substrate-foreignassets")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test (substrate-foreignassets)...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what "normal" event loop delay looks like
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-foreignassets",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalances(NETWORK_CONFIG, setup.miniMetadata, setup.tokens, {
      module: "substrate-foreignassets",
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

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { webcrypto } from "crypto"

import { log } from "extension-shared"

import { testNetworkDot } from "./common/testNetworkDot"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "neuroweb",
  rpcs: ["wss://parachain-rpc.origin-trail.network"],
  nativeCurrency: { coingeckoId: "polkadot" },
  tokens: {
    "substrate-assets": [
      {
        assetId: "1", // TRAC
      },
    ],
  },
}

testNetworkDot(NETWORK_CONFIG, {
  modules: ["substrate-assets", "substrate-foreignassets"],
})
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

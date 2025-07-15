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
  id: "astar",
  rpcs: ["wss://rpc.astar.network"],
  nativeCurrency: { coingeckoId: "astar" },
  tokens: {
    "substrate-assets": [
      {
        assetId: "18446744073709551616",
        coingeckoId: "acala",
      },
      {
        assetId: "340282366920938463463374607431768211455",
        coingeckoId: "dot",
      },
    ],
  },
}

testNetworkDot(NETWORK_CONFIG)
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

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

testNetworkDot(NETWORK_CONFIG, { modules: ["substrate-psp22", "substrate-native"] })
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

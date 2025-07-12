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
  id: "interlay",
  rpcs: ["wss://api.interlay.io/parachain"],
  nativeCurrency: { coingeckoId: "interlay" },
  tokens: {
    "substrate-tokens": [
      {
        onChainId: '{"type":"ForeignAsset","value":13}',
        decimals: 12,
        symbol: "HDX",
        coingeckoId: "hydradx",
        existentialDeposit: "0",
      },
    ],
  },
}

testNetworkDot(NETWORK_CONFIG, { modules: ["substrate-tokens"] })
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

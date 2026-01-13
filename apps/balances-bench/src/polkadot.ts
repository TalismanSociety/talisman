import { webcrypto } from "node:crypto"

import { log } from "extension-shared"

import { testNetworkDot } from "./common/testNetworkDot"

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

testNetworkDot(NETWORK_CONFIG, { modules: ["substrate-native"] })
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

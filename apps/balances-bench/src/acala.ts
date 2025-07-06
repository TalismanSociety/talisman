/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { webcrypto } from "crypto"

import { log } from "extension-shared"

import { testDotNetwork } from "./common/testPolkadotNetwork"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "acala",
  rpcs: ["wss://acala.dotters.network"],
  nativeCurrency: { coingeckoId: "acala" },
  tokens: {
    "substrate-tokens": [
      {
        onChainId: '{"type":"Token","value":{"type":"AUSD"}}',
        decimals: 12,
        symbol: "aSEED",
        coingeckoId: "ausd-seed-acala",
        existentialDeposit: "100000000000",
      },
      {
        onChainId: '{"type":"Token","value":{"type":"DOT"}}',
        decimals: 10,
        symbol: "DOT",
        coingeckoId: "polkadot",
        existentialDeposit: "100000000",
      },
    ],
  },
}

testDotNetwork(NETWORK_CONFIG, ["substrate-tokens"])
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

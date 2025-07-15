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
  id: "bifrost-polkadot",
  rpcs: ["wss://bifrost-polkadot.ibp.network"],
  nativeCurrency: { coingeckoId: "bifrost-native-coin" },
  tokens: {
    "substrate-tokens": [
      {
        onChainId: '{"type":"Token","value":{"type":"BNC"}}',
        decimals: 12,
        symbol: "BNC",
        coingeckoId: "bifrost-native-coin",
        existentialDeposit: "0",
      },
      {
        onChainId: '{"type":"Token2","value":0}',
        decimals: 10,
        symbol: "DOT",
        coingeckoId: "polkadot",
        existentialDeposit: "1000000",
      },
      {
        onChainId: '{"type":"VToken2","value":0}',
        decimals: 10,
        symbol: "vDOT",
        coingeckoId: "voucher-dot",
        existentialDeposit: "1000000",
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

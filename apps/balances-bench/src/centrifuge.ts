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
  id: "centrifuge",
  rpcs: ["wss://fullnode.centrifuge.io"],
  nativeCurrency: { coingeckoId: "bifrost-native-coin" },
  balancesConfig: {
    "substrate-tokens": {
      palletId: "OrmlTokens",
    },
  },
  tokens: {
    "substrate-tokens": [
      {
        onChainId: '{"type":"ForeignAsset","value":1}',
        decimals: 6,
        symbol: "USDT",
        coingeckoId: "tether",
        existentialDeposit: "10000",
      },
      {
        onChainId: '{"type":"ForeignAsset","value":5}',
        decimals: 10,
        symbol: "DOT",
        coingeckoId: "polkadot",
        existentialDeposit: "100000",
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

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
  id: "polkadot-asset-hub",
  rpcs: ["wss://sys.ibp.network/asset-hub-polkadot"],
  nativeCurrency: { coingeckoId: "polkadot" },
  tokens: {
    "substrate-assets": [
      // {
      //   assetId: "1337", // MYTH
      //   coingeckoId: "usd-coin",
      // },
      // {
      //   assetId: "31337",
      //   coingeckoId: "gavun-wud",
      // },
      {
        assetId: "23", // PINK
      },
    ],
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

testNetworkDot(NETWORK_CONFIG, { modules: ["substrate-assets"] })
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

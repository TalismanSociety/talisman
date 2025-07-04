/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "./common/polyfills"

import { log } from "extension-shared"

import { DotNetworkConfig, testDotNetwork } from "./common/testPolkadotNetwork"

const NETWORK_CONFIG: DotNetworkConfig = {
  id: "hydration",
  rpcs: ["wss://hydration.dotters.network"],
  tokens: {
    "substrate-hydration": [
      {
        onChainId: 30, // MYTH
        name: "Mythos native token",
      },
      {
        onChainId: 1000795, // SKY
        coingeckoId: "sky",
      },
      {
        onChainId: 69, // GIGADOT
      },
    ],
  },
}

testDotNetwork(NETWORK_CONFIG)
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

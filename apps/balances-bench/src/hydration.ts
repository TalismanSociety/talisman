/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "./common/polyfills"

import { isTokenSubHydration } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

import { DotNetworkConfig, testNetworkDot } from "./common/testNetworkDot"

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
      {
        onChainId: 1000082, // WIFD - external
        symbol: "WIFD",
        name: "dog wif dots",
        decimals: 10,
      },
    ],
  },
}

testNetworkDot(NETWORK_CONFIG, {
  modules: ["substrate-hydration"],
  fetchBalances: false,
  transfer: false,
})
  .then(({ tokens }) => {
    const wifd = tokens?.filter(isTokenSubHydration).find((t) => t.onChainId === 1000082)
    log.log("WIFD token:", wifd)

    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

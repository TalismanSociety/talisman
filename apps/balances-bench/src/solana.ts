/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import "./common/polyfills"

import { log } from "extension-shared"

import { testNetworkSol } from "./common/testNetworkSol"

const NETWORK_CONFIG = {
  id: "solana-mainnet",
  rpcs: ["https://api.mainnet-beta.solana.com"],
  nativeCurrency: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9,
  },
  tokens: {},
}

testNetworkSol(NETWORK_CONFIG, { modules: ["sol-native"], transfer: true })
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

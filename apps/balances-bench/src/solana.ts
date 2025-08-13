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
  tokens: {
    "sol-spl": [
      {
        mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // usdc
      },
      {
        mintAddress: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", // fartcoin
      },
      {
        mintAddress: "DnFxs7eCaJBXwMqZD8iZLeiM11cTdvfFp7Qit9usWqY8", // invalid token
      },
      {
        mintAddress: "vooz4rKUS7PJ2a1r1T3q81E7b5NpGYjsT5YxciCJ4rF", // vooz
      },
    ],
  },
}

testNetworkSol(NETWORK_CONFIG, { modules: ["sol-spl"], transfer: false })
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })

import { NETWORK, TEST_NETWORK } from "@scure/btc-signer"

import type { BitcoinHrp, BitcoinNetworkName } from "./types"

export type BtcSignerNetwork = typeof NETWORK

export const getBtcSignerNetwork = (network: BitcoinNetworkName): BtcSignerNetwork => {
  switch (network) {
    case "bitcoin":
      return NETWORK
    case "bitcoin-signet":
      // signet uses testnet address/WIF parameters
      return TEST_NETWORK
  }
}

export const getBitcoinHrp = (network: BitcoinNetworkName): BitcoinHrp =>
  network === "bitcoin" ? "bc" : "tb"

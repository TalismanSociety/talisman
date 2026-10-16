import { Address, NETWORK, TEST_NETWORK } from "@scure/btc-signer"

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

/**
 * On-chain addresses embed their network (bech32 hrp / base58 version bytes):
 * a mainnet address is not decodable as signet and vice-versa. Rejects xpubs.
 */
export const isBitcoinAddressValidForNetwork = (
  address: string,
  network: BitcoinNetworkName
): boolean => {
  try {
    Address(getBtcSignerNetwork(network)).decode(address)
    return true
  } catch {
    return false
  }
}

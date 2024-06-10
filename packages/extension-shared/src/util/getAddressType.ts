// address types from https://wiki.polkadot.network/docs/learn-accounts

import { isEthereumAddress } from "@polkadot/util-crypto"

import { isValidAddress } from "./isValidAddress"

export type AccountAddressType = "ss58" | "ethereum" | "UNKNOWN"

export const getAddressType = (address: string): AccountAddressType => {
  if (isEthereumAddress(address)) return "ethereum"
  if (isValidAddress(address)) return "ss58"
  return "UNKNOWN"
}

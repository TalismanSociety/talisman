// address types from https://wiki.polkadot.network/docs/learn-accounts

import { DotNetwork } from "@talismn/chaindata-provider"

import { AccountAddressType } from "./getAddressType"

export const getChainAddressType = (chain: DotNetwork): AccountAddressType => {
  switch (chain.account) {
    case "*25519":
      return "ss58"
    case "secp256k1":
      return "ethereum"
    default:
      return "UNKNOWN"
  }
}

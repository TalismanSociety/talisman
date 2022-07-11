// address types from https://wiki.polkadot.network/docs/learn-accounts

import { Chain } from "@core/domains/chains/types"

import { AccountAddressType } from "./getAddressType"

export const getChainAddressType = (chain: Chain): AccountAddressType => {
  switch (chain?.account?.toLowerCase()) {
    case "sr25519":
    case "ed25519":
    case "sr25519*":
    case "*25519":
      return "ss58"
    case "secp256k1":
      return "ethereum"
    default:
      return "UNKNOWN"
  }
}

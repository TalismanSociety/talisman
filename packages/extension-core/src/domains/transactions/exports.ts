import { normalizeAddress } from "@talismn/crypto"

import { WalletTransaction } from "./types"

export const filterIsSameNetworkAndAddressTx =
  (ref: WalletTransaction) => (tx: WalletTransaction) => {
    if (normalizeAddress(ref.account) !== normalizeAddress(tx.account)) return false
    if (ref.networkType !== tx.networkType) return false
    if (
      ref.networkType === "evm" &&
      tx.networkType === "evm" &&
      ref.evmNetworkId === tx.evmNetworkId
    )
      return true
    if (
      ref.networkType === "substrate" &&
      tx.networkType === "substrate" &&
      ref.genesisHash === tx.genesisHash
    )
      return true
    return false
  }

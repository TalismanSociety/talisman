import { isAddressEqual } from "@talismn/crypto"

import type { WalletTransaction } from "./types"

export { isTxInfoApproval, isTxInfoSwap, isTxInfoTransfer } from "./helpers"

export const filterIsSameNetworkAndAddressTx =
  (ref: WalletTransaction) => (tx: WalletTransaction) => {
    return ref.networkId === tx.networkId && isAddressEqual(ref.account, tx.account)
  }

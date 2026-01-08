import { isAddressEqual } from "@talismn/crypto"

import { WalletTransaction } from "./types"

export { isTxInfoSwap, isTxInfoTransfer, isTxInfoApproval } from "./helpers"

export const filterIsSameNetworkAndAddressTx =
  (ref: WalletTransaction) => (tx: WalletTransaction) => {
    return ref.networkId === tx.networkId && isAddressEqual(ref.account, tx.account)
  }

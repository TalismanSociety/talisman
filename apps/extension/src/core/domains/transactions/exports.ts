import { isAddressEqual } from "@talismn/crypto"

import type { WalletTransaction, WalletTransactionInfo } from "./types"

export const filterIsSameNetworkAndAddressTx =
  (ref: WalletTransaction) => (tx: WalletTransaction) => {
    return ref.networkId === tx.networkId && isAddressEqual(ref.account, tx.account)
  }

const isTxInfoOfType = <T extends WalletTransactionInfo["type"]>(
  txInfo: WalletTransactionInfo | undefined | null,
  type: T
): txInfo is Extract<WalletTransactionInfo, { type: T }> => {
  return !!txInfo && txInfo.type === type
}

const isTxInfoInTypes = <T extends WalletTransactionInfo["type"]>(
  txInfo: WalletTransactionInfo | undefined | null,
  types: T[]
): txInfo is Extract<WalletTransactionInfo, { type: T }> => {
  return types.some((type) => isTxInfoOfType(txInfo, type))
}

export const isTxInfoSwap = (txInfo: WalletTransactionInfo | undefined | null) =>
  isTxInfoInTypes(txInfo, [
    "swap-simpleswap",
    "swap-stealthex",
    "swap-lifi",
    "swap-chainflip",
    "swap-bittensor-evm",
    "swap-forevermoney",
    "swap-bittensor-dtao",
    "bittensor-staking",
  ])

/** a stake or an unstake of TAO, from a staking wizard or from Swap: it settles with its transaction */
export const isTxInfoBittensorStake = (txInfo: WalletTransactionInfo | undefined | null) =>
  isTxInfoInTypes(txInfo, ["bittensor-staking", "swap-bittensor-dtao"])

export const isTxInfoTransfer = (txInfo: WalletTransactionInfo | undefined | null) =>
  isTxInfoOfType(txInfo, "transfer")

export const isTxInfoApproval = (txInfo: WalletTransactionInfo | undefined | null) =>
  isTxInfoOfType(txInfo, "approve-erc20")

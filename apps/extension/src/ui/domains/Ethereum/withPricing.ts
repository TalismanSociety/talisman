import type { WalletTransactionInfo } from "@core/domains/transactions/types"

import type { useEthTransaction } from "./useEthTransaction"

/** the transaction remembers the priority and the fee the user saw when they signed it */
export const withPricing = (
  txInfo: WalletTransactionInfo,
  { priority, txDetails }: Pick<ReturnType<typeof useEthTransaction>, "priority" | "txDetails">
): WalletTransactionInfo => ({
  ...txInfo,
  pricing:
    priority && txDetails
      ? { priority, estimatedFee: txDetails.estimatedFee.toString() }
      : undefined,
})

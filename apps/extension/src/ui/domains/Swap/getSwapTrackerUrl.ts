import { getCcipExplorerTxUrl } from "@core/domains/forevermoney/constants"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"

export const getSwapTrackerUrl = (
  txInfo: WalletTransactionInfo | undefined | null,
  txId: string
): string | null => {
  switch (txInfo?.type) {
    case "swap-simpleswap":
      return txInfo.exchangeId ? `https://simpleswap.io/exchange?id=${txInfo.exchangeId}` : null
    case "swap-stealthex":
      return txInfo.exchangeId ? `https://stealthex.io/exchange?id=${txInfo.exchangeId}` : null
    case "swap-lifi":
      return `https://scan.li.fi/tx/${txId}`
    case "swap-forevermoney":
      return getCcipExplorerTxUrl(txId)
    default:
      return null
  }
}

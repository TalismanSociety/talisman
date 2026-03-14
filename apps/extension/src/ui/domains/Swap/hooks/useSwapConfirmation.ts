import { activeNetworksStore } from "@core/domains/balances/store.activeNetworks"
import { activeTokensStore } from "@core/domains/balances/store.activeTokens"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { useCallback, useEffect, useMemo, useState } from "react"

import { saveIdForMonitoring } from "../swap-modules/simpleswap-swap-module"

/**
 * Delays readiness by 1 second after entering the confirm view,
 * preventing premature user interaction while gas estimates settle.
 */
export function useConfirmReadiness(swapView: string): boolean {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (swapView !== "confirm") return setIsReady(false)

    const timeout = setTimeout(() => setIsReady(true), 1_000)
    return () => clearTimeout(timeout)
  }, [swapView])

  return isReady
}

/**
 * Builds WalletTransactionInfo for the swap, shared across EVM and Substrate flows.
 */
export function useSwapTxInfo({
  exchange,
  fromTokenId,
  toTokenId,
  fromAmount,
  toAmount,
  toAddress,
  protocol,
  subProtocol,
  fromLifiChainId,
  toLifiChainId,
}: {
  exchange: { id: string } | undefined
  fromTokenId: string | null
  toTokenId: string | null
  fromAmount: bigint | null
  toAmount: bigint | null
  toAddress: string | null
  protocol: string | undefined
  subProtocol?: string
  fromLifiChainId?: number
  toLifiChainId?: number
}): WalletTransactionInfo | undefined {
  return useMemo(() => {
    if (!fromTokenId || !toTokenId || !toAmount || !fromAmount || toAddress === null) return

    switch (protocol) {
      case "simpleswap":
        if (!exchange) return
        return {
          type: "swap-simpleswap",
          exchangeId: exchange.id,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      case "stealthex":
        if (!exchange) return
        return {
          type: "swap-stealthex",
          exchangeId: exchange.id,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      case "lifi":
        if (!subProtocol) return
        return {
          type: "swap-lifi",
          protocolName: subProtocol,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
          fromLifiChainId,
          toLifiChainId,
        }
    }
    throw new Error(`swapModule ${protocol} not supported`)
  }, [
    exchange,
    fromAmount,
    fromLifiChainId,
    fromTokenId,
    protocol,
    subProtocol,
    toAddress,
    toAmount,
    toLifiChainId,
    toTokenId,
  ])
}

/**
 * Returns a callback that handles post-submission side effects:
 * monitoring registration, network/token activation, and navigation.
 */
export function useSwapPostSubmit({
  fromNetworkId,
  toNetworkId,
  toTokenId,
  txInfo,
  gotoSubmitted,
}: {
  fromNetworkId: string | null | undefined
  toNetworkId: string | null | undefined
  toTokenId: string | null
  txInfo: WalletTransactionInfo | undefined
  gotoSubmitted: (params: {
    hash: string
    networkId: string
    txInfo: WalletTransactionInfo
  }) => void
}): (hash: string) => void {
  return useCallback(
    (hash: string) => {
      if (txInfo?.type === "swap-simpleswap") saveIdForMonitoring(txInfo.exchangeId, hash)
      if (toNetworkId) activeNetworksStore.setActive(toNetworkId, true)
      if (toTokenId) activeTokensStore.setActive(toTokenId, true)
      if (txInfo && fromNetworkId) gotoSubmitted({ hash, networkId: fromNetworkId, txInfo })
    },
    [fromNetworkId, gotoSubmitted, toNetworkId, toTokenId, txInfo]
  )
}

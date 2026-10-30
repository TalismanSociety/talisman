import { activeNetworksStore } from "@core/domains/chaindata/store.activeNetworks"
import { activeTokensStore } from "@core/domains/chaindata/store.activeTokens"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { useCallback, useEffect, useState } from "react"
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
      if (txInfo?.type === "swap-simpleswap")
        saveIdForMonitoring(txInfo.exchangeId, hash).catch(() => {})
      if (toNetworkId) activeNetworksStore.setActive(toNetworkId, true)
      if (toTokenId) activeTokensStore.setActive(toTokenId, true)
      if (txInfo && fromNetworkId) gotoSubmitted({ hash, networkId: fromNetworkId, txInfo })
    },
    [fromNetworkId, gotoSubmitted, toNetworkId, toTokenId, txInfo]
  )
}

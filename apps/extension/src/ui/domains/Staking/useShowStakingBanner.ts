import { Balances } from "@extension/core"
import { TALISMAN_WEB_APP_STAKING_URL } from "@extension/shared"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback } from "react"

import { useTokenBalancesSummary } from "../Portfolio/useTokenBalancesSummary"
import { isStakingSupportedChain } from "./helpers"
import { useStakingBanner } from "./useStakingBanner"

export const useShowStakingBanner = (balances: Balances) => {
  const { genericEvent } = useAnalytics()

  const { token } = useTokenBalancesSummary(balances)

  const { showTokenStakingBanner, dismissStakingBanner, getStakingMessage, getBannerColours } =
    useStakingBanner()
  const showBanner = showTokenStakingBanner({
    token,
    addresses: Array.from(new Set(balances.each.map((b) => b.address))),
  })
  const message = getStakingMessage({ token })
  const colours = getBannerColours({ token })

  const handleClickStakingBanner = useCallback(() => {
    window.open(TALISMAN_WEB_APP_STAKING_URL)
    genericEvent("open web app staking from banner", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, token?.symbol])

  const handleDismissStakingBanner = useCallback(() => {
    const unsafeChainId = token?.chain?.id || token?.evmNetwork?.id
    if (unsafeChainId && isStakingSupportedChain(unsafeChainId)) dismissStakingBanner(unsafeChainId)
    genericEvent("dismiss staking banner", { from: "dashboard", symbol: token?.symbol })
  }, [token?.chain?.id, token?.evmNetwork?.id, token?.symbol, dismissStakingBanner, genericEvent])

  return {
    showBanner,
    message,
    colours,
    handleClickStakingBanner,
    handleDismissStakingBanner,
  }
}

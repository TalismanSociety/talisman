import { AccountJsonAny } from "@core/domains/accounts/types"
import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { api } from "@ui/api"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import useBalances from "./useBalances"

export const useSendFundsPopup = (account: AccountJsonAny | undefined, tokenId?: TokenId) => {
  const { t } = useTranslation()
  const balances = useBalances("owned")
  const transferableBalances = useMemo(
    () => new Balances(balances.each.filter((b) => !tokenId || b.tokenId === tokenId)),
    [balances, tokenId]
  )

  const { canSendFunds, cannotSendFundsReason } = useMemo<{
    canSendFunds: boolean
    cannotSendFundsReason?: string
  }>(() => {
    if (account?.origin === "WATCHED")
      return {
        canSendFunds: false,
        cannotSendFundsReason: t("Watched accounts cannot send funds"),
      }
    if (tokenId && transferableBalances.sum.planck.transferable === 0n)
      return {
        canSendFunds: false,
        cannotSendFundsReason: t("No tokens available to send"),
      }
    return { canSendFunds: true }
  }, [account?.origin, t, tokenId, transferableBalances.sum.planck.transferable])

  const openSendFundsPopup = useCallback(() => {
    if (!canSendFunds) return
    api.sendFundsOpen({ from: account?.address, tokenId })
  }, [account?.address, canSendFunds, tokenId])

  return { canSendFunds, cannotSendFundsReason, openSendFundsPopup }
}

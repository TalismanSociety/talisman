import { BalanceFormatter } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

/**
 * Warns before a root rewards claim that forfeits part of the entitlement (spec 468): fund
 * rows too small to sell are skipped as dust, the chain burns the full entitlement but only
 * pays the redeemable part, and the skipped value stays in the fund for the other holders.
 */
export const useBittensorClaimForfeitWarning = (
  forfeitedPlancks: bigint,
  nativeToken: Token | null | undefined
) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (forfeitedPlancks <= 0n) return null
    return t(
      "This claim forfeits about {{amount}} {{symbol}} of rewards held in positions too small to sell",
      {
        amount: new BalanceFormatter(forfeitedPlancks, nativeToken?.decimals).tokens,
        symbol: nativeToken?.symbol ?? "TAO",
      }
    )
  }, [forfeitedPlancks, nativeToken?.decimals, nativeToken?.symbol, t])
}

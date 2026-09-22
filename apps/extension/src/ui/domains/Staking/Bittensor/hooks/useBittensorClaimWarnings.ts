import { BalanceFormatter } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { formatDuration, intervalToDuration } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

type UseBittensorClaimWarningsProps = {
  /** entitlement value the claim leaves behind in fund rows too small to sell (spec 468) */
  forfeitedPlancks: bigint
  /** root stake hold window the claim restarts for the pair, null when the hold is disabled */
  holdDurationMs: number | null
  nativeToken: Token | null | undefined
}

/**
 * Warnings to show before a root rewards claim, in display order: the chain burns the full
 * entitlement but only pays the redeemable part, and the claimed TAO is staked back onto
 * root, which restarts the hold window when one is enabled.
 */
export const useBittensorClaimWarnings = ({
  forfeitedPlancks,
  holdDurationMs,
  nativeToken,
}: UseBittensorClaimWarningsProps) => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()

  return useMemo(() => {
    const symbol = nativeToken?.symbol ?? "TAO"
    const warnings: string[] = []

    if (forfeitedPlancks > 0n)
      warnings.push(
        t(
          "This claim forfeits about {{amount}} {{symbol}} of rewards held in positions too small to sell",
          { amount: new BalanceFormatter(forfeitedPlancks, nativeToken?.decimals).tokens, symbol }
        )
      )

    if (holdDurationMs)
      warnings.push(
        t("After this claim, your staked {{symbol}} will be locked for another {{duration}}", {
          symbol,
          duration: formatDuration(intervalToDuration({ start: 0, end: holdDurationMs }), {
            locale,
          }),
        })
      )

    return warnings
  }, [forfeitedPlancks, holdDurationMs, locale, nativeToken?.decimals, nativeToken?.symbol, t])
}

import { BalanceFormatter } from "@talismn/balances"
import { Toggle } from "@ui/components/Toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useTranslation } from "react-i18next"

import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

/**
 * Root unstake only: offers to claim the position's pending rewards within the same
 * transaction. Opt-out — hidden when there is nothing to claim, disabled while the
 * claim gate is closed (below the network minimum, or a chain read unresolved).
 */
export const BittensorClaimRewardsRow = () => {
  const { t } = useTranslation()
  const {
    claimOption,
    claimablePlancks,
    dustThreshold,
    isBelowDustThreshold,
    nativeToken,
    setWithClaim,
  } = useBittensorBondWizard()

  if (!claimOption.showRow) return null

  const toggle = (
    <Toggle
      variant="tiny"
      checked={claimOption.isChecked}
      disabled={claimOption.isRowDisabled}
      onChange={(e) => setWithClaim(e.target.checked)}
    />
  )

  return (
    <div className="flex items-center justify-between gap-8 text-xs">
      <div className="whitespace-nowrap">{t("Claim rewards")}</div>
      <div className="flex items-center gap-4 overflow-hidden">
        <TokensAndFiat
          isBalance
          planck={claimablePlancks}
          tokenId={nativeToken?.id}
          noCountUp
          tokensClassName="text-body"
        />
        {isBelowDustThreshold ? (
          <Tooltip>
            <TooltipTrigger>{toggle}</TooltipTrigger>
            <TooltipContent>
              {t("The network's minimum claim is currently {{amount}} {{symbol}}", {
                amount: new BalanceFormatter(dustThreshold, nativeToken?.decimals).tokens,
                symbol: nativeToken?.symbol,
              })}
            </TooltipContent>
          </Tooltip>
        ) : (
          toggle
        )}
      </div>
    </div>
  )
}

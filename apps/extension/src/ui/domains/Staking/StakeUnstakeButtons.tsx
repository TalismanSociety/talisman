import type { Balances } from "@talismn/balances"
import { ZapOffIcon, ZapPlusIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { cn } from "@ui/util/cn"
import { type FC, type MouseEventHandler, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useBondButton } from "./Bond/hooks/useBondButton"
import { useUnbondButton } from "./Unbond/useUnbondButton"

export const StakeUnstakeButtons: FC<{
  balances: Balances
  isPortfolio?: boolean
}> = ({ balances, isPortfolio }) => {
  const { t } = useTranslation()

  const ignoreExistingSettings = useMemo(
    () => isPortfolio && balances.each.some((b) => b.token?.type === "substrate-native"),
    [balances, isPortfolio]
  )

  const { canBond, onClick: onStakeClick } = useBondButton({ balances, ignoreExistingSettings })
  const { canUnbond, onClick: onUnstakeClick } = useUnbondButton({ balances })

  if (!canBond && !canUnbond) return null

  return (
    <div className="flex items-center gap-4">
      <RoundButton
        ariaLabel={t("Stake")}
        enabled={canBond}
        onClick={onStakeClick}
        icon={ZapPlusIcon}
        disabledTooltip={t("Cannot stake")}
      />
      <RoundButton
        ariaLabel={t("Unstake")}
        enabled={canUnbond}
        onClick={onUnstakeClick}
        icon={ZapOffIcon}
        disabledTooltip={t("No staked balance")}
      />
    </div>
  )
}

const RoundButton: FC<{
  ariaLabel: string
  enabled: boolean
  onClick: MouseEventHandler<HTMLButtonElement> | null
  icon: React.ElementType
  disabledTooltip: string
}> = ({ ariaLabel, enabled, onClick, icon: Icon, disabledTooltip }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={!enabled}
          onClick={enabled ? (onClick ?? undefined) : undefined}
          className={cn(
            "inline-flex size-14 items-center justify-center rounded-full",
            enabled
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "cursor-not-allowed bg-grey-800/50 text-body-disabled"
          )}
        >
          <Icon className="size-8" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{enabled ? ariaLabel : disabledTooltip}</TooltipContent>
    </Tooltip>
  )
}

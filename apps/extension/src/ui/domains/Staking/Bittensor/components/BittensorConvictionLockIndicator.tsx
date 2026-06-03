import { BalanceFormatter, findDTaoConvictionLock } from "@talismn/balances"
import { LockIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { BittensorStakingPosition } from "../hooks/useBittensorStakingPositions"

/**
 * Displays a lock icon with a tooltip when part of the position's stake
 * is conviction locked (cannot be unstaked or transferred).
 */
export const BittensorConvictionLockIndicator: FC<{ position: BittensorStakingPosition }> = ({
  position,
}) => {
  const { t } = useTranslation()

  const lock = useMemo(() => findDTaoConvictionLock(position.balance.locks), [position.balance])

  if (!lock) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 items-center text-body-secondary">
          <LockIcon />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("{{label}}: {{amount}} {{symbol}} cannot be unstaked", {
          label: lock.label,
          amount: new BalanceFormatter(lock.amount, position.token.decimals).tokens,
          symbol: position.token.symbol,
        })}
      </TooltipContent>
    </Tooltip>
  )
}

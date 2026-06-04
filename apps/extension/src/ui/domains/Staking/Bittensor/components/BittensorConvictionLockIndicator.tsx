import { BalanceFormatter } from "@talismn/balances"
import { LockIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useBalances } from "@ui/state/balances"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { BittensorStakingPosition } from "../hooks/useBittensorStakingPositions"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"

/**
 * Displays a lock icon with a tooltip when part of the coldkey's stake on this
 * position's subnet is conviction locked (cannot be unstaked or transferred).
 *
 * The lock is subnet-wide: it constrains the coldkey's total alpha on the subnet,
 * not this specific position.
 */
export const BittensorConvictionLockIndicator: FC<{ position: BittensorStakingPosition }> = ({
  position,
}) => {
  const { t } = useTranslation()

  const balances = useBalances("owned")
  const lock = useMemo(
    () =>
      getDTaoSubnetUnstakeInfo(
        balances,
        position.balance.address,
        position.token.networkId,
        position.token.netuid
      ).convictionLock,
    [balances, position.balance.address, position.token.networkId, position.token.netuid]
  )

  if (!lock) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0 items-center text-body-secondary">
          <LockIcon />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {t("{{label}}: {{amount}} {{symbol}} of your stake on this subnet cannot be unstaked", {
          label: lock.label,
          amount: new BalanceFormatter(lock.amount, position.token.decimals).tokens,
          symbol: position.token.symbol,
        })}
      </TooltipContent>
    </Tooltip>
  )
}

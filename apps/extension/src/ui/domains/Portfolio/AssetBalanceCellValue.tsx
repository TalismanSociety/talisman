import { LockIcon } from "@talismn/icons"
import { WithTooltip } from "@ui/components/WithTooltip"
import type { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { classNames } from "@ui/util/cn"
import type BigNumber from "bignumber.js"
import type { ReactNode } from "react"

import { Fiat } from "../Asset/Fiat"
import { Tokens } from "../Asset/Tokens"
import { StaleBalancesIcon } from "./StaleBalancesIcon"

type Props = {
  locked?: boolean
  tokens: BigNumber | number
  fiat: number | null
  symbol: string
  render?: boolean
  className?: string
  tooltip?: ReactNode
  balancesStatus?: BalancesStatus
  noCountUp?: boolean
}

export const AssetBalanceCellValue = ({
  locked,
  tokens,
  fiat,
  symbol,
  render = true,
  className,
  tooltip,
  balancesStatus,
  noCountUp,
}: Props) => {
  if (!render) return null
  return (
    <WithTooltip tooltip={tooltip}>
      <div
        className={classNames(
          "flex h-16.5 flex-col justify-center gap-2 whitespace-nowrap p-8 text-right",
          className
        )}
      >
        <div
          className={classNames(
            "flex items-center justify-end gap-2",
            locked ? "text-body-secondary" : "text-body"
          )}
        >
          <div>
            <Tokens amount={tokens} symbol={symbol} isBalance noCountUp={noCountUp} />
          </div>
          {locked ? (
            <div className="pb-1">
              <LockIcon className="lock" />
            </div>
          ) : null}
          {balancesStatus?.status === "stale" ? (
            <div className="pb-1">
              <StaleBalancesIcon staleChains={balancesStatus.staleChains} />
            </div>
          ) : null}
        </div>
        <div>{fiat === null ? "-" : <Fiat amount={fiat} isBalance noCountUp={noCountUp} />}</div>
      </div>
    </WithTooltip>
  )
}

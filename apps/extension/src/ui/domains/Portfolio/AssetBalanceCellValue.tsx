import { WithTooltip } from "@talisman/components/Tooltip"
import { LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import BigNumber from "bignumber.js"
import { ReactNode } from "react"

import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"
import { StaleBalancesIcon } from "./StaleBalancesIcon"

type Props = {
  locked?: boolean
  tokens: BigNumber
  fiat: number | null
  symbol: string
  render?: boolean
  className?: string
  tooltip?: ReactNode
  staleChains?: string[]
}

export const AssetBalanceCellValue = ({
  locked,
  tokens,
  fiat,
  symbol,
  render = true,
  className,
  tooltip,
  staleChains = [],
}: Props) => {
  if (!render) return null
  return (
    <WithTooltip tooltip={tooltip}>
      <div
        className={classNames(
          "flex h-[6.6rem] flex-col justify-center gap-2 whitespace-nowrap p-8 text-right",
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
            <Tokens amount={tokens} symbol={symbol} isBalance />
          </div>
          {locked ? (
            <div className="pb-1">
              <LockIcon className="lock" />
            </div>
          ) : null}
          {staleChains.length > 0 ? (
            <div className="pb-1">
              <StaleBalancesIcon staleChains={staleChains} />
            </div>
          ) : null}
        </div>
        <div>{fiat === null ? "-" : <Fiat currency="usd" amount={fiat} isBalance />}</div>
      </div>
    </WithTooltip>
  )
}

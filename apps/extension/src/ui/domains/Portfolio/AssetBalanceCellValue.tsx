import { Token } from "@core/domains/tokens/types"
import { planckToTokens } from "@core/util"
import { Box } from "@talisman/components/Box"
import { WithTooltip } from "@talisman/components/Tooltip"
import { LockIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { ReactNode } from "react"

import Fiat from "../Asset/Fiat"
import Tokens from "../Asset/Tokens"

type Props = {
  locked?: boolean
  planck: bigint
  fiat: number | null
  token: Token
  render?: boolean
  className?: string
  tooltip?: ReactNode
}

export const AssetBalanceCellValue = ({
  locked,
  planck,
  fiat,
  token,
  render = true,
  className,
  tooltip,
}: Props) => {
  if (!render) return null
  return (
    <WithTooltip tooltip={tooltip}>
      <Box
        h={6.6}
        flex
        column
        justify="center"
        gap={0.4}
        textalign="right"
        padding="1.6rem"
        className={className}
        noWrap
      >
        <div
          className={classNames(
            "flex items-center justify-end gap-2",
            locked ? "text-body-secondary" : "text-body"
          )}
        >
          <div>
            <Tokens
              amount={planckToTokens(planck.toString(), token.decimals)}
              symbol={token?.symbol}
              isBalance
            />
          </div>
          {locked ? (
            <div className="pb-1">
              <LockIcon className="lock" />
            </div>
          ) : null}
        </div>
        <div>{fiat === null ? "-" : <Fiat currency="usd" amount={fiat} isBalance />}</div>
      </Box>
    </WithTooltip>
  )
}

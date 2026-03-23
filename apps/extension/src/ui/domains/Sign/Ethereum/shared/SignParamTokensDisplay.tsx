import type { BalanceFormatter } from "@talismn/balances"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { cn } from "@ui/util/cn"
import type { FC } from "react"

type SignParamTokensDisplayProps = {
  tokenId: string | undefined
  tokens: string | number | null
  decimals: number
  symbol: string
  fiat?: number | BalanceFormatter | null
  withIcon?: boolean
  className?: string
}

export const SignParamTokensDisplay: FC<SignParamTokensDisplayProps> = ({
  tokenId,
  tokens,
  decimals,
  symbol,
  fiat,
  withIcon,
  className,
}) => {
  return (
    <span className={cn("inline-flex gap-3 px-4 pt-0.5 text-base text-body-secondary", className)}>
      {withIcon && (
        <span>
          <TokenLogo tokenId={tokenId} />
        </span>
      )}
      <span className="text-white">
        <Tokens amount={tokens} symbol={symbol} decimals={decimals} noCountUp />
      </span>
      {typeof fiat === "number" && (
        <span>
          (<Fiat amount={fiat} noCountUp />)
        </span>
      )}
    </span>
  )
}

import { classNames } from "@talismn/util"
import { AssetLogo, CoingeckoLogoRequest } from "@ui/domains/Asset/AssetLogo"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { FC } from "react"

type SignParamTokensDisplayProps = {
  tokenId: string | undefined
  erc20?: CoingeckoLogoRequest
  tokens: string | number | null
  decimals: number
  symbol: string
  fiat?: number | null
  withIcon?: boolean
  className?: string
}

export const SignParamTokensDisplay: FC<SignParamTokensDisplayProps> = ({
  tokenId,
  erc20,
  tokens,
  decimals,
  symbol,
  fiat,
  withIcon,
  className,
}) => {
  return (
    <span
      className={classNames(
        "text-body-secondary inline-flex gap-3 px-4 pt-0.5 text-base",
        className
      )}
    >
      {withIcon && (
        <span>
          <AssetLogo id={tokenId} erc20={erc20} />
        </span>
      )}
      <span className="text-white">
        <Tokens amount={tokens} symbol={symbol} decimals={decimals} noCountUp />
      </span>
      {typeof fiat === "number" && (
        <span>
          (<Fiat amount={fiat} currency="usd" noCountUp />)
        </span>
      )}
    </span>
  )
}

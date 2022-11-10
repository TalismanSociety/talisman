import { BalanceFormatter } from "@core/domains/balances"
import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { Token } from "@core/domains/tokens/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { Address } from "@ui/domains/Account/Address"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenImage, TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { FC } from "react"
import { classNames } from "talisman-ui"
import { SignParamButton, SignParamButtonProps } from "./SignParamButton"

type SignParamTokensDisplayProps = {
  tokens: string | number | null
  decimals: number
  symbol: string
  image?: string | null
  fiat?: number | null
  withIcon?: boolean
  className?: string
}

export const SignParamTokensDisplay: FC<SignParamTokensDisplayProps> = ({
  tokens,
  decimals,
  symbol,
  image,
  fiat,
  withIcon,
  className,
}) => {
  return (
    <span
      className={classNames(
        "text-body-secondary inline-flex items-start gap-3 px-4 pt-0.5 text-base",
        className
      )}
    >
      {withIcon && (
        <span>
          <TokenImage src={image} />
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

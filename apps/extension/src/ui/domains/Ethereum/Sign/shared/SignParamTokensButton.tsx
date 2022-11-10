import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { FC } from "react"
import { classNames } from "talisman-ui"
import { SignParamButton } from "./SignParamButton"
import { SignParamTokensDisplay } from "./SignParamTokensDisplay"

type SignParamTokensButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  address: string
  withIcon?: boolean
  tokens: string | number | null
  decimals: number
  symbol: string
  image?: string
  fiat?: number | null
  className?: string
}

export const SignParamTokensButton: FC<SignParamTokensButtonProps> = ({
  address,
  network,
  tokens,
  decimals,
  symbol,
  image,
  fiat,
  withIcon,
  className,
}) => {
  return (
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      withIcon={withIcon}
      className={classNames(
        "text-body-secondary inline-flex items-start gap-3 px-4 text-base",
        className
      )}
    >
      <SignParamTokensDisplay
        tokens={tokens}
        decimals={decimals}
        symbol={symbol}
        image={image}
        fiat={fiat}
        withIcon
        className="pr-0 pt-0"
      />
    </SignParamButton>
  )
}

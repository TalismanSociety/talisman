import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { FC } from "react"
import { SignParamButton } from "./SignParamButton"
import { SignParamTokensDisplay } from "./SignParamTokensDisplay"

type SignParamTokensButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  address: string
  withIcon?: boolean
  tokens: string | number | null
  decimals: number
  symbol: string
  image?: string | null
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
      contentClassName="leading-none"
      className={className}
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

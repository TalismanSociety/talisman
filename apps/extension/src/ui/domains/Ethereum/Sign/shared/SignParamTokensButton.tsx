import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { CoingeckoLogoRequest } from "@ui/domains/Asset/AssetLogo"
import { FC } from "react"
import { classNames } from "talisman-ui"

import { SignParamButton } from "./SignParamButton"
import { SignParamTokensDisplay } from "./SignParamTokensDisplay"

type SignParamTokensButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  address: string
  withIcon?: boolean
  tokenId: string | undefined
  erc20?: CoingeckoLogoRequest
  tokens: string | number | null
  decimals: number
  symbol: string
  fiat?: number | null
  className?: string
}

export const SignParamTokensButton: FC<SignParamTokensButtonProps> = ({
  address,
  network,
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
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      withIcon={withIcon}
      contentClassName="leading-none"
      className={classNames("pt-0.5", className)}
    >
      <SignParamTokensDisplay
        tokenId={tokenId}
        erc20={erc20}
        tokens={tokens}
        decimals={decimals}
        symbol={symbol}
        fiat={fiat}
        withIcon
        className="pr-0 pt-0"
      />
    </SignParamButton>
  )
}

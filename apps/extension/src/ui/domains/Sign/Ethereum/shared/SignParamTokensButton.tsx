import { CustomEvmNetwork, EvmNetwork } from "@extension/core"
import { BalanceFormatter } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { FC } from "react"

import { SignParamButton } from "./SignParamButton"
import { SignParamTokensDisplay } from "./SignParamTokensDisplay"

type SignParamTokensButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  address: string
  withIcon?: boolean
  tokenId: string | undefined
  tokens: string | number | null
  decimals: number
  symbol: string
  fiat?: number | BalanceFormatter | null
  className?: string
}

export const SignParamTokensButton: FC<SignParamTokensButtonProps> = ({
  address,
  network,
  tokenId,
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

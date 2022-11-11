import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { FC } from "react"
import { SignParamButton } from "./SignParamButton"

type SignParamErc20TokenButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  asset: { name: string; symbol: string; decimals: number }
  address: string
  withIcon?: boolean
  className?: string
}

export const SignParamErc20TokenButton: FC<SignParamErc20TokenButtonProps> = ({
  address,
  network,
  withIcon,
  asset,
  className,
}) => {
  return (
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      withIcon={withIcon}
      className={className}
      iconPrefix={<TokenLogo />}
    >
      <span>{asset.symbol}</span>
    </SignParamButton>
  )
}

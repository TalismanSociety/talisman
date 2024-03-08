import { CustomEvmNetwork, EvmAddress, EvmNetwork } from "@extension/core"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { useErc20Token } from "@ui/hooks/useErc20Token"
import { FC } from "react"

import { SignParamButton } from "./SignParamButton"

type SignParamErc20TokenButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  asset: { symbol?: string }
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
  const token = useErc20Token(network.id, address as EvmAddress)

  return (
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      withIcon={withIcon}
      className={className}
      iconPrefix={<AssetLogo id={token?.id} />}
    >
      <span>{asset.symbol}</span>
    </SignParamButton>
  )
}

import { EthNetwork } from "@talismn/chaindata-provider"
import { EvmAddress } from "extension-core"
import { FC } from "react"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useErc20Token } from "@ui/hooks/useErc20Token"

import { SignParamButton } from "./SignParamButton"

type SignParamErc20TokenButtonProps = {
  network: EthNetwork
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
      explorerUrl={network.blockExplorerUrls[0]}
      address={address}
      withIcon={withIcon}
      className={className}
      iconPrefix={<TokenLogo tokenId={token?.id} />}
    >
      <span>{asset.symbol}</span>
    </SignParamButton>
  )
}

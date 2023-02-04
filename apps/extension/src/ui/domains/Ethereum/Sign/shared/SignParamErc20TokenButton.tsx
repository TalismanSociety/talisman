import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { Erc20Token } from "@core/domains/tokens/types"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import useTokens from "@ui/hooks/useTokens"
import { FC, useMemo } from "react"

import { SignParamButton } from "./SignParamButton"

type SignParamErc20TokenButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  asset: { name: string; symbol: string; decimals: number; image?: string }
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
  const { tokens } = useTokens(true)
  const token = useMemo(() => {
    return network
      ? (tokens?.find(
          (t) =>
            t.type === "evm-erc20" &&
            t.evmNetwork?.id === network.id &&
            t.contractAddress === address
        ) as Erc20Token)
      : null
  }, [network, tokens, address])

  return (
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      withIcon={withIcon}
      className={className}
      iconPrefix={
        <AssetLogo id={token?.id} erc20={{ evmNetworkId: network.id, contractAddress: address }} />
      }
    >
      <span>{asset.symbol}</span>
    </SignParamButton>
  )
}

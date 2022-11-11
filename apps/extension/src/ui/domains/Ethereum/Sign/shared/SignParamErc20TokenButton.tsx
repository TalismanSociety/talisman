import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { Erc20Token } from "@core/domains/tokens/types"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import useTokens from "@ui/hooks/useTokens"
import { FC, useMemo } from "react"
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
  const tokens = useTokens()
  const token = useMemo(() => {
    return network
      ? (tokens?.find(
          (t) =>
            t.type === "erc20" &&
            Number(t.evmNetwork?.id) === Number(network.id) &&
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
      iconPrefix={<TokenLogo tokenId={token?.id} />} // TODO correct image from coingecko
    >
      <span>{asset.symbol}</span>
    </SignParamButton>
  )
}

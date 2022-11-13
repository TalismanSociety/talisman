import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { Erc20Token } from "@core/domains/tokens/types"
import { TokenImage, TokenLogo } from "@ui/domains/Asset/TokenLogo"
import useTokens from "@ui/hooks/useTokens"
import { FC, useMemo } from "react"
import { SignParamButton } from "./SignParamButton"
import genericTokenSvgIcon from "@talisman/theme/icons/custom-token-generic.svg?url"
import { getBase64ImageUrl } from "talisman-utils"
import { useErc20TokenImageUrl } from "@ui/hooks/useErc20TokenDisplay"
const genericTokenIconUrl = getBase64ImageUrl(genericTokenSvgIcon)

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
  // info from coingecko
  const qTokenImageUrl = useErc20TokenImageUrl(network?.id, address)

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
      iconPrefix={
        // priority to custom token icon, then coingecko, then generic
        token ? (
          <TokenLogo tokenId={token?.id} />
        ) : (
          <TokenImage
            src={qTokenImageUrl.isLoading ? null : qTokenImageUrl.data ?? genericTokenIconUrl}
          />
        )
      }
    >
      <span>{asset.symbol}</span>
    </SignParamButton>
  )
}

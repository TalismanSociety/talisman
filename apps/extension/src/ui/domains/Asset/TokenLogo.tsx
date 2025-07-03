import { evmErc20TokenId, EvmUniswapV2Token } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC } from "react"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { useToken } from "@ui/state"

export const TokenLogo: FC<{
  tokenId?: string
  className?: string
}> = ({ className, tokenId }) => {
  const token = useToken(tokenId)

  return token?.type === "evm-uniswapv2" ? (
    <LpTokenLogo token={token} className={className} />
  ) : (
    <AssetLogo tokenId={tokenId} url={token?.logo} className={className} />
  )
}

// constants to prevent re-renders
const STYLE_LP_TOKEN0 = { clipPath: "polygon(0% 0%, 48% 0%, 48% 100%, 0% 100%)" }
const STYLE_LP_TOKEN1 = { clipPath: "polygon(100% 0%, 52% 0%, 52% 100%, 100% 100%)" }

const LpTokenLogo: FC<{ token: EvmUniswapV2Token; className?: string }> = ({
  className,
  token,
}) => {
  const token0 = useToken(evmErc20TokenId(token.networkId, token.tokenAddress0))
  const token1 = useToken(evmErc20TokenId(token.networkId, token.tokenAddress1))

  return (
    <div className={classNames("relative block aspect-square w-[1em] shrink-0", className)}>
      <AssetLogo
        tokenId={token0?.id}
        url={token0?.logo}
        className="absolute h-full w-full"
        style={STYLE_LP_TOKEN0}
      />
      <AssetLogo
        tokenId={token1?.id}
        url={token1?.logo}
        className="absolute h-full w-full"
        style={STYLE_LP_TOKEN1}
      />
    </div>
  )
}

import {
  type EvmUniswapV2Token,
  evmErc20TokenId,
  type SubGammaToken,
} from "@talismn/chaindata-provider"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const TokenLogo: FC<{
  tokenId?: string
  className?: string
}> = ({ className, tokenId }) => {
  const token = useToken(tokenId)

  if (token?.type === "evm-uniswapv2") return <LpTokenLogo token={token} className={className} />
  if (token?.type === "substrate-gamma")
    return <GammaTokenLogo token={token} className={className} />

  return <AssetLogo tokenId={tokenId} url={token?.logo} className={className} />
}

const GammaTokenLogo: FC<{ token: SubGammaToken; className?: string }> = ({ className, token }) => {
  const { t } = useTranslation()

  return (
    <div className={cn("relative block aspect-square w-[1em] shrink-0", className)}>
      <AssetLogo tokenId={token.id} url={token.logo} className="h-full w-full" />
      <span
        role="img"
        aria-label={t("Gamma credits")}
        className="absolute -right-[0.15em] -bottom-[0.15em] flex size-[1.25em] items-center justify-center rounded-full border border-black bg-primary font-bold text-[0.4em] text-black leading-none before:content-['γ']"
      />
    </div>
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
    <div className={cn("relative block aspect-square w-[1em] shrink-0", className)}>
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

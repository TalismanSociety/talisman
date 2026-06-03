import type { TokenDto, YieldDto } from "@core/domains/earn/exports"
import { InfoIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { type FC, useMemo } from "react"

import { useGetYieldxyzToken } from "../hooks/useGetYieldxyzToken"

const getRewardTokenKey = (token: TokenDto) =>
  [
    token.network,
    token.address?.toLowerCase() ?? `${token.symbol}:${token.name}`,
    token.isPoints ? "points" : "token",
  ]
    .filter(Boolean)
    .join(":")

export const YieldxyzProductYieldDisplay: FC<{ product: YieldDto }> = ({ product }) => {
  const text = useMemo(() => {
    if (!product) return null

    const percent = Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(product.rewardRate.total)

    return `${percent} ${product.rewardRate.rateType}`
  }, [product])

  const { getYieldxyzToken } = useGetYieldxyzToken()

  const rewards = useMemo(() => {
    return (
      product?.rewardRate.components.map((component) => ({
        ...component,
        talismanToken: getYieldxyzToken(component.token),
      })) ?? []
    )
  }, [product, getYieldxyzToken])

  const showTooltip = new Set(rewards.map((reward) => getRewardTokenKey(reward.token))).size > 1

  if (!text) return null

  if (!showTooltip) {
    return <div className="text-primary">{text}</div>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 text-primary">
          <span>{text}</span>
          <InfoIcon className="inline-block size-6" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex min-w-37.5 flex-col gap-2 text-body">
          {rewards.map((reward, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: legacy
            <div key={idx}>
              <div className="flex items-center gap-2">
                {reward.talismanToken ? (
                  <TokenLogo
                    className="size-[1.2em] text-[1.2em]"
                    tokenId={reward.talismanToken.id}
                  />
                ) : (
                  <AssetLogo className="size-[1.2em] text-[1.2em]" url={reward.token.logoURI} />
                )}
                {reward.talismanToken ? (
                  <TokenDisplaySymbol tokenId={reward.talismanToken.id} />
                ) : (
                  <div>{reward.token.symbol}</div>
                )}
                <div className="grow"></div>
                <div>
                  {Intl.NumberFormat(undefined, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  }).format(reward.rate)}{" "}
                  {reward.rateType}
                </div>
              </div>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

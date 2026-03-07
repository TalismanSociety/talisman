import type { YieldDto } from "@core/domains/earn/exports"
import { InfoIcon } from "@talismn/icons"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import { type FC, useMemo } from "react"

import { useGetYieldxyzToken } from "../hooks/useGetYieldxyzToken"

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

  if (!text) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-[0.3rem] text-body">
          <InfoIcon className="inline-block size-[1.2rem] align-sub" />
          <span>{text}</span>
        </div>
      </TooltipTrigger>
      {!!rewards.length && (
        <TooltipContent>
          <div className="flex min-w-[15rem] flex-col gap-2 text-body">
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
      )}
    </Tooltip>
  )
}

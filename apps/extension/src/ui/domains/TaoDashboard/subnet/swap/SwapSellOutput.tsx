import { cn, planckToTokens } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSwapSell } from "./SwapSellProvider"

export const SwapSellOutput = () => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
      <div className="flex h-20 w-full items-center justify-between gap-6 overflow-hidden text-[1.25rem]">
        <div className="grow truncate">
          <ValueOutEstimate />
        </div>
        <TokenOutDisplay />
      </div>
    </div>
  </div>
)

const ValueOutEstimate = () => {
  const { tokenOut, valueOut, isLoading, valueIn } = useSwapSell()

  const displayValue = useMemo(() => {
    if (!valueIn) return "0"
    return tokenOut && typeof valueOut === "bigint"
      ? planckToTokens(String(valueOut), tokenOut.decimals)
      : "0"
  }, [tokenOut, valueOut, valueIn])

  return (
    <span
      className={cn(
        "text-body-disabled",
        !!valueIn && isLoading && "animate-pulse rounded-xs bg-body-disabled",
        !!valueIn && !isLoading && "text-white"
      )}
    >
      {displayValue} {tokenOut?.symbol}
    </span>
  )
}

const TokenOutDisplay = () => {
  const { tokenOut } = useSwapSell()
  const { t } = useTranslation()

  if (!tokenOut) return null

  return (
    <div className="flex items-center gap-4">
      <TokenLogo className="text-xl" tokenId={tokenOut.id} />
      <div className="flex flex-col items-start gap-1">
        <div className="text-base text-body">{tokenOut.symbol ?? t("TAO")}</div>
        <div className="text-body-secondary text-xs">{t("Native")}</div>
      </div>
    </div>
  )
}

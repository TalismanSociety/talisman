import { ChevronDownIcon } from "@talismn/icons"
import { cn, planckToTokens, tokensToPlanck } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { type ChangeEventHandler, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardSubnetPickerModal } from "../TaoDashboardSubnetPickerModal"
import { useSwapSell } from "./SwapSellProvider"

export const SwapSellOutput = () => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
      <div className="flex h-20 w-full items-center justify-between gap-6 overflow-hidden text-[2rem]">
        <div className="grow truncate">
          <ValueOutEstimate />
        </div>
        <TokenOutDisplay />
      </div>
    </div>
  </div>
)

const ValueOutEstimate = () => {
  const { tokenOut, valueOut, isLoading, valueIn, editingField, onValueOutChange } = useSwapSell()
  const { t } = useTranslation()

  const formattedValueOut = useMemo(() => {
    if (!valueIn && editingField !== "output") return ""
    return tokenOut && typeof valueOut === "bigint"
      ? planckToTokens(String(valueOut), tokenOut.decimals)
      : ""
  }, [tokenOut, valueOut, valueIn, editingField])

  const [inputValue, setInputValue] = useState(formattedValueOut)

  useEffect(() => {
    if (editingField !== "output") {
      setInputValue(formattedValueOut)
    }
  }, [formattedValueOut, editingField])

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const nextValue = e.target.value
      setInputValue(nextValue)

      if (!tokenOut || !nextValue.trim()) return onValueOutChange(null)

      try {
        const plancks = tokensToPlanck(nextValue, tokenOut.decimals)
        onValueOutChange(BigInt(plancks))
      } catch {
        onValueOutChange(null)
      }
    },
    [onValueOutChange, tokenOut]
  )

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={t("Enter Amount")}
      step="any"
      value={inputValue}
      className={cn(
        "inline-block w-full text-ellipsis bg-transparent text-[2rem] text-body-disabled placeholder:text-body-disabled",
        editingField !== "output" &&
          !!valueIn &&
          isLoading &&
          "animate-pulse rounded-xs bg-body-disabled",
        editingField !== "output" && !!valueIn && !isLoading && "text-white",
        editingField === "output" && "text-white"
      )}
      onChange={handleChange}
    />
  )
}

const TokenOutDisplay = () => {
  const { tokenOut, netuid } = useSwapSell()
  const { t } = useTranslation()
  const { open } = useTaoDashboardSubnetPickerModal()

  const handleClick = useCallback(() => {
    open({ netuid })
  }, [open, netuid])

  if (!tokenOut) return null

  return (
    <button type="button" onClick={handleClick} className="flex items-center gap-4">
      <TokenLogo className="text-xl" tokenId={tokenOut.id} />
      <div className="flex flex-col items-start gap-1">
        <div className="text-base text-body">{tokenOut.symbol ?? t("TAO")}</div>
        <div className="text-body-secondary text-xs">{t("Native")}</div>
      </div>
      <ChevronDownIcon className="size-[16px]" />
    </button>
  )
}

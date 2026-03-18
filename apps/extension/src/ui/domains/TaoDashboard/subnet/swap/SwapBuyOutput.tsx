import { ChevronDownIcon } from "@talismn/icons"
import { cn, planckToTokens, tokensToPlanck } from "@talismn/util"
import { PillButton } from "@ui/components/PillButton"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { type ChangeEventHandler, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardSubnetPickerModal } from "../TaoDashboardSubnetPickerModal"
import { SelectValidatorPill } from "./SelectValidatorPill"
import { useSwapBuy } from "./SwapBuyProvider"

export const SwapBuyOutput = () => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
      <div className="flex h-20 w-full items-center justify-between gap-6 overflow-hidden text-[2rem]">
        <div className="grow truncate">
          <ValueOutEstimate />
        </div>
        <TokenOutPickerButton />
      </div>
    </div>
    <div className="flex w-full items-center justify-end">
      <TokenOutValidatorPill />
    </div>
  </div>
)

const TokenOutValidatorPill = () => {
  const { netuid, hotkey, onHotkeyChange } = useSwapBuy()

  return <SelectValidatorPill netuid={netuid} hotkey={hotkey} onSelect={onHotkeyChange} />
}

const ValueOutEstimate = () => {
  const { tokenOutGeneric, valueOut, isLoading, valueIn, editingField, onValueOutChange } =
    useSwapBuy()
  const { t } = useTranslation()

  const formattedValueOut = useMemo(() => {
    if (!valueIn && editingField !== "output") return ""
    return tokenOutGeneric && typeof valueOut === "bigint"
      ? planckToTokens(String(valueOut), tokenOutGeneric.decimals)
      : ""
  }, [tokenOutGeneric, valueOut, valueIn, editingField])

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

      if (!tokenOutGeneric || !nextValue.trim()) return onValueOutChange(null)

      try {
        const plancks = tokensToPlanck(nextValue, tokenOutGeneric.decimals)
        onValueOutChange(BigInt(plancks))
      } catch {
        onValueOutChange(null)
      }
    },
    [onValueOutChange, tokenOutGeneric]
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

const TokenOutPickerButton = () => {
  const { tokenOutGeneric: token } = useSwapBuy()
  const { t } = useTranslation()
  const { open } = useTaoDashboardSubnetPickerModal()

  const handleClick = useCallback(() => {
    if (!token) return
    open({ netuid: token.netuid })
  }, [token, open])

  if (!token) return null

  return (
    <PillButton onClick={handleClick} className="bg-transparent">
      <div className="flex items-center gap-4">
        <TokenLogo className="text-xl" tokenId={token.id} />
        <div className="flex flex-col items-start gap-1">
          <div className="text-base text-body">SN{token.netuid}</div>
          <div className="text-body-secondary text-xs">
            {token.subnetName ?? t("Subnet {{netuid}}", { netuid: token.netuid })}
          </div>
        </div>
        <ChevronDownIcon className="size-[16px]" />
      </div>
    </PillButton>
  )
}

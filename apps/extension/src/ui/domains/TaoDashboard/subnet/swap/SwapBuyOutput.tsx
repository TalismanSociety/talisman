import { cn, planckToTokens } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { PillButton } from "@ui/talisman-ui"
import { useCallback, useMemo } from "react"
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
  const { tokenOutGeneric, valueOut, isLoading, valueIn } = useSwapBuy()

  // TODO fix existing bug where valueOut is 0n while recomputing, in useBittensorStakingPayload.ts
  const displayValue = useMemo(() => {
    if (!valueIn) return "0"
    return tokenOutGeneric && typeof valueOut === "bigint"
      ? planckToTokens(String(valueOut), tokenOutGeneric.decimals)
      : "123.123456789" // placeholder while loading, not visible (see below)
  }, [tokenOutGeneric, valueOut, valueIn])

  return (
    <span
      className={cn(
        "text-body-disabled",
        !!valueIn && isLoading && "animate-pulse rounded-xs bg-body-disabled",
        !!valueIn && !isLoading && "text-white"
      )}
    >
      {displayValue} {tokenOutGeneric?.symbol}
    </span>
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
      </div>
    </PillButton>
  )
}

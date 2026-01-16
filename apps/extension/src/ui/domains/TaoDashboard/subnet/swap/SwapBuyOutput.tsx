import { cn } from "@talismn/util"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"
import { useTaoDashboardSubnetPickerModal } from "../TaoDashboardSubnetPickerModal"
import { SelectValidatorPill } from "./SelectValidatorPill"
import { useSwapBuy } from "./SwapBuyProvider"

export const SwapBuyOutput = () => (
  <div className="flex w-full flex-col gap-5 overflow-hidden">
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded bg-black p-6">
      <div className="flex h-20 w-full items-center justify-between gap-6 overflow-hidden text-[2rem]">
        <ValueOutEstimate />
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
  const { toTokenId, valueOut, isLoading, valueIn } = useSwapBuy()

  if (isLoading)
    return (
      <TokensAndFiat
        noFiat
        noCountUp
        tokenId={toTokenId}
        planck={50_123_456_789n}
        className="animate-pulse rounded-xs bg-body-disabled text-body-disabled"
      />
    )

  return (
    <TokensAndFiat
      noFiat
      noCountUp
      tokenId={toTokenId}
      planck={valueOut}
      className={cn(valueIn === null && "text-body-disabled")}
    />
  )
}

const TokenOutPickerButton = () => {
  const { toToken: token } = useSwapBuy()
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

import { cn, planckToTokens } from "@talismn/util"
import { Modal } from "@ui/components/Modal"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { type FC, memo, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import { useSwap } from "../SwapProvider"
import type { BaseQuote } from "../swap-modules/common.swap-module"

export const SwapProviderPickerModal: FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const {
    sortedQuotes,
    selectedProtocol,
    selectedSubProtocol,
    setSelectedProtocol,
    setSelectedSubProtocol,
  } = useSwap()

  const handleSelect = useCallback(
    (quote: BaseQuote) => {
      setSelectedProtocol(quote.protocol)
      setSelectedSubProtocol(quote.subProtocol)
      onClose()
    },
    [setSelectedProtocol, setSelectedSubProtocol, onClose]
  )

  return (
    <Modal containerId="swap-modal" isOpen={isOpen} onDismiss={onClose}>
      <WizardModalDialog title={t("Provider")} onBackClick={onClose}>
        <div className="flex flex-col gap-[12px]">
          {sortedQuotes.map(({ quote, fees }, idx) => {
            const isSelected =
              selectedProtocol === quote.protocol &&
              (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)

            return (
              <SwapProviderQuoteButton
                key={`${quote.protocol}-${quote.subProtocol ?? ""}`}
                quote={quote}
                fees={fees}
                isSelected={isSelected}
                isBestRate={idx === 0}
                onClick={() => handleSelect(quote)}
              />
            )
          })}
        </div>
      </WizardModalDialog>
    </Modal>
  )
}

const SwapProviderQuoteButton: FC<{
  quote: BaseQuote
  fees: number
  isSelected: boolean
  isBestRate: boolean
  onClick: () => void
}> = memo(({ quote, fees, isSelected, isBestRate, onClick }) => {
  const { t } = useTranslation()
  const { fromTokenId, toTokenId, fromAmount } = useSwap()
  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

  const toFiat = useFiatValueForAmount({
    planck: quote.outputAmountBN,
    tokenId: toTokenId ?? undefined,
  })

  const toAmountFormatted = useMemo(() => {
    if (!toToken) return null
    return planckToTokens(quote.outputAmountBN.toString(), toToken.decimals)
  }, [toToken, quote.outputAmountBN])

  const exchangeRate = useMemo(() => {
    if (!fromAmount || !fromToken || !toToken) return undefined
    const toNum = Number(planckToTokens(quote.outputAmountBN.toString(), toToken.decimals) ?? "0")
    const fromNum = Number(planckToTokens(fromAmount.toString(), fromToken.decimals) ?? "1")
    const res = toNum / (fromNum || 1)
    if (res < 0.0001) return "0"
    return res.toString()
  }, [fromAmount, fromToken, toToken, quote.outputAmountBN])

  if (!toToken || !fromToken) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col justify-between rounded-[12px] bg-grey-900 px-[12px] py-[10px] transition-colors hover:bg-grey-800"
    >
      {/* Top row: provider info + badge + radio */}
      <div className="flex w-full items-start justify-between">
        <div className="flex flex-col items-start gap-[10px]">
          <div className="flex items-center gap-[8px]">
            <img src={quote.providerLogo} alt="" className="size-[24px] shrink-0 rounded-full" />
            <span className="font-semibold text-[14px] text-white">{quote.providerName}</span>
          </div>
          <div className="flex items-center gap-[4px]">
            <Tokens
              className="font-semibold text-[14px] text-white"
              amount={toAmountFormatted}
              symbol={toToken.symbol}
              noCountUp
            />
            {toFiat !== null && (
              <span className="text-[12px] text-body-secondary">
                ≈ <Fiat amount={toFiat} noCountUp />
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          {isBestRate && (
            <div className="rounded-[24px] bg-[rgba(108,252,105,0.1)] px-[8px] py-[6px]">
              <span className="whitespace-nowrap text-[#ddff76] text-[11px]">{t("Best Rate")}</span>
            </div>
          )}
          <RadioIndicator selected={isSelected} />
        </div>
      </div>

      {/* Bottom row: rate, fee, time */}
      <div className="mt-[10px] flex w-full items-center gap-[24px]">
        <div className="flex flex-col items-start gap-[2px]">
          <span className="text-[10px] text-body-disabled">{t("Rate")}</span>
          <span className="text-[10px] text-white">
            1 {fromToken.symbol} ={" "}
            <Tokens amount={exchangeRate} symbol={toToken.symbol} noCountUp />
          </span>
        </div>
        <div className="flex flex-col items-start gap-[2px]">
          <span className="text-[10px] text-body-disabled">{t("Fee")}</span>
          <span className="text-[10px] text-white">
            <Fiat amount={fees} noCountUp />
          </span>
        </div>
        <div className="flex flex-col items-start gap-[2px]">
          <span className="text-[10px] text-body-disabled">{t("Time")}</span>
          <SpeedIndicator timeInSec={quote.timeInSec} />
        </div>
      </div>
    </button>
  )
})

const RadioIndicator: FC<{ selected: boolean }> = ({ selected }) => (
  <div className="flex size-[20px] items-center justify-center">
    {selected ? (
      <div className="flex size-[20px] items-center justify-center rounded-full bg-primary">
        <div className="size-[8px] rounded-full bg-black" />
      </div>
    ) : (
      <div className="size-[20px] rounded-full border-[2px] border-body-disabled" />
    )}
  </div>
)

const SpeedIndicator: FC<{
  timeInSec: number
  className?: string
}> = ({ timeInSec, className }) => {
  const activeBars = useMemo(() => {
    if (timeInSec < 60) return 3
    if (timeInSec < 300) return 2
    return 1
  }, [timeInSec])

  return (
    <div className={cn("flex items-end gap-[3px]", className)}>
      <div className={cn("h-[5px] w-[4px] rounded-[16px] bg-[#cbfe60]/60")} />
      <div
        className={cn(
          "h-[8px] w-[4px] rounded-[16px] bg-[#cbfe60]/80",
          activeBars < 2 && "opacity-20 grayscale"
        )}
      />
      <div
        className={cn(
          "h-[10px] w-[4px] rounded-[16px] bg-[#cbfe60]",
          activeBars < 3 && "opacity-20 grayscale"
        )}
      />
    </div>
  )
}

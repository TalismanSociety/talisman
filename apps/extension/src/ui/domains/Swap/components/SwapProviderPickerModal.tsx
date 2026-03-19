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
import { formatSwapDuration, formatSwapExchangeRate } from "../swap-utils"

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
          {sortedQuotes.map(({ quote }, idx) => {
            const isSelected =
              selectedProtocol === quote.protocol &&
              (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)

            return (
              <SwapProviderQuoteButton
                key={`${quote.protocol}-${quote.subProtocol ?? ""}`}
                quote={quote}
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
  isSelected: boolean
  isBestRate: boolean
  onClick: () => void
}> = memo(({ quote, isSelected, isBestRate, onClick }) => {
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
    return (
      formatSwapExchangeRate({
        fromAmount,
        fromDecimals: fromToken.decimals,
        fromSymbol: fromToken.symbol,
        toDecimals: toToken.decimals,
        toSymbol: toToken.symbol,
        outputAmountBN: quote.outputAmountBN,
      }) ?? t("N/A")
    )
  }, [fromAmount, fromToken, toToken, quote.outputAmountBN, t])

  const duration = useMemo(
    () => formatSwapDuration(quote.timeInSec, t("Instant")),
    [quote.timeInSec, t]
  )

  if (!toToken || !fromToken) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col justify-between gap-4 rounded bg-grey-900 px-6 py-5 transition-colors hover:bg-grey-800",
        isSelected && "bg-grey-800"
      )}
    >
      {/* Top row: provider info + badge + radio */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={quote.providerLogo} alt="" className="size-12 shrink-0 rounded-full" />
          <span className="font-semibold text-[14px] text-white">{quote.providerName}</span>
        </div>
        <div className="flex items-center gap-[8px]">
          {isBestRate && (
            <div className="flex h-10 items-center rounded-full bg-[rgba(108,252,105,0.1)] px-4">
              <span className="whitespace-nowrap text-[#ddff76] text-[11px]">{t("Best Rate")}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-[4px]">
        <Tokens
          className="font-semibold text-[14px] text-white"
          amount={toAmountFormatted}
          symbol={toToken.symbol}
          noCountUp
        />
        {toFiat !== null && (
          <span className="text-body-secondary text-xs">
            ≈ <Fiat amount={toFiat} noCountUp />
          </span>
        )}
      </div>

      {/* Bottom row: rate, fee, time */}
      <div className="mt-[10px] flex w-full items-center gap-[24px]">
        <div className="flex flex-col items-start gap-[2px]">
          <span className="text-body-disabled text-xs">{t("Rate")}</span>
          <span className="text-white text-xs">{exchangeRate}</span>
        </div>

        <div className="flex flex-col items-start gap-[2px]">
          <span className="text-body-disabled text-xs">{t("Time")}</span>
          <span className="text-white text-xs">{duration}</span>
          {/* <SpeedIndicator timeInSec={quote.timeInSec} /> */}
        </div>
      </div>
    </button>
  )
})

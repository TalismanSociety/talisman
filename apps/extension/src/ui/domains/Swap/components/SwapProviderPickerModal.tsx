import type { BaseQuote } from "@core/domains/swaps/types"
import { formatDecimals, planckToTokens } from "@talismn/util"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type FC, memo, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Shortfall } from "../hooks/quote-sorting"
import { useFiatValueForAmount } from "../hooks/useFiatValueForAmount"
import { useSwap } from "../SwapProvider"
import { formatSwapDuration, formatSwapExchangeRate } from "../swap-utils"

export const SwapProviderPickerModal: FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  const { t } = useTranslation()
  const { sortedQuotes, selectedProtocol, selectedSubProtocol, pickQuote } = useSwap()

  const handleSelect = useCallback(
    (quote: BaseQuote) => {
      pickQuote(quote)
      onClose()
    },
    [pickQuote, onClose]
  )

  return (
    <Modal
      analyticsId="swap_provider_picker"
      containerId="swap-modal"
      isOpen={isOpen}
      onDismiss={onClose}
    >
      <ModalDialog variant="wizard" title={t("Provider")} onBackClick={onClose}>
        <div className="flex flex-col gap-[12px]">
          {sortedQuotes.map(({ quote, shortfall }, idx) => {
            const isSelected =
              selectedProtocol === quote.protocol &&
              (quote.subProtocol ? quote.subProtocol === selectedSubProtocol : true)

            return (
              <SwapProviderQuoteButton
                key={`${quote.protocol}-${quote.subProtocol ?? ""}`}
                quote={quote}
                isSelected={isSelected}
                isBestRate={idx === 0 && !shortfall}
                shortfall={shortfall}
                onClick={() => handleSelect(quote)}
              />
            )
          })}
        </div>
      </ModalDialog>
    </Modal>
  )
}

const SwapProviderQuoteButton: FC<{
  quote: BaseQuote
  isSelected: boolean
  isBestRate: boolean
  shortfall: Shortfall | null
  onClick: () => void
}> = memo(({ quote, isSelected, isBestRate, shortfall, onClick }) => {
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
      disabled={!!shortfall}
      className={cn(
        "flex w-full flex-col gap-4 rounded bg-grey-900 px-6 py-5 transition-colors enabled:hover:bg-grey-800 disabled:cursor-not-allowed",
        isSelected && "bg-grey-800"
      )}
    >
      <div className={cn("flex w-full flex-col justify-between gap-4", shortfall && "opacity-50")}>
        {/* Top row: provider info + badge + radio */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={quote.providerLogo} alt="" className="size-12 shrink-0 rounded-full" />
            <span className="font-semibold text-[14px] text-white">{quote.providerName}</span>
          </div>
          <div className="flex items-center gap-[8px]">
            {isBestRate && (
              <div className="flex h-10 items-center rounded-full bg-[rgba(108,252,105,0.1)] px-4">
                <span className="whitespace-nowrap text-[#ddff76] text-[11px]">
                  {t("Best Rate")}
                </span>
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
          </div>
        </div>
      </div>

      {shortfall && <ShortfallNotice shortfall={shortfall} />}
    </button>
  )
})

const ShortfallNotice: FC<{ shortfall: Shortfall }> = ({ shortfall }) => {
  const { t } = useTranslation()
  const token = useToken(shortfall.tokenId)
  if (!token) return null

  return (
    <div className="text-left text-alert-warn text-xs">
      {t("Needs {{amount}} {{symbol}} more to use this route", {
        amount: formatDecimals(planckToTokens(shortfall.planck.toString(), token.decimals)),
        symbol: token.symbol,
      })}
    </div>
  )
}

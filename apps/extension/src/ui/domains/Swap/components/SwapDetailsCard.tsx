import { ChevronRightIcon } from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { memo, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import type { BaseQuote } from "../swap-modules/common.swap-module"

export const SwapDetailsCard = memo(
  ({ quote, showBestRate }: { quote: BaseQuote; showBestRate?: boolean }) => {
    const { t } = useTranslation()

    const { setSelectedProtocol, setSelectedSubProtocol, toAsset, fromAsset, fromAmount } =
      useSwap()

    const amount = quote.outputAmountBN

    const toQuote = useMemo(() => {
      if (!amount || !fromAmount || !toAsset || !fromAsset) return undefined
      const toNum = Number(planckToTokens(amount.toString(), toAsset.decimals) ?? "0")
      const fromNum = Number(planckToTokens(fromAmount.toString(), fromAsset.decimals) ?? "1")
      const res = toNum / (fromNum || 1)
      if (res < 0.0001) return "0"
      return res.toString()
    }, [fromAmount, fromAsset, amount, toAsset])

    if (!toAsset) return null

    return (
      <button
        type="button"
        className="flex h-[64px] w-full items-center gap-[8px] rounded-[13px] bg-grey-900 px-[12px] transition-colors hover:bg-grey-800"
        onClick={() => {
          setSelectedProtocol(quote.protocol)
          setSelectedSubProtocol(quote.subProtocol)
        }}
      >
        <img
          src={quote.providerLogo}
          alt=""
          className="h-[32px] w-[32px] shrink-0 rounded-[20px]"
        />
        <div className="flex flex-1 flex-col items-start gap-[2px] overflow-hidden">
          <span className="truncate font-semibold text-[14px] text-white">
            {quote.providerName}
          </span>
          <span className="truncate text-[12px] text-body-secondary">
            1 {fromAsset?.symbol} = <Tokens amount={toQuote} symbol={toAsset?.symbol} noCountUp />
          </span>
        </div>
        {showBestRate && (
          <div className="shrink-0 rounded-[24px] bg-[rgba(108,252,105,0.1)] px-[8px] py-[4px]">
            <span className="whitespace-nowrap font-semibold text-[#ddff76] text-[11px]">
              {t("Best Rate")}
            </span>
          </div>
        )}
        <ChevronRightIcon className="h-[20px] w-[20px] shrink-0 text-body-secondary" />
      </button>
    )
  }
)

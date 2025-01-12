import { classNames } from "@talismn/util"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { IS_POPUP } from "@ui/util/constants"

import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { truncateToSignificantDigits } from "../../utils/truncateToSignificantDigits"
import { BuyTokensLayout } from "../BuyTokensLayout"
import { BuyTokensFiatAmountInput } from "./BuyTokensFiatAmountInput"
import { BuyTokensSelectAccountInput } from "./BuyTokensSelectAccountInput"
import { BuyTokensTokenAmountInput } from "./BuyTokensTokenAmountInput"

export const BuyTokensForm = () => {
  const { t } = useTranslation()
  const {
    supportedTokens,
    isBuyForm,
    isFormDisabled,

    buySellForm: { watch },
    submit,
  } = useBuyTokensWizard()

  const [{ symbol, chain }, fiatCurrency] = watch(["rampTokenAsset", "fiatCurrency"])

  const getTokenRateByCurrency = useCallback(
    ({ fiatCurrency, tokenId, chain }: { fiatCurrency: string; tokenId: string; chain: string }) =>
      supportedTokens.find((asset) => asset.symbol === tokenId && asset.chain === chain)?.price[
        fiatCurrency
      ],
    [supportedTokens],
  )

  const tokenRateByCurrency = useMemo(
    () =>
      getTokenRateByCurrency({
        fiatCurrency,
        tokenId: symbol,
        chain: chain,
      }),
    [getTokenRateByCurrency, fiatCurrency, chain, symbol],
  )

  return (
    <BuyTokensLayout title={t("Buy/Sell")} withBackLink>
      {/* TODO: check if this div is required after completion */}
      <div
        className={classNames(
          "text-body-secondary flex justify-center px-10 md:h-auto",
          IS_POPUP && "flex-col",
        )}
      >
        <form className="flex h-full w-full max-w-[47rem] flex-col" onSubmit={submit}>
          <div className="bg-black-secondary space-y-6 rounded-[16px] border-0 p-6">
            <div className="flex gap-4">
              <div className="font-bold text-white">{t("Step 1")}</div>
              <div>{t("Select asset")}</div>
            </div>
            <div className="text-xs">{isBuyForm ? t("You Pay") : t("You Sell")}</div>
            {isBuyForm ? <BuyTokensFiatAmountInput /> : <BuyTokensTokenAmountInput />}
            <div className="flex justify-between">
              <div className="text-xs">{t("You're receiving (estimate)")}</div>
              {symbol && (
                <div className="text-xs">{`1 ${symbol} ≈ ${truncateToSignificantDigits(tokenRateByCurrency ?? 0)} ${fiatCurrency || "$"}`}</div>
              )}
            </div>
            {isBuyForm ? <BuyTokensTokenAmountInput /> : <BuyTokensFiatAmountInput />}
          </div>
          <div className="bg-black-secondary mt-6 space-y-6 rounded-[16px] border-0 p-6">
            <div className="flex gap-4">
              <div className="font-bold text-white">{t("Step 2")}</div>
              <div>{t("Select account")}</div>
            </div>
            <div className="text-xs">{t("Deposit Account")}</div>
            <BuyTokensSelectAccountInput />
          </div>
          <Button
            type="submit"
            className="mt-[1.8rem] h-[46px] w-full rounded-[16px]"
            primary
            disabled={isFormDisabled}
          >
            {isBuyForm ? t("Buy with Ramp") : t("Sell with Ramp")}
          </Button>
        </form>
      </div>
    </BuyTokensLayout>
  )
}

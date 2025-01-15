import { ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useBuyTokensWizard } from "../../../useBuyTokensWizard"
import { truncateToSignificantDigits } from "../../../utils/truncateToSignificantDigits"
import { BuyTokensLayout } from "../../BuyTokensLayout"
import { BuyTokensFiatAmountInput } from "../BuyTokensFiatAmountInput"
import { BuyTokensNotAvailableDrawer } from "../BuyTokensNotAvailableDrawer"
import { BuyTokensSelectAccountInput } from "../BuyTokensSelectAccountInput"
import { BuyTokensTokenAmountInput } from "../BuyTokensTokenAmountInput"

export const BuyTokensForm = () => {
  const { t } = useTranslation()
  const {
    isRampNotSupported,
    supportedTokens,
    isBuyForm,
    isFormDisabled,
    close,
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
      <form
        className="text-body-secondary flex h-full w-full max-w-[47rem] flex-col px-10 pb-10"
        onSubmit={submit}
      >
        <div className="bg-black-secondary space-y-8 rounded-[16px] border-0 p-[12px]">
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
        <div className="bg-black-secondary mt-6 space-y-6 rounded-[16px] border-0 p-[12px]">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step 2")}</div>
            <div>{t("Select account")}</div>
          </div>
          <div className="text-xs">{t("Deposit Account")}</div>
          <BuyTokensSelectAccountInput />
        </div>
        {isRampNotSupported && (
          <BuyTokensNotAvailableDrawer
            containerId="buy-tokens-modal"
            isOpen={isRampNotSupported}
            onDismiss={close}
          />
        )}
        <Button
          type="submit"
          className={classNames("mt-auto w-full", isRampNotSupported && "cursor-not-allowed")}
          primary
          disabled={isFormDisabled}
        >
          <div className="flex items-center justify-center gap-2">
            {isRampNotSupported ? t("Not available") : t("Continue to Ramp")}
            {!isRampNotSupported && <ExternalLinkIcon />}
          </div>
        </Button>
      </form>
    </BuyTokensLayout>
  )
}

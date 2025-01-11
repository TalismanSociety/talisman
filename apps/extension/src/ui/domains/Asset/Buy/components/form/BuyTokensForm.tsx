import { classNames } from "@talismn/util"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { IS_POPUP } from "@ui/util/constants"

import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { truncateToSignificantDigits } from "../../utils/truncateToSignificantDigits"
import { BuyTokensLayout } from "../BuyTokensLayout"
import { BuyTokensConnectAccount } from "./BuyTokensConnectAccount"
import { BuyTokensFiatAmountInput } from "./BuyTokensFiatAmountInput"
import { BuyTokensTokenAmountInput } from "./BuyTokensTokenAmountInput"

export const BuyTokensForm = () => {
  const { t } = useTranslation()
  const {
    supportedTokens,
    isBuyForm,
    isFormDisabled,
    accountsWithBalance,
    buySellForm: { watch },
    submit,
    setRoute,
  } = useBuyTokensWizard()

  const [{ symbol, chain, isEvm }, fiatCurrency] = watch(["rampTokenAsset", "fiatCurrency"])

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
      <div
        className={classNames(
          "text-body-secondary flex justify-center md:h-auto",
          IS_POPUP && "flex-col",
        )}
      >
        <form className="flex h-full w-full max-w-[47rem] flex-col" onSubmit={submit}>
          {/* <RampOptionSwitchHeader setIsBuyForm={setIsBuyForm} /> */}
          <div className="md:border-grey-750 bg-black-secondary space-y-6 rounded-[16px] border-0 p-6 md:border-[1px] md:bg-inherit">
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
          <div className="md:border-grey-750 bg-black-secondary mt-6 space-y-6 rounded-[16px] border-0 p-6 md:border-[1px] md:bg-inherit">
            <div className="flex gap-4">
              <div className="font-bold text-white">{t("Step 2")}</div>
              <div>{t("Select account")}</div>
            </div>
            <div className="text-xs">{t("Deposit Account")}</div>
            {symbol && accountsWithBalance.length === 0 ? (
              <BuyTokensConnectAccount isEvm={isEvm} />
            ) : (
              <button onClick={() => setRoute("pickWallet")}>Select account</button>
              // <Dropdown
              //   items={accountsWithBalance.filter((acc) => acc.address !== selectedAccount?.address)}
              //   propertyKey="address"
              //   renderItem={(item) => <RampAccountOption account={item} />}
              //   onChange={handleAccountChange}
              //   placeholder={t("Select account")}
              //   value={selectedAccount}
              //   key={address} // uncontrolled component, will reset if value changes
              //   buttonClassName="bg-black-secondary h-full px-6 py-3 rounded-[12px]"
              //   optionClassName="px-6 py-3"
              //   className="border-grey-750 bg-black-secondary flex h-[5.5rem] rounded-[12px] border-[1px]"
              //   onClear={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
              //     e.stopPropagation()
              //     setValue("address", "", { shouldValidate: true })
              //   }}
              // />
            )}
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

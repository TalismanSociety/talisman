import { useTranslation } from "react-i18next"

import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { InputWithSideComponent } from "../InputWithSideComponent"
import { BuyTokensSelectFiatButton } from "./BuyTokensSelectFiatButton"

export const BuyTokensFiatAmountInput = () => {
  const { t } = useTranslation()
  const {
    isRampNotSupported,
    buySellForm: { register, watch, setValue },
    setDebouncedFiatAmount,
    isFiatAboveMinPurchaseAmount,
  } = useBuyTokensWizard()

  const [fiatCurrency, { minPurchaseAmount, symbol }] = watch(["fiatCurrency", "rampTokenAsset"])

  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = e.target.value
    setDebouncedFiatAmount(amount)

    if (!amount) {
      setValue("tokenAmount", 0, { shouldValidate: true })
    }

    setValue("dirtyAmountField", "fiatAmount", { shouldValidate: true })
  }

  return (
    <InputWithSideComponent
      inputFieldProps={register("fiatAmount")}
      inputFieldLabel={fiatCurrency || "$0"}
      inputType="number"
      inputPlaceholder="0"
      onInputChange={(e) => {
        handleFiatAmountChange(e)
        register("fiatAmount").onChange(e)
      }}
      sideComponent={<BuyTokensSelectFiatButton />}
      minStep="0.01"
      isDisabled={isRampNotSupported}
      errorMessage={
        !isFiatAboveMinPurchaseAmount
          ? t(`The minimum purchase amount for ${symbol} is ${minPurchaseAmount} ${fiatCurrency}`)
          : ""
      }
    />
  )
}

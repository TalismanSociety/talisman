import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { InputWithSideComponent } from "../InputWithSideComponent"
import { BuyTokensSelectTokenButton } from "./BuyTokensSelectTokenButton"

export const BuyTokensTokenAmountInput = () => {
  const {
    isRampNotSupported,
    setDebouncedTokenAmount,
    buySellForm: { setValue, register, watch },
  } = useBuyTokensWizard()

  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = e.target.value
    setDebouncedTokenAmount(amount)

    if (!amount) {
      setValue("fiatAmount", 0, { shouldValidate: true })
    }

    setValue("dirtyAmountField", "tokenAmount", { shouldValidate: true })
  }

  const { decimals } = watch("rampTokenAsset")

  return (
    <InputWithSideComponent
      inputFieldProps={register("tokenAmount")}
      inputType="number"
      inputPlaceholder="0"
      onInputChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        handleTokenAmountChange(e)
        register("tokenAmount").onChange(e)
      }}
      minStep={`1e-${decimals}`}
      sideComponent={<BuyTokensSelectTokenButton />}
      isDisabled={isRampNotSupported}
    />
  )
}

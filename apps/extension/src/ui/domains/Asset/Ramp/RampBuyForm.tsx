/* eslint-disable react/no-children-prop */
import { TokenId } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { createFormHook, createFormHookContexts } from "@tanstack/react-form"
import { FC, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { RampCurrencyPickerButton } from "./RampCurrencyPickerButton"
import { useRampBuyCurrencies } from "./useRampCurrencies"

type BuyFormData = {
  currency: string
  tokenId: TokenId
  amount: number
}

const DEFAULT_FORM_DATA: BuyFormData = {
  currency: "",
  tokenId: "",
  amount: 0,
}

export const { fieldContext, formContext, useFieldContext } = createFormHookContexts()

const { useAppForm: useRampBuyForm } = createFormHook({
  fieldContext,
  formContext,
  // We'll learn more about these options later
  fieldComponents: {},
  formComponents: {},
})

export const RampBuyForm = () => {
  const { t } = useTranslation()
  const form = useRampBuyForm({
    defaultValues: DEFAULT_FORM_DATA,
    onSubmit: ({ value }) => {
      // eslint-disable-next-line no-console
      console.log(value)
    },
  })

  const { currencies } = useRampBuyCurrencies()

  return (
    <form
      className="text-body-secondary flex h-full w-full max-w-[47rem] flex-col px-10 pb-10"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div className="bg-black-secondary space-y-8 rounded-[16px] border-0 p-[12px]">
        <div className="flex gap-4">
          <div className="font-bold text-white">{t("Step 1")}</div>
          <div>{t("Select asset")}</div>
        </div>
        <div className="text-xs">{t("You Pay")}</div>
        <RampNumberFieldContainer
          input={
            <form.Field
              name="amount"
              children={(field) => (
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                />
              )}
            />
          }
          button={
            <form.Field
              name="currency"
              children={(field) => (
                <RampCurrencyPickerButton
                  currencies={currencies}
                  onSelect={(currency) => field.handleChange(currency)}
                  value={field.state.value}
                />
              )}
            />
          }
        />

        {/* <RampFiatAmountInput /> */}
        {/* <div className="flex justify-between">
          <div className="text-xs">{t("You're receiving (estimate)")}</div>
          {symbol && (
            <div className="text-xs">{`1 ${symbol} ≈ ${truncateToSignificantDigits(tokenRateByCurrency ?? 0)} ${fiatCurrency || "$"}`}</div>
          )}
        </div>
        <RampTokenAmountInput /> */}
      </div>
      <div className="bg-black-secondary mt-6 space-y-6 rounded-[16px] border-0 p-[12px]">
        <div className="flex gap-4">
          <div className="font-bold text-white">{t("Step 2")}</div>
          <div>{t("Select account")}</div>
        </div>
        <div className="text-xs">{t("Deposit Account")}</div>
        {/* <RampAccountSelect /> */}
      </div>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}
        children={([canSubmit, isSubmitting]) => (
          <Button
            type="submit"
            className={classNames(
              "mt-auto w-full",
              //  isRampNotSupported && "cursor-not-allowed")
            )}
            primary
            icon={ExternalLinkIcon}
            disabled={!canSubmit}
            processing={isSubmitting}
          >
            {t("Continue to Ramp")}
          </Button>
        )}
      />
    </form>
  )
}

const RampNumberFieldContainer: FC<{
  input: ReactNode
  button: ReactNode
  errorMessage?: string
}> = ({ input, button, errorMessage }) => (
  <div>
    <div className="border-grey-750 bg-black-secondary flex h-[5.5rem] justify-between rounded-[12px] border-[1px] p-3 pl-8">
      <div className="flex flex-col justify-center">{input}</div>
      {button}
    </div>
    {errorMessage && <div className="text-tiny mt-1 text-red-500">{errorMessage}</div>}
  </div>
)

// const RampFiatAmountField = () => {
//   const { t } = useTranslation()
//   const field = useFieldContext<string>()

//   return (
//     <>
//       <div className="border-grey-750 bg-black-secondary flex h-[5.5rem] justify-between rounded-[12px] border-[1px] p-3 pl-8">
//         <div className="flex flex-col justify-center">
//           <input
//           // disabled={isDisabled}
//           // type={inputType}
//           // inputMode={inputType === "number" ? "decimal" : "text"}
//           // step={inputType === "number" ? (minStep ?? "0.01") : undefined}
//           // placeholder={inputPlaceholder}
//           // autoComplete="off"
//           // className={classNames(
//           //   "text-md peer w-[15rem] min-w-0 appearance-none border-none bg-transparent font-bold leading-none text-white md:max-w-fit",
//           //   isLoading && "text-body-disabled animate-pulse",
//           //   isDisabled && "cursor-not-allowed",
//           // )}
//           // {...inputFieldProps}
//           // onChange={onInputChange}
//           />
//         </div>
//         {sideComponent}
//       </div>
//       {errorMessage && <div className="text-tiny mt-1 text-red-500">{errorMessage}</div>}
//     </>
//   )
// }

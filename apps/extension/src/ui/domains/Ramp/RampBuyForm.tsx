import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, DropdownOptionRender } from "talisman-ui"
import * as yup from "yup"

import { useSelectedCurrency } from "@ui/state"

import { NumberInputWithDropDown } from "./NumberInputWithDropDown"

type FormData = {
  address: string
  fiatAmount: number
  tokenId: string
  fiatCurrencySymbol: string
}

type FiatCurrency = {
  fiatCurrencySymbol: string
  id: string
}

const schema = yup.object({
  address: yup.string().required(" "),
  fiatAmount: yup.number().required(" ").min(0),
  tokenId: yup.string().required(" "),
  fiatCurrencySymbol: yup.string().required(" "),
})

export const RampBuyForm = () => {
  const currency = useSelectedCurrency()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      fiatCurrencySymbol: currency.toUpperCase(),
    },
    resolver: yupResolver(schema),
  })

  const [fiatCurrencySymbol] = watch(["fiatCurrencySymbol"])
  // const submit = (data: FormData) => console.log({ data })
  const submit = (data: FormData) => data

  const handleFiatCurrencyChange = (fiatCurrency: FiatCurrency | null) => {
    setValue("fiatCurrencySymbol", fiatCurrency?.fiatCurrencySymbol ?? "")
  }

  const mockedFiatCurrencies = [
    { fiatCurrencySymbol: "USD", id: "A" },
    { fiatCurrencySymbol: "BRL", id: "B" },
  ]

  const selectedFiatCurrency = mockedFiatCurrencies.find(
    (curr) => curr.fiatCurrencySymbol === fiatCurrencySymbol,
  )

  const renderFiatCurrencyItem: DropdownOptionRender<FiatCurrency> = (item) => {
    return <div className="flex flex-col justify-center">{item.fiatCurrencySymbol}</div>
  }

  const { t } = useTranslation()
  return (
    <div className="text-body-secondary h-[30rem] w-[32rem] xl:w-[64rem]">
      <form onSubmit={handleSubmit(submit)}>
        <div className="border-grey-750 space-y-8 rounded-2xl border-[1px] p-6">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step1")}</div>
            <div>{t("Select Asset")}</div>
          </div>
          <div className="text-xs">{t("You Pay")}</div>

          <NumberInputWithDropDown
            inputFieldProps={register("fiatAmount")}
            inputFieldLabel={fiatCurrencySymbol}
            inputType="number"
            inputPlaceholder="100"
            propertyKey="fiatCurrencySymbol"
            placeholder={t("Select Currency")}
            items={mockedFiatCurrencies}
            value={selectedFiatCurrency}
            renderItem={renderFiatCurrencyItem}
            onChange={handleFiatCurrencyChange}
          />
        </div>
        <Button type="submit" primary disabled={!isValid}>
          {t("Continue")}
        </Button>
      </form>
    </div>
  )
}

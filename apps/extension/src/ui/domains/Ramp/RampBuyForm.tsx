import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, DropdownOptionRender } from "talisman-ui"
import * as yup from "yup"

import { useSelectedCurrency } from "@ui/state"

import { RampCurrency } from "./hooks/types"
import { useGetRampCurrencies } from "./hooks/useGetRampCurrencies"
import { NumberInputWithDropDown } from "./NumberInputWithDropDown"

type FormData = {
  address: string
  fiatAmount: number
  tokenId: string
  fiatCurrency: string
}

const schema = yup.object({
  address: yup.string().required(" "),
  fiatAmount: yup.number().required(" ").min(0),
  tokenId: yup.string().required(" "),
  fiatCurrency: yup.string().required(" "),
})

export const RampBuyForm = () => {
  const currency = useSelectedCurrency()
  const { data: rampCurrencies } = useGetRampCurrencies()

  const onrampCurrencies = rampCurrencies?.filter((curr) => curr.onrampAvailable) ?? []

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      fiatCurrency: currency.toUpperCase(),
    },
    resolver: yupResolver(schema),
  })

  const [fiatCurrency] = watch(["fiatCurrency"])
  // const submit = (data: FormData) => console.log({ data })
  const submit = (data: FormData) => data

  const handleFiatCurrencyChange = (fiatCurrency: RampCurrency | null) => {
    setValue("fiatCurrency", fiatCurrency?.fiatCurrency ?? "")
  }

  const selectedFiatCurrency = onrampCurrencies.find((curr) => curr.fiatCurrency === fiatCurrency)

  const renderFiatCurrencyItem: DropdownOptionRender<RampCurrency> = (item) => {
    return <div className="flex flex-col justify-center">{item.fiatCurrency}</div>
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
            inputFieldLabel={fiatCurrency}
            inputType="number"
            inputPlaceholder="100"
            propertyKey="fiatCurrency"
            placeholder={t("Select Currency")}
            items={onrampCurrencies}
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

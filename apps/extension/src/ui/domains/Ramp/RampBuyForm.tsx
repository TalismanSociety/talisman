import { yupResolver } from "@hookform/resolvers/yup"
import { classNames } from "@talismn/util"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, Dropdown, DropdownOptionRender } from "talisman-ui"
import * as yup from "yup"

const schema = yup.object({
  address: yup.string().required(" "),
  fiatAmount: yup.number().required(" ").min(0),
  tokenId: yup.string().required(" "),
  fiatCurrencySymbol: yup.string().required(" "),
})

export const RampBuyForm = () => {
  type FormData = {
    address: string
    fiatAmount: number
    tokenId: string
    fiatCurrencySymbol: string
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<FormData>({
    mode: "all",
    resolver: yupResolver(schema),
  })

  type FiatCurrency = {
    fiatCurrencySymbol: string
    id: string
  }

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
    return <div>{item.fiatCurrencySymbol}</div>
  }

  const { t } = useTranslation()
  return (
    <form className="h-[30rem] w-[32rem]" onSubmit={handleSubmit(submit)}>
      <div className="border-grey-750 rounded-2xl border-[1px] p-6">
        <div className="flex gap-4">
          <div>{t("Step1")}</div>
          <div>{t("Select Asset")}</div>
        </div>
        <div>{t("You Pay")}</div>
        <div className="flex gap-4">
          <input
            type="number"
            inputMode="decimal"
            placeholder="100"
            autoComplete="off"
            className={classNames(
              "text-secondary peer min-w-0 appearance-none border-none bg-transparent text-xl leading-none",
            )}
            {...register("fiatAmount")}
          />
          <Dropdown
            items={mockedFiatCurrencies}
            propertyKey="fiatCurrencySymbol"
            renderItem={renderFiatCurrencyItem}
            onChange={handleFiatCurrencyChange}
            placeholder={t("Select Currency")}
            value={selectedFiatCurrency}
            // key={address} // uncontrolled component, will reset if value changes
            className="w-full"
            buttonClassName="h-28"
            optionClassName="h-24 py-0"
          />
        </div>
      </div>
      <Button type="submit" primary disabled={!isValid}>
        {t("Continue")}
      </Button>
    </form>
  )
}

import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, DropdownOptionRender } from "talisman-ui"
import * as yup from "yup"

import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { useSelectedCurrency } from "@ui/state"

import { useGetRampAssetsByCurrency } from "./hooks/useGetRampAssetsByCurrency"
import { useGetRampCurrencies } from "./hooks/useGetRampCurrencies"
import { NumberInputWithDropDown } from "./NumberInputWithDropDown"
import { RampAsset, RampCurrency } from "./types"
import { truncateToSignificantDigits } from "./utils"

type FormData = {
  address: string
  fiatAmount: number
  fiatCurrency: string
  tokenId: string
  chain: string
  tokenAmount: number
}

const schema = yup.object({
  address: yup.string().required(" "),
  fiatAmount: yup.number().required(" ").min(0),
  tokenAmount: yup.number().required(" ").min(0),
  tokenId: yup.string().required(" "),
  fiatCurrency: yup.string().required(" "),
  chain: yup.string().required(" "),
})

export const RampBuyForm = () => {
  const currency = useSelectedCurrency()
  const [debouncedFiatAmount, setDebouncedFiatAmount] = useDebouncedState("", 300)
  const [debouncedTokenAmount, setDebouncedTokenAmount] = useDebouncedState("", 300)
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
      chain: "DOT",
      tokenId: "DOT",
    },
    resolver: yupResolver(schema),
  })
  const [fiatCurrency, tokenId, chain] = watch(["fiatCurrency", "tokenId", "chain"])

  const { data: rampCurrencies } = useGetRampCurrencies()
  const { data: rampCurrencyWithAssets } = useGetRampAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
  })

  const onrampCurrencies = rampCurrencies?.filter((curr) => curr.onrampAvailable) ?? []
  const tokenRateByCurrency = rampCurrencyWithAssets?.assets.find(
    (asset) => asset.symbol === tokenId && asset.chain === chain,
  )?.price[fiatCurrency]

  // const submit = (data: FormData) => console.log({ data })
  const submit = (data: FormData) => data

  const handleFiatCurrencyChange = (fiatCurrency: RampCurrency | null) => {
    setValue("fiatCurrency", fiatCurrency?.fiatCurrency ?? "")
  }

  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedFiatAmount(e.target.value)
  }

  const handleTokenChange = (rampAsset: RampAsset | null) => {
    setValue("tokenId", rampAsset?.symbol ?? "")
    setValue("chain", rampAsset?.chain ?? "")
  }

  const selectedFiatCurrency = onrampCurrencies.find((curr) => curr.fiatCurrency === fiatCurrency)
  const selectedToken = rampCurrencyWithAssets?.assets.find((asset) => asset.symbol === tokenId)

  const renderFiatCurrencyItem: DropdownOptionRender<RampCurrency> = (item) => {
    return <div className="flex flex-col justify-center">{item.fiatCurrency}</div>
  }
  const renderTokenItem: DropdownOptionRender<RampAsset> = (item) => {
    return <div className="flex flex-col justify-center">{item.symbol}</div>
  }

  const { t } = useTranslation()
  return (
    <div className="text-body-secondary h-[30rem] w-[32rem] xl:w-[64rem]">
      <form onSubmit={handleSubmit(submit)}>
        <div className="border-grey-750 space-y-6 rounded-2xl border-[1px] p-6">
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
            onInputChange={(e) => {
              // setDebouncedFiatAmount(e.target.value)
              handleFiatAmountChange(e)
              register("fiatAmount").onChange(e)
            }}
            propertyKey="fiatCurrency"
            placeholder={t("Select Currency")}
            items={onrampCurrencies}
            value={selectedFiatCurrency}
            renderItem={renderFiatCurrencyItem}
            onChange={handleFiatCurrencyChange}
          />
          <div className="flex justify-between">
            <div className="text-xs">{t("You're receiving (estimate)")}</div>
            <div className="text-xs">{`1 ${tokenId} ≈ ${truncateToSignificantDigits(tokenRateByCurrency ?? 0)} ${fiatCurrency}`}</div>
          </div>
          <NumberInputWithDropDown
            inputFieldProps={register("tokenAmount")}
            inputFieldLabel={"$"}
            inputType="string"
            inputPlaceholder="0"
            onInputChange={(e) => {
              setDebouncedTokenAmount(e.target.value)
              register("tokenAmount").onChange(e)
            }}
            propertyKey="address"
            placeholder={t("Select token")}
            items={rampCurrencyWithAssets?.assets ?? []}
            value={selectedToken}
            renderItem={renderTokenItem}
            onChange={handleTokenChange}
          />
        </div>
        <Button type="submit" primary disabled={!isValid}>
          {t("Continue")}
        </Button>
      </form>
    </div>
  )
}

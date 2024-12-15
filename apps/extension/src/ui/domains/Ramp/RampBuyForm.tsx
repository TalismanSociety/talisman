import { yupResolver } from "@hookform/resolvers/yup"
import React, { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, Dropdown, DropdownOptionRender } from "talisman-ui"
import * as yup from "yup"

import {
  AccountJsonAny,
  // activeChainsStore,
  // activeEvmNetworksStore,
  // activeTokensStore,
} from "@extension/core"
import { FormattedAddress } from "@ui/domains/Account/FormattedAddress"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { useAccounts, useSelectedCurrency } from "@ui/state"

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
  const accounts = useAccounts("portfolio")
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
  const [address, fiatCurrency, fiatAmount, tokenId, chain, tokenAmount] = watch([
    "address",
    "fiatCurrency",
    "fiatAmount",
    "tokenId",
    "chain",
    "tokenAmount",
  ])

  const { data: rampCurrencies } = useGetRampCurrencies()
  const { data: rampCurrencyWithAssets } = useGetRampAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId,
  })

  const getTokenRateByCurrency = useCallback(
    ({ fiatCurrency, tokenId, chain }: { fiatCurrency: string; tokenId: string; chain: string }) =>
      rampCurrencyWithAssets?.assets.find(
        (asset) => asset.symbol === tokenId && asset.chain === chain,
      )?.price[fiatCurrency],
    [rampCurrencyWithAssets?.assets],
  )

  const tokenRateByCurrency = useMemo(
    () => getTokenRateByCurrency({ fiatCurrency, tokenId, chain }),
    [getTokenRateByCurrency, fiatCurrency, tokenId, chain],
  )

  const submit = (data: FormData) => data

  const handleFiatCurrencyChange = (fiatCurrency: RampCurrency | null) => {
    const newFiatCurrency = fiatCurrency?.fiatCurrency ?? ""
    setValue("fiatCurrency", newFiatCurrency)

    const newTokenRate = getTokenRateByCurrency({ fiatCurrency: newFiatCurrency, tokenId, chain })
    const fiatAmount = (newTokenRate ?? 0) * tokenAmount
    setValue("fiatAmount", truncateToSignificantDigits(fiatAmount))
  }

  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedFiatAmount(e.target.value)
    const newTokenAmount = Number(e.target.value) / (tokenRateByCurrency ?? 0)
    setValue("tokenAmount", truncateToSignificantDigits(newTokenAmount))
  }

  const handleTokenChange = (rampAsset: RampAsset | null) => {
    setValue("tokenId", rampAsset?.symbol ?? "")
    setValue("chain", rampAsset?.chain ?? "")

    const newTokenRate = getTokenRateByCurrency({
      fiatCurrency,
      tokenId: rampAsset?.symbol ?? "",
      chain: rampAsset?.chain ?? "",
    })
    const newTokenAmount = fiatAmount / (newTokenRate ?? 0)

    setValue("tokenAmount", truncateToSignificantDigits(newTokenAmount))
  }

  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedTokenAmount(e.target.value)
    const fiatAmount = (tokenRateByCurrency ?? 0) * Number(e.target.value)
    setValue("fiatAmount", truncateToSignificantDigits(fiatAmount))
  }

  // const handleAccountChange = useCallback(
  //   (acc: AccountJsonAny | null) => {
  //     if (!acc) return

  //     if (tokenId && ethereumTokenIds.includes(tokenId) && !isEthereumAddress(acc.address))
  //       setValue("tokenId", "")
  //     if (tokenId && substrateTokenIds.includes(tokenId) && isEthereumAddress(acc.address))
  //       setValue("tokenId", "")

  //     setValue("address", acc?.address, { shouldValidate: true })
  //   },
  //   [ethereumTokenIds, setValue, substrateTokenIds, tokenId],
  // )
  const handleAccountChange = useCallback(
    (acc: AccountJsonAny | null) => {
      if (!acc) return

      setValue("address", acc?.address, { shouldValidate: true })
    },
    [setValue],
  )

  const onrampCurrencies = rampCurrencies?.filter((curr) => curr.onrampAvailable) ?? []
  const selectedFiatCurrency = onrampCurrencies.find((curr) => curr.fiatCurrency === fiatCurrency)
  const selectedToken = rampCurrencyWithAssets?.assets.find((asset) => asset.symbol === tokenId)
  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.address === address),
    [accounts, address],
  )

  const renderFiatCurrencyItem: DropdownOptionRender<RampCurrency> = (item) => {
    return <div className="flex flex-col justify-center">{item.fiatCurrency}</div>
  }
  const renderTokenItem: DropdownOptionRender<RampAsset> = (item) => {
    return <div className="flex flex-col justify-center">{item.symbol}</div>
  }

  const renderAccountItem: DropdownOptionRender<AccountJsonAny> = (account) => {
    return (
      <div className="flex flex-col justify-center">
        <FormattedAddress address={account.address} withSource />
      </div>
    )
  }

  const { t } = useTranslation()
  return (
    <div className="text-body-secondary h-[30rem] w-[32rem] xl:w-[64rem]">
      <form className="space-y-6" onSubmit={handleSubmit(submit)}>
        <div className="border-grey-750 space-y-6 rounded-xl border-[1px] p-6">
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
            inputFieldLabel={`$${fiatAmount}`}
            inputType="string"
            inputPlaceholder="0"
            onInputChange={(e) => {
              handleTokenAmountChange(e)
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
        <div className="border-grey-750 space-y-6 rounded-xl border-[1px] p-6">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step2")}</div>
            <div>{t("Select Account")}</div>
          </div>
          <div className="text-xs">{t("Deposit Account")}</div>
          <Dropdown
            items={accounts as AccountJsonAny[]}
            propertyKey="address"
            renderItem={renderAccountItem}
            onChange={handleAccountChange}
            placeholder={t("Select Account")}
            value={selectedAccount}
            key={address} // uncontrolled component, will reset if value changes
            className="border-grey-750 bg-black-secondary flex h-[7rem] justify-between rounded-lg border-[1px] p-4"
            buttonClassName="bg-black-secondary"
            optionClassName="h-24 py-0"
          />
        </div>
        <Button type="submit" className="w-full" primary disabled={!isValid}>
          {t("Buy with Ramp")}
        </Button>
      </form>
    </div>
  )
}

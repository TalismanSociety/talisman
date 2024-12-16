import { yupResolver } from "@hookform/resolvers/yup"
import { tokensToPlanck } from "@talismn/util"
import { RAMP_API_KEY, RAMP_BASE_PATH } from "extension-shared"
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

const TALISMAN_LOGO_URL =
  "https://raw.githubusercontent.com/TalismanSociety/talisman-web/0fa6f5a99b4729f740c1a68bbe3d2ca9c85c9daa/apps/portal/public/talisman.svg"

type RampTokenAsset = {
  symbol: string
  chain: string
  decimals: number
}

type FormData = {
  address: string
  fiatAmount: number
  fiatCurrency: string
  tokenAmount: number
  dirtyAmountField: string
  rampTokenAsset: RampTokenAsset
}

const schema = yup.object({
  address: yup.string().required(" "),
  fiatAmount: yup.number().required(" ").min(0),
  tokenAmount: yup.number().required(" ").min(0),
  fiatCurrency: yup.string().required(" "),
  dirtyAmountField: yup.string().required(" "),
  rampTokenAsset: yup.object().shape({
    symbol: yup.string().required(),
    chain: yup.string().required(),
    decimals: yup.number().required(),
  }),
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
      rampTokenAsset: {
        symbol: "DOT",
        chain: "DOT",
        decimals: 10,
      },
      dirtyAmountField: "fiatAmount",
    },
    resolver: yupResolver(schema),
  })
  const [
    address,
    fiatCurrency,
    fiatAmount,
    rampTokenAssetSymbol,
    rampTokenAssetChain,
    tokenAmount,
  ] = watch([
    "address",
    "fiatCurrency",
    "fiatAmount",
    "rampTokenAsset.symbol",
    "rampTokenAsset.chain",
    "tokenAmount",
  ])

  const { data: rampCurrencies } = useGetRampCurrencies()
  const { data: rampCurrencyWithAssets } = useGetRampAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId: rampTokenAssetSymbol,
  })

  const getTokenRateByCurrency = useCallback(
    ({ fiatCurrency, tokenId, chain }: { fiatCurrency: string; tokenId: string; chain: string }) =>
      rampCurrencyWithAssets?.assets.find(
        (asset) => asset.symbol === tokenId && asset.chain === chain,
      )?.price[fiatCurrency],
    [rampCurrencyWithAssets?.assets],
  )

  const tokenRateByCurrency = useMemo(
    () =>
      getTokenRateByCurrency({
        fiatCurrency,
        tokenId: rampTokenAssetSymbol,
        chain: rampTokenAssetChain,
      }),
    [getTokenRateByCurrency, fiatCurrency, rampTokenAssetChain, rampTokenAssetSymbol],
  )

  const submit = (data: FormData) => {
    const { fiatCurrency, rampTokenAsset, dirtyAmountField, tokenAmount, fiatAmount } = data

    const params = new URLSearchParams({
      hostApiKey: RAMP_API_KEY,
      hostLogoUrl: TALISMAN_LOGO_URL,
      enabledFlows: "ONRAMP",
      swapAsset: `${rampTokenAsset.chain}_${rampTokenAsset.symbol}`,
      userAddress: address,
      fiatCurrency: fiatCurrency,
    })

    // Dynamically add the amount parameter based on the dirtyAmountField
    if (dirtyAmountField === "fiatAmount") {
      params.append("fiatValue", fiatAmount.toString())
    } else {
      params.append(
        "swapAmount",
        tokensToPlanck(tokenAmount.toString(), rampTokenAsset.decimals).toString(),
      )
    }

    const url = `${RAMP_BASE_PATH}/?${params.toString()}`

    window.open(url, "_blank")
  }

  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTokenAmount = Number(e.target.value) / (tokenRateByCurrency ?? 0)

    setDebouncedFiatAmount(e.target.value)
    setValue("tokenAmount", truncateToSignificantDigits(newTokenAmount))
    setValue("dirtyAmountField", "fiatAmount")
  }

  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fiatAmount = (tokenRateByCurrency ?? 0) * Number(e.target.value)

    setDebouncedTokenAmount(e.target.value)
    setValue("fiatAmount", truncateToSignificantDigits(fiatAmount))
    setValue("dirtyAmountField", "tokenAmount")
  }

  const handleFiatCurrencyChange = (fiatCurrency: RampCurrency | null) => {
    const newFiatCurrency = fiatCurrency?.fiatCurrency ?? ""

    const newTokenRate = getTokenRateByCurrency({
      fiatCurrency: newFiatCurrency,
      tokenId: rampTokenAssetSymbol,
      chain: rampTokenAssetChain,
    })
    const fiatAmount = (newTokenRate ?? 0) * tokenAmount

    setValue("fiatCurrency", newFiatCurrency)
    setValue("fiatAmount", truncateToSignificantDigits(fiatAmount))
  }

  const handleTokenChange = (rampAsset: RampAsset | null) => {
    setValue("rampTokenAsset", {
      symbol: rampAsset?.symbol ?? "",
      chain: rampAsset?.chain ?? "",
      decimals: rampAsset?.decimals ?? 0,
    })

    const newTokenRate = getTokenRateByCurrency({
      fiatCurrency,
      tokenId: rampAsset?.symbol ?? "",
      chain: rampAsset?.chain ?? "",
    })
    const newTokenAmount = fiatAmount / (newTokenRate ?? 0)

    setValue("tokenAmount", truncateToSignificantDigits(newTokenAmount))
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
  const selectedToken = rampCurrencyWithAssets?.assets.find(
    (asset) => asset.symbol === rampTokenAssetSymbol,
  )
  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.address === address),
    [accounts, address],
  )

  const renderFiatCurrencyItem: DropdownOptionRender<RampCurrency> = (item) => {
    return <div className="flex w-[5rem] items-center text-white">{item.fiatCurrency}</div>
  }

  const renderTokenItem: DropdownOptionRender<RampAsset> = (item) => {
    return (
      <div className="flex w-[9rem] items-center gap-4">
        <div className="flex-shrink-0">
          <img src={item.logoUrl} alt={item.symbol} className="h-[28px] w-[28px] rounded-full" />
        </div>
        <div className="min-w-0">
          <div className="text-white">{item.symbol}</div>
          <div className="text-tiny max-w-[9rem] truncate">{item.name}</div>
        </div>
      </div>
    )
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
    <div className="text-body-secondary flex h-[30rem] justify-center">
      <form className="w-[47rem] space-y-6" onSubmit={handleSubmit(submit)}>
        <div className="border-grey-750 space-y-6 rounded-xl border-[1px] p-6">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step1")}</div>
            <div>{t("Select Asset")}</div>
          </div>
          <div className="text-xs">{t("You Pay")}</div>
          <NumberInputWithDropDown
            inputFieldProps={register("fiatAmount")}
            inputFieldLabel={fiatCurrency}
            inputType="string"
            inputPlaceholder="100"
            onInputChange={(e) => {
              handleFiatAmountChange(e)
              register("fiatAmount").onChange(e)
            }}
            propertyKey="fiatCurrency"
            placeholder={t("Select")}
            items={onrampCurrencies}
            value={selectedFiatCurrency}
            renderItem={renderFiatCurrencyItem}
            onChange={handleFiatCurrencyChange}
            buttonClassName="px-6 py-3 h-full"
            optionClassName="p-6"
          />
          <div className="flex justify-between">
            <div className="text-xs">{t("You're receiving (estimate)")}</div>
            <div className="text-xs">{`1 ${rampTokenAssetSymbol} ≈ ${truncateToSignificantDigits(tokenRateByCurrency ?? 0)} ${fiatCurrency}`}</div>
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
            buttonClassName="px-6 py-3 h-full"
            optionClassName="px-6 py-3"
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
          />
        </div>
        <Button type="submit" className="w-full" primary disabled={!isValid}>
          {t("Buy with Ramp")}
        </Button>
      </form>
    </div>
  )
}

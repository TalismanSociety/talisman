import { yupResolver } from "@hookform/resolvers/yup"
import { planckToTokens, tokensToPlanck } from "@talismn/util"
import { RAMP_API_KEY, RAMP_BASE_PATH } from "extension-shared"
import React, { useCallback, useEffect, useMemo } from "react"
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
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useAccounts, useSelectedCurrency } from "@ui/state"

import { useGetRampAssetsByCurrency } from "./hooks/useGetRampAssetsByCurrency"
import { useGetRampCurrencies } from "./hooks/useGetRampCurrencies"
import { useGetRampOfframpAssetsByCurrency } from "./hooks/useGetRampOfframpAssetsByCurrency"
import { useGetRampQuote } from "./hooks/useGetRampQuote"
import { NumberInputWithDropDown } from "./NumberInputWithDropDown"
import { RampAccountOption } from "./RampAccountOption"
import { RampAsset, RampCurrency } from "./types"
import { truncateToSignificantDigits } from "./utils"

const TALISMAN_LOGO_URL =
  "https://raw.githubusercontent.com/TalismanSociety/talisman-web/0fa6f5a99b4729f740c1a68bbe3d2ca9c85c9daa/apps/portal/public/talisman.svg"

export type AccountWithBalance = AccountJsonAny & { total: number }

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

type RampFormProps = {
  formType: "buy" | "sell"
}

export const RampForm = ({ formType }: RampFormProps) => {
  const currency = useSelectedCurrency()
  const accounts = useAccounts("portfolio")
  const [debouncedFiatAmount, setDebouncedFiatAmount] = useDebouncedState("", 300)
  const [debouncedTokenAmount, setDebouncedTokenAmount] = useDebouncedState("", 300)
  const { t } = useTranslation()
  const { balanceTotalPerAccount } = usePortfolioAccounts()

  const isBuyForm = formType === "buy"

  const accountsWithBalance = useMemo(
    () => accounts.map((acc) => ({ ...acc, total: balanceTotalPerAccount[acc.address] })),
    [accounts, balanceTotalPerAccount],
  )

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
    rampTokenDecimals,
    rampTokenAssetChain,
    tokenAmount,
    dirtyAmountField,
  ] = watch([
    "address",
    "fiatCurrency",
    "fiatAmount",
    "rampTokenAsset.symbol",
    "rampTokenAsset.decimals",
    "rampTokenAsset.chain",
    "tokenAmount",
    "dirtyAmountField",
  ])

  const { data: rampCurrencies } = useGetRampCurrencies()
  const { data: rampCurrencyWithAssets } = useGetRampAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId: rampTokenAssetSymbol,
    isEnabled: isBuyForm,
  })
  const { data: rampCurrencyWithOfframpAssets } = useGetRampOfframpAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId: rampTokenAssetSymbol,
    isEnabled: !isBuyForm,
  })

  const { data: rampQuote, isLoading: isRampQuoteLoading } = useGetRampQuote({
    currencyCode: fiatCurrency,
    swapAsset: `${rampTokenAssetChain}_${rampTokenAssetSymbol}`,
    tokenAmount: tokensToPlanck(debouncedTokenAmount || "0", rampTokenDecimals)?.toString(),
    fiatAmount: Number(debouncedFiatAmount),
    isFiatQuote: dirtyAmountField === "fiatAmount",
    isBuyForm,
  })

  useEffect(() => {
    if (!rampQuote || isRampQuoteLoading) return

    const { CARD_PAYMENT, CARD, asset } = rampQuote ?? {}

    const { fiatValue: onrampFiatValue, cryptoAmount: onrampCryptoAmount } = CARD_PAYMENT ?? {}
    const { fiatValue: offrampFiatValue, cryptoAmount: offrampCryptoAmount } = CARD ?? {}

    if (dirtyAmountField === "fiatAmount") {
      const tokenQuoteAmount = Number(
        truncateToSignificantDigits(
          Number(
            planckToTokens(
              (isBuyForm ? onrampCryptoAmount : offrampCryptoAmount) ?? "0",
              asset?.decimals ?? 0,
            ),
          ),
        ),
      )

      setValue("tokenAmount", truncateToSignificantDigits(tokenQuoteAmount))
    } else {
      setValue("fiatAmount", (isBuyForm ? onrampFiatValue : offrampFiatValue) ?? 0)
    }
  }, [dirtyAmountField, isBuyForm, isRampQuoteLoading, rampQuote, setValue])

  const rampAvailableCurrencies = useCallback(
    () => (isBuyForm ? rampCurrencyWithAssets : rampCurrencyWithOfframpAssets),
    [isBuyForm, rampCurrencyWithAssets, rampCurrencyWithOfframpAssets],
  )()

  const getTokenRateByCurrency = useCallback(
    ({ fiatCurrency, tokenId, chain }: { fiatCurrency: string; tokenId: string; chain: string }) =>
      rampAvailableCurrencies?.assets.find(
        (asset) => asset.symbol === tokenId && asset.chain === chain,
      )?.price[fiatCurrency],
    [rampAvailableCurrencies?.assets],
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
      enabledFlows: isBuyForm ? "ONRAMP" : "OFFRAMP",
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
    setDebouncedFiatAmount(e.target.value)

    setValue("dirtyAmountField", "fiatAmount")
  }

  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedTokenAmount(e.target.value)

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
  const selectedToken = rampAvailableCurrencies?.assets.find(
    (asset) => asset.symbol === rampTokenAssetSymbol && asset.chain === rampTokenAssetChain,
  )
  const selectedAccount = useMemo(
    () => accountsWithBalance.find((acc) => acc.address === address),
    [accountsWithBalance, address],
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

  const fiatAmountInput = (
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
      buttonClassName="px-6 py-3 h-full flex"
      optionClassName="p-6"
    />
  )

  const tokenAmountInput = (
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
      items={rampAvailableCurrencies?.assets ?? []}
      value={selectedToken}
      renderItem={renderTokenItem}
      onChange={handleTokenChange}
      buttonClassName="px-6 py-3 h-full flex"
      optionClassName="px-6 py-3"
      isLoading={isRampQuoteLoading && dirtyAmountField === "fiatAmount"}
    />
  )

  return (
    <div className="text-body-secondary flex h-[47.5rem] justify-center md:h-auto">
      <form className="flex w-full flex-col md:w-[47rem]" onSubmit={handleSubmit(submit)}>
        <div className="md:border-grey-750 bg-black-secondary space-y-6 rounded-xl border-0 p-6 md:border-[1px] md:bg-inherit">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step1")}</div>
            <div>{t("Select Asset")}</div>
          </div>
          <div className="text-xs">{isBuyForm ? t("You Pay") : t("You Sell")}</div>
          {isBuyForm ? fiatAmountInput : tokenAmountInput}
          <div className="flex justify-between">
            <div className="text-xs">{t("You're receiving (estimate)")}</div>
            <div className="text-xs">{`1 ${rampTokenAssetSymbol} ≈ ${truncateToSignificantDigits(tokenRateByCurrency ?? 0)} ${fiatCurrency}`}</div>
          </div>
          {isBuyForm ? tokenAmountInput : fiatAmountInput}
        </div>
        <div className="md:border-grey-750 bg-black-secondary mt-6 space-y-6 rounded-xl border-0 p-6 md:border-[1px] md:bg-inherit">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step2")}</div>
            <div>{t("Select Account")}</div>
          </div>
          <div className="text-xs">{t("Deposit Account")}</div>
          <Dropdown
            items={accountsWithBalance.filter((acc) => acc.address !== selectedAccount?.address)}
            propertyKey="address"
            renderItem={(item) => <RampAccountOption account={item} />}
            onChange={handleAccountChange}
            placeholder={t("Select Account")}
            value={selectedAccount}
            key={address} // uncontrolled component, will reset if value changes
            buttonClassName="bg-black-secondary h-full px-6 py-3"
            optionClassName="px-6 py-3"
            className="border-grey-750 bg-black-secondary flex h-[5.5rem] rounded-lg border-[1px]"
          />
        </div>
        <Button type="submit" className="mt-auto w-full md:mt-6" primary disabled={!isValid}>
          {isBuyForm ? t("Buy with Ramp") : t("Sell with Ramp")}
        </Button>
      </form>
    </div>
  )
}

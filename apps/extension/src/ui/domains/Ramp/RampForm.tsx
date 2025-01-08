import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { PlusIcon } from "@talismn/icons"
import { classNames, convertAddress, planckToTokens, tokensToPlanck } from "@talismn/util"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, Dropdown, DropdownOptionRender } from "talisman-ui"
import * as yup from "yup"

import {
  AccountJsonAny,
  activeChainsStore,
  activeEvmNetworksStore,
  activeTokensStore,
} from "@extension/core"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useAccounts, useRemoteConfig } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { currencyInfo } from "./currencyInfo"
import { useGetRampAssetsByCurrency } from "./hooks/useGetRampAssetsByCurrency"
import { useGetRampCurrencies } from "./hooks/useGetRampCurrencies"
import { useGetRampOfframpAssetsByCurrency } from "./hooks/useGetRampOfframpAssetsByCurrency"
import { useGetRampQuote } from "./hooks/useGetRampQuote"
import useSupportedTokens from "./hooks/useSupportedTokens"
import { NumberInputWithDropDown } from "./NumberInputWithDropDown"
import { RampAccountOption } from "./RampAccountOption"
import { RampConnectAccount } from "./RampConnectAccount"
import { RampOptionSwitchHeader } from "./RampOptionSwitchHeader"
import { RampAssetWithTokenAndChain, RampCurrency } from "./types"
import { truncateToSignificantDigits } from "./utils"

const TALISMAN_LOGO_URL =
  "https://raw.githubusercontent.com/TalismanSociety/talisman-web/0fa6f5a99b4729f740c1a68bbe3d2ca9c85c9daa/apps/portal/public/talisman.svg"

export type AccountWithBalance = AccountJsonAny & { total: number }

type RampTokenAsset = {
  id: string
  symbol: string
  chain: string
  decimals: number
  chainId: string
  isEvm: boolean
  chainPrefix?: number | null | undefined
  minPurchaseAmount: number
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
    id: yup.string().required(),
    symbol: yup.string().required(),
    chain: yup.string().required(),
    decimals: yup.number().required(),
    chainId: yup.string().required(),
    isEvm: yup.boolean().required(),
    chainPrefix: yup.number().nullable().optional(),
    minPurchaseAmount: yup.number().required(" "),
  }),
})

export const RampForm = () => {
  const accounts = useAccounts("portfolio")
  const [debouncedFiatAmount, setDebouncedFiatAmount] = useDebouncedState("", 300)
  const [debouncedTokenAmount, setDebouncedTokenAmount] = useDebouncedState("", 300)
  const [fiatSearch, setFiatSearch] = useState<string>("")
  const [tokenSearch, setTokenSearch] = useState<string>("")
  const [selectedFormType, setSelectedFormType] = useState<"buy" | "sell">("buy")
  const { t } = useTranslation()
  const { balanceTotalPerAccount } = usePortfolioAccounts()
  const {
    rampConfig: { rampBasePath, rampApiKey },
  } = useRemoteConfig()

  const isBuyForm = selectedFormType === "buy"

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isValid },
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
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
    rampTokenIsEvm,
    rampTokenMinPurchaseAmount,
    dirtyAmountField,
  ] = watch([
    "address",
    "fiatCurrency",
    "fiatAmount",
    "rampTokenAsset.symbol",
    "rampTokenAsset.decimals",
    "rampTokenAsset.chain",
    "rampTokenAsset.isEvm",
    "rampTokenAsset.minPurchaseAmount",
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

  const accountsWithBalance = useMemo(() => {
    const accountsWithBalance = accounts.map((acc) => ({
      ...acc,
      total: balanceTotalPerAccount[acc.address],
    }))
    if (!rampTokenAssetSymbol) {
      return accountsWithBalance
    }
    const evmByTokenChainType = accountsWithBalance.filter((acc) =>
      rampTokenIsEvm ? isEthereumAddress(acc.address) : !isEthereumAddress(acc.address),
    )
    return evmByTokenChainType
  }, [accounts, balanceTotalPerAccount, rampTokenAssetSymbol, rampTokenIsEvm])

  const rampAvailableCurrencies = useMemo(
    () => (isBuyForm ? rampCurrencyWithAssets : rampCurrencyWithOfframpAssets),
    [isBuyForm, rampCurrencyWithAssets, rampCurrencyWithOfframpAssets],
  )

  const { allSupportedTokens, ethereumTokens, substrateTokens } = useSupportedTokens({
    rampAssets: rampAvailableCurrencies?.assets ?? [],
  })

  const supportedTokens = useMemo(() => {
    if (!address) return allSupportedTokens
    return isEthereumAddress(address) ? ethereumTokens : substrateTokens
  }, [address, ethereumTokens, substrateTokens, allSupportedTokens])

  const selectedToken = supportedTokens?.find(
    (asset) => asset.symbol === rampTokenAssetSymbol && asset.chain === rampTokenAssetChain,
  )

  useEffect(() => {
    setValue("rampTokenAsset.minPurchaseAmount", selectedToken?.minPurchaseAmount ?? 0)
  }, [selectedToken?.minPurchaseAmount, setValue])

  const isFiatAboveMinPurchaseAmount = useMemo(() => {
    if (
      !rampTokenMinPurchaseAmount ||
      !rampTokenMinPurchaseAmount ||
      Number(debouncedFiatAmount) === 0
    ) {
      return true
    }

    return Number(debouncedFiatAmount) > rampTokenMinPurchaseAmount
  }, [debouncedFiatAmount, rampTokenMinPurchaseAmount])

  const {
    data: rampQuote,
    isLoading: isRampQuoteLoading,
    isError: isRampQuoteError,
  } = useGetRampQuote({
    currencyCode: fiatCurrency,
    swapAsset: `${rampTokenAssetChain}_${rampTokenAssetSymbol}`,
    tokenAmount: tokensToPlanck(debouncedTokenAmount || "0", rampTokenDecimals)?.toString(),
    fiatAmount: Number(debouncedFiatAmount),
    isFiatQuote: dirtyAmountField === "fiatAmount",
    isBuyForm,
    isEnabled: !!selectedToken && isFiatAboveMinPurchaseAmount,
  })

  useEffect(() => {
    // Handles cases where users switch between buy and sell forms and the token is not available for the selected currency/action
    if (!selectedToken && fiatAmount > 0) setValue("tokenAmount", 0)

    if (!rampQuote || isRampQuoteLoading) return

    const { CARD_PAYMENT, CARD, asset } = rampQuote ?? {}

    const { fiatValue: onrampFiatValue, cryptoAmount: onrampCryptoAmount } = CARD_PAYMENT ?? {}
    const { fiatValue: offrampFiatValue, cryptoAmount: offrampCryptoAmount } = CARD ?? {}

    if (dirtyAmountField === "fiatAmount") {
      const tokenQuoteAmount = truncateToSignificantDigits(
        Number(
          planckToTokens(
            (isBuyForm ? onrampCryptoAmount : offrampCryptoAmount) ?? "0",
            asset?.decimals ?? 0,
          ),
        ),
      ).toString()

      setValue("tokenAmount", Number(tokenQuoteAmount))
    } else {
      const fiatValue = isBuyForm ? onrampFiatValue : offrampFiatValue
      setValue("fiatAmount", fiatValue ?? 0)
      setDebouncedFiatAmount(fiatValue?.toString() ?? "0")
    }
  }, [
    dirtyAmountField,
    isBuyForm,
    isRampQuoteLoading,
    rampQuote,
    setValue,
    selectedToken,
    fiatAmount,
    setDebouncedFiatAmount,
  ])

  const getTokenRateByCurrency = useCallback(
    ({ fiatCurrency, tokenId, chain }: { fiatCurrency: string; tokenId: string; chain: string }) =>
      supportedTokens.find((asset) => asset.symbol === tokenId && asset.chain === chain)?.price[
        fiatCurrency
      ],
    [supportedTokens],
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
    const { fiatCurrency, rampTokenAsset, dirtyAmountField, tokenAmount, fiatAmount, address } =
      data

    const formattedAddress = convertAddress(address, rampTokenAsset.chainPrefix ?? 0) || address

    activeTokensStore.setActive(rampTokenAsset.id, true)
    if (rampTokenAsset.isEvm) {
      activeEvmNetworksStore.setActive(rampTokenAsset.chainId, true)
    } else {
      activeChainsStore.setActive(rampTokenAsset.chainId, true)
    }

    const params = new URLSearchParams({
      hostApiKey: rampApiKey,
      hostLogoUrl: TALISMAN_LOGO_URL,
      defaultFlow: isBuyForm ? "ONRAMP" : "OFFRAMP",
      enabledFlows: "ONRAMP,OFFRAMP",
      swapAsset: `${rampTokenAsset.chain}_${rampTokenAsset.symbol}`,
      userAddress: formattedAddress,
      fiatCurrency: fiatCurrency,
      hostAppName: "Talisman",
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

    const url = `${rampBasePath}/?${params.toString()}`

    window.open(url, "_blank")
  }

  const handleFiatAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedFiatAmount(e.target.value)

    setValue("dirtyAmountField", "fiatAmount")
  }

  const handleFiatCurrencyChange = useMemo(
    () => (fiatCurrency: RampCurrency | null) => {
      const newFiatCurrency = fiatCurrency?.fiatCurrency ?? ""

      setValue("fiatCurrency", newFiatCurrency)
      setValue("rampTokenAsset.minPurchaseAmount", selectedToken?.minPurchaseAmount ?? 0)
    },
    [selectedToken?.minPurchaseAmount, setValue],
  )

  const handleTokenAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebouncedTokenAmount(e.target.value)

    setValue("dirtyAmountField", "tokenAmount")
  }

  const handleTokenChange = useCallback(
    (rampAsset: RampAssetWithTokenAndChain | null) => {
      const isEvmToken = !!rampAsset?.tokenData.token?.evmNetwork?.id
      setValue(
        "rampTokenAsset",
        {
          id: rampAsset?.tokenData.id ?? "",
          symbol: rampAsset?.symbol ?? "",
          chain: rampAsset?.chain ?? "",
          decimals: rampAsset?.decimals ?? 0,
          isEvm: isEvmToken,
          chainId: rampAsset?.tokenData.chain?.id ?? "",
          chainPrefix:
            rampAsset?.tokenData?.chain && "prefix" in rampAsset.tokenData.chain
              ? rampAsset.tokenData.chain.prefix
              : null,
          minPurchaseAmount: rampAsset?.minPurchaseAmount ?? 0,
        },
        { shouldValidate: true },
      )
      if (isEvmToken && (!address || !isEthereumAddress(address))) {
        const acc = accounts.find((acc) => isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "", { shouldValidate: true })
      }
      if (!isEvmToken && (!address || isEthereumAddress(address))) {
        const acc = accounts.find((acc) => !isEthereumAddress(acc.address))
        setValue("address", acc?.address ?? "", { shouldValidate: true })
      }
    },

    [accounts, address, setValue],
  )

  const handleAccountChange = useCallback(
    (acc: AccountJsonAny | null) => {
      if (!acc) return

      setValue("address", acc?.address, { shouldValidate: true })

      if (rampTokenIsEvm !== isEthereumAddress(acc.address)) {
        setValue(
          "rampTokenAsset",
          {
            id: "",
            symbol: "",
            chain: "",
            decimals: 0,
            isEvm: false,
            chainId: "",
            chainPrefix: null,
            minPurchaseAmount: 0,
          },
          { shouldValidate: true },
        )
      }
    },

    [rampTokenIsEvm, setValue],
  )

  const onrampCurrencies = rampCurrencies?.filter((curr) => curr.onrampAvailable) ?? []
  const selectedFiatCurrency = onrampCurrencies.find((curr) => curr.fiatCurrency === fiatCurrency)
  const selectedAccount = useMemo(
    () => accountsWithBalance.find((acc) => acc.address === address),
    [accountsWithBalance, address],
  )

  const renderFiatCurrencyItem: DropdownOptionRender<RampCurrency> = (item) => {
    const fiatCurrencyIfo = currencyInfo[item.fiatCurrency ?? ""]
    return (
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={`https://assets.ramp.network/flags/${fiatCurrencyIfo.countryCode}.svg`}
            alt={item.fiatCurrency}
            className="h-[28px] w-[28px] rounded-full"
          />
        </div>
        <div className="min-w-0">
          <div className="text-white">{item.fiatCurrency}</div>
          <div className="text-tiny truncate">{item.name}</div>
        </div>
      </div>
    )
  }

  const renderTokenItem: DropdownOptionRender<RampAssetWithTokenAndChain> = (item) => {
    return (
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img src={item.logoUrl} alt={item.symbol} className="h-[28px] w-[28px] rounded-full" />
        </div>
        <div className="min-w-0">
          <div className="text-white">{item.symbol}</div>
          <div className="text-tiny truncate">{item.tokenData.chain?.name}</div>
        </div>
      </div>
    )
  }

  const fiatAmountInput = (
    <NumberInputWithDropDown
      inputFieldProps={register("fiatAmount")}
      inputFieldLabel={fiatCurrency ?? "$0"}
      inputType="number"
      inputPlaceholder="0"
      onInputChange={(e) => {
        handleFiatAmountChange(e)
        register("fiatAmount").onChange(e)
      }}
      propertyKey="fiatCurrency"
      items={onrampCurrencies.filter((curr) =>
        curr.fiatCurrency.includes(fiatSearch.toUpperCase()),
      )}
      placeholder={
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
            <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
          </div>
          <div className="text-xs text-white">{t("Select currency")}</div>
        </div>
      }
      value={selectedFiatCurrency}
      renderItem={renderFiatCurrencyItem}
      onChange={handleFiatCurrencyChange}
      className="rounded-[12px]"
      buttonClassName="px-3 py-3 h-full flex w-[16rem] gap-0"
      optionClassName="px-6 py-[8px] border-b border-grey-750"
      isSearchable
      handleSearchChange={setFiatSearch}
      searchPlaceholder={t("Search currency")}
      searchLabel={t(`Available now (${onrampCurrencies.length}):`)}
      minStep="0.01"
      errorMessage={
        !isFiatAboveMinPurchaseAmount
          ? t(
              `The minimum purchase amount for ${rampTokenAssetSymbol} is ${rampTokenMinPurchaseAmount.toFixed(2)} ${fiatCurrency}`,
            )
          : ""
      }
      onClear={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation()
        setValue("fiatCurrency", "", { shouldValidate: true })
      }}
    />
  )

  const tokenAmountInput = (
    <NumberInputWithDropDown
      inputFieldProps={register("tokenAmount")}
      inputFieldLabel={`$${fiatAmount || "0"}`}
      inputType="number"
      inputPlaceholder="0"
      onInputChange={(e) => {
        handleTokenAmountChange(e)
        register("tokenAmount").onChange(e)
      }}
      propertyKey="address"
      placeholder={
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
            <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
          </div>
          <div className="text-xs text-white">{t("Select token")}</div>
        </div>
      }
      items={
        supportedTokens.filter((asset) => asset.symbol.includes(tokenSearch.toUpperCase())) ?? []
      }
      value={selectedToken}
      renderItem={renderTokenItem}
      onChange={handleTokenChange}
      className="rounded-[12px]"
      buttonClassName="px-3 py-3 h-full flex w-[16rem] gap-0"
      optionClassName="px-6 py-[8px] border-b border-grey-750"
      isLoading={isRampQuoteLoading && dirtyAmountField === "fiatAmount"}
      isSearchable
      handleSearchChange={setTokenSearch}
      searchPlaceholder={t("Search asset")}
      searchLabel={t(`Available now (${supportedTokens.length}):`)}
      minStep={`1e-${rampTokenDecimals}`}
      onClear={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.stopPropagation()
        setValue(
          "rampTokenAsset",
          {
            id: "",
            symbol: "",
            chain: "",
            decimals: 0,
            isEvm: false,
            chainId: "",
            chainPrefix: null,
            minPurchaseAmount: 0,
          },
          { shouldValidate: true },
        )
      }}
    />
  )

  return (
    <div
      className={classNames(
        "text-body-secondary flex justify-center md:h-auto",
        IS_POPUP && "flex-col",
      )}
    >
      <form className="flex h-full w-full max-w-[47rem] flex-col" onSubmit={handleSubmit(submit)}>
        <RampOptionSwitchHeader setSelectedFormType={setSelectedFormType} />
        <div className="md:border-grey-750 bg-black-secondary space-y-6 rounded-[16px] border-0 p-6 md:border-[1px] md:bg-inherit">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step 1")}</div>
            <div>{t("Select asset")}</div>
          </div>
          <div className="text-xs">{isBuyForm ? t("You Pay") : t("You Sell")}</div>
          {isBuyForm ? fiatAmountInput : tokenAmountInput}
          <div className="flex justify-between">
            <div className="text-xs">{t("You're receiving (estimate)")}</div>
            {rampTokenAssetSymbol && (
              <div className="text-xs">{`1 ${rampTokenAssetSymbol} ≈ ${truncateToSignificantDigits(tokenRateByCurrency ?? 0)} ${fiatCurrency || "$"}`}</div>
            )}
          </div>
          {isBuyForm ? tokenAmountInput : fiatAmountInput}
        </div>
        <div className="md:border-grey-750 bg-black-secondary mt-6 space-y-6 rounded-[16px] border-0 p-6 md:border-[1px] md:bg-inherit">
          <div className="flex gap-4">
            <div className="font-bold text-white">{t("Step 2")}</div>
            <div>{t("Select account")}</div>
          </div>
          <div className="text-xs">{t("Deposit Account")}</div>
          {rampTokenAssetSymbol && accountsWithBalance.length === 0 ? (
            <RampConnectAccount isEvm={rampTokenIsEvm} />
          ) : (
            <Dropdown
              items={accountsWithBalance.filter((acc) => acc.address !== selectedAccount?.address)}
              propertyKey="address"
              renderItem={(item) => <RampAccountOption account={item} />}
              onChange={handleAccountChange}
              placeholder={t("Select account")}
              value={selectedAccount}
              key={address} // uncontrolled component, will reset if value changes
              buttonClassName="bg-black-secondary h-full px-6 py-3 rounded-[12px]"
              optionClassName="px-6 py-3"
              className="border-grey-750 bg-black-secondary flex h-[5.5rem] rounded-[12px] border-[1px]"
              onClear={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
                e.stopPropagation()
                setValue("address", "", { shouldValidate: true })
              }}
            />
          )}
        </div>
        <Button
          type="submit"
          className="mt-[1.8rem] h-[46px] w-full rounded-[16px]"
          primary
          disabled={
            !isValid || isRampQuoteError || isRampQuoteLoading || !isFiatAboveMinPurchaseAmount
          }
        >
          {isBuyForm ? t("Buy with Ramp") : t("Sell with Ramp")}
        </Button>
      </form>
    </div>
  )
}

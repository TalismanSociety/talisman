import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { tokensToPlanck } from "@talismn/util"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { provideContext } from "@talisman/util/provideContext"
import { useGetRampOfframpAssetsByCurrency } from "@ui/domains/Asset/Buy/hooks/useGetRampOfframpAssetsByCurrency"
import { useGetRampOnrampAssetsByCurrency } from "@ui/domains/Asset/Buy/hooks/useGetRampOnrampAssetsByCurrency"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useAccounts } from "@ui/state"

import { useBuyTokensModal } from "./hooks/useBuyTokensModal"
import { useGetRampCurrencies } from "./hooks/useGetRampCurrencies"
import { useGetRampQuote } from "./hooks/useGetRampQuote"
import { useSupportedTokens } from "./hooks/useSupportedTokens"
import { FormData, FormRoute } from "./types"
import { schema } from "./utils/schema"

export const useBuyTokensWizardProvider = () => {
  const [route, setRoute] = useState<FormRoute>("mainForm")
  const [isBuyForm, setIsBuyForm] = useState<boolean>(true)

  const { open, close } = useBuyTokensModal()
  const [debouncedFiatAmount, setDebouncedFiatAmount] = useDebouncedState("", 300)
  const [debouncedTokenAmount, setDebouncedTokenAmount] = useDebouncedState("", 300)
  const accounts = useAccounts("portfolio")
  const { balanceTotalPerAccount } = usePortfolioAccounts()

  const buySellForm = useForm<FormData>({
    mode: "all",
    defaultValues: {
      dirtyAmountField: "fiatAmount",
      rampTokenAsset: {
        id: "",
        symbol: "",
        chain: "",
        chainId: "",
        decimals: 0,
        isEvm: false,
        chainPrefix: 0,
        minPurchaseAmount: 0,
      },
    },
    resolver: yupResolver(schema),
  })

  const {
    handleSubmit,
    watch,
    formState: { isValid },
  } = buySellForm

  const [
    fiatCurrency,
    { isEvm, symbol, chain, decimals, minPurchaseAmount },
    address,
    dirtyAmountField,
  ] = watch(["fiatCurrency", "rampTokenAsset", "address", "dirtyAmountField"])

  const submit = handleSubmit((data) => {
    return data
    // console.log("Handle sumibit", { data })
  })

  const accountsWithBalance = useMemo(() => {
    const accountsWithBalance = accounts.map((acc) => ({
      ...acc,
      total: balanceTotalPerAccount[acc.address],
    }))

    if (!symbol) {
      return accountsWithBalance
    }
    const evmByTokenChainType = accountsWithBalance.filter((acc) =>
      isEvm ? isEthereumAddress(acc.address) : !isEthereumAddress(acc.address),
    )
    return evmByTokenChainType
  }, [accounts, balanceTotalPerAccount, symbol, isEvm])

  const { data: rampCurrencies } = useGetRampCurrencies()

  const supportedRampCurrencies =
    rampCurrencies?.filter((curr) => (isBuyForm ? curr.onrampAvailable : curr.offrampAvailable)) ??
    []

  const { data: rampCurrencyWithOffRampAssets } = useGetRampOnrampAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId: symbol,
    isEnabled: isBuyForm,
  })

  const { data: rampCurrencyWithOfframpAssets } = useGetRampOfframpAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId: symbol,
    isEnabled: !isBuyForm,
  })

  const isFiatAboveMinPurchaseAmount = useMemo(() => {
    if (!minPurchaseAmount || !minPurchaseAmount || Number(debouncedFiatAmount) === 0) {
      return true
    }

    return Number(debouncedFiatAmount) > minPurchaseAmount
  }, [debouncedFiatAmount, minPurchaseAmount])

  const {
    data: rampQuote,
    isLoading: isRampQuoteLoading,
    isError: isRampQuoteError,
  } = useGetRampQuote({
    currencyCode: fiatCurrency,
    swapAsset: `${chain}_${symbol}`,
    tokenAmount: tokensToPlanck(debouncedTokenAmount || "0", decimals)?.toString(),
    fiatAmount: Number(debouncedFiatAmount),
    isFiatQuote: dirtyAmountField === "fiatAmount",
    isBuyForm,
    isEnabled: !!symbol && isFiatAboveMinPurchaseAmount,
  })

  const rampAvailableCurrencies = useMemo(
    () => (isBuyForm ? rampCurrencyWithOffRampAssets : rampCurrencyWithOfframpAssets),
    [isBuyForm, rampCurrencyWithOffRampAssets, rampCurrencyWithOfframpAssets],
  )

  const { allSupportedTokens, ethereumTokens, substrateTokens } = useSupportedTokens({
    rampAssets: rampAvailableCurrencies?.assets ?? [],
  })

  const supportedTokens = useMemo(() => {
    if (!address) return allSupportedTokens
    return isEthereumAddress(address) ? ethereumTokens : substrateTokens
  }, [address, ethereumTokens, substrateTokens, allSupportedTokens])

  const isFormDisabled =
    !isValid || isRampQuoteError || isRampQuoteLoading || !isFiatAboveMinPurchaseAmount

  const ctx = {
    route,
    buySellForm,
    debouncedFiatAmount,
    debouncedTokenAmount,
    isBuyForm,
    accountsWithBalance,
    supportedTokens,
    isFormDisabled,
    supportedRampCurrencies,
    isFiatAboveMinPurchaseAmount,
    rampQuote,
    setIsBuyForm,
    setDebouncedFiatAmount,
    setDebouncedTokenAmount,
    setRoute,
    open,
    close,
    submit,
  }

  return ctx
}

export const [BuyTokensWizardProvider, useBuyTokensWizard] = provideContext(
  useBuyTokensWizardProvider,
)

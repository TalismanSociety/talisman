import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { planckToTokens, tokensToPlanck } from "@talismn/util"
import { useCallback, useEffect, useMemo, useState } from "react"
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
import { truncateToSignificantDigits } from "./utils/truncateToSignificantDigits"

const DEFAULT_RAMP_TOKEN_ASSET = {
  id: "",
  symbol: "",
  chain: "",
  chainPrefix: 0,
  chainId: "",
  chainName: "",
  logo: "",
  decimals: 0,
  isEvm: false,
  minPurchaseAmount: 0,
}

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
      rampTokenAsset: DEFAULT_RAMP_TOKEN_ASSET,
    },
    resolver: yupResolver(schema),
  })

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { isValid },
  } = buySellForm

  const [
    fiatCurrency,
    { isEvm, symbol, chain, decimals, minPurchaseAmount, id },
    address,
    dirtyAmountField,
  ] = watch(["fiatCurrency", "rampTokenAsset", "address", "dirtyAmountField"])

  useEffect(() => {
    setValue("rampTokenAsset.minPurchaseAmount", minPurchaseAmount ?? 0)
  }, [minPurchaseAmount, setValue])

  const submit = handleSubmit((data) => {
    return data
    // console.log("Handle sumibit", { data })
  })

  const supportedAccountsWithBalance = useMemo(() => {
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

  const supportedRampCurrencies = useMemo(
    () =>
      rampCurrencies?.filter((curr) =>
        isBuyForm ? curr.onrampAvailable : curr.offrampAvailable,
      ) ?? [],
    [isBuyForm, rampCurrencies],
  )

  const { data: rampCurrencyWithOffRampAssets } = useGetRampOnrampAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId: symbol,
    isEnabled: true,
  })

  const { data: rampCurrencyWithOfframpAssets } = useGetRampOfframpAssetsByCurrency({
    currencyCode: fiatCurrency,
    fiatAmount: debouncedFiatAmount,
    tokenAmount: debouncedTokenAmount,
    tokenId: symbol,
    isEnabled: true,
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

  const quoteUpdateHandler = useCallback(() => {
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
      )

      setValue("tokenAmount", tokenQuoteAmount)
    } else {
      const fiatQuoteAmount = isBuyForm ? onrampFiatValue : offrampFiatValue

      setValue("fiatAmount", fiatQuoteAmount ?? 0)
    }
  }, [dirtyAmountField, isBuyForm, isRampQuoteLoading, rampQuote, setValue])

  useEffect(() => {
    quoteUpdateHandler()
  }, [quoteUpdateHandler])

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

  const handleToggleFormType = useCallback(
    (option: "buy" | "sell") => {
      const isBuyForm = option === "buy"

      const isSelectedTokenSupported = allSupportedTokens.some((token) => token.tokenData.id === id)

      if (id && !isSelectedTokenSupported) {
        setValue("rampTokenAsset", DEFAULT_RAMP_TOKEN_ASSET)
      }

      const isFiatCurrencySupported = supportedRampCurrencies.some(
        (curr) => curr.fiatCurrency === fiatCurrency,
      )

      if (fiatCurrency && !isFiatCurrencySupported) {
        setValue("fiatCurrency", "")
      }

      setIsBuyForm(isBuyForm)
    },
    [allSupportedTokens, fiatCurrency, id, setValue, supportedRampCurrencies],
  )

  const isFormDisabled =
    !isValid || isRampQuoteError || isRampQuoteLoading || !isFiatAboveMinPurchaseAmount

  const ctx = {
    route,
    buySellForm,
    debouncedFiatAmount,
    debouncedTokenAmount,
    isBuyForm,
    supportedAccountsWithBalance,
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
    handleToggleFormType,
  }

  return ctx
}

export const [BuyTokensWizardProvider, useBuyTokensWizard] = provideContext(
  useBuyTokensWizardProvider,
)

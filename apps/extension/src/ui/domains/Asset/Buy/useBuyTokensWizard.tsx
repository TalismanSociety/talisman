import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { convertAddress, planckToTokens, tokensToPlanck } from "@talismn/util"
import { activeChainsStore, activeEvmNetworksStore, activeTokensStore } from "extension-core"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { provideContext } from "@talisman/util/provideContext"
import { useGetRampOfframpAssetsByCurrency } from "@ui/domains/Asset/Buy/hooks/useGetRampOfframpAssetsByCurrency"
import { useGetRampOnrampAssetsByCurrency } from "@ui/domains/Asset/Buy/hooks/useGetRampOnrampAssetsByCurrency"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useAccounts, useRemoteConfig } from "@ui/state"

import { useBuyTokensModal } from "./hooks/useBuyTokensModal"
import { useGetRampCurrencies } from "./hooks/useGetRampCurrencies"
import { useGetRampQuote } from "./hooks/useGetRampQuote"
import { useSupportedTokens } from "./hooks/useSupportedTokens"
import { FormData, FormRoute } from "./types"
import { schema } from "./utils/schema"
import { truncateToSignificantDigits } from "./utils/truncateToSignificantDigits"

const TALISMAN_LOGO_URL =
  "https://raw.githubusercontent.com/TalismanSociety/talisman-web/0fa6f5a99b4729f740c1a68bbe3d2ca9c85c9daa/apps/portal/public/talisman.svg"

export const DEFAULT_RAMP_TOKEN_ASSET = {
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

const useBuyTokensWizardProvider = () => {
  const [route, setRoute] = useState<FormRoute>("mainForm")
  const [isBuyForm, setIsBuyForm] = useState<boolean>(true)

  const { open, close } = useBuyTokensModal()
  const [debouncedFiatAmount, setDebouncedFiatAmount] = useDebouncedState("", 300)
  const [debouncedTokenAmount, setDebouncedTokenAmount] = useDebouncedState("", 300)
  const accounts = useAccounts("portfolio")
  const { balanceTotalPerAccount } = usePortfolioAccounts()

  const {
    rampConfig: { rampBasePath, rampApiKey },
  } = useRemoteConfig()

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

  const submit = handleSubmit((data: FormData) => {
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

  // Check if Ramp is supported in the user's region
  const { isError: isRampNotSupported } = useGetRampQuote({
    currencyCode: "USD",
    swapAsset: "ETH_ETH",
    tokenAmount: (1e18).toString(), // 1 ETH
    fiatAmount: 0,
    isFiatQuote: false,
    isBuyForm,
    isEnabled: true,
    retry: false,
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

      setValue("tokenAmount", tokenQuoteAmount, { shouldValidate: true })
    } else {
      const fiatQuoteAmount = isBuyForm ? onrampFiatValue : offrampFiatValue

      setValue("fiatAmount", fiatQuoteAmount ?? 0, { shouldValidate: true })
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

  useEffect(() => {
    const newMinPurchaseAmount = supportedTokens.find(
      (token) => token.tokenData.id === id,
    )?.minPurchaseAmount
    if (fiatCurrency && minPurchaseAmount && newMinPurchaseAmount !== minPurchaseAmount) {
      setValue("rampTokenAsset.minPurchaseAmount", newMinPurchaseAmount ?? 0, {
        shouldValidate: true,
      })
    }
  }, [minPurchaseAmount, setValue, id, supportedTokens, fiatCurrency])

  const handleToggleFormType = useCallback(
    (option: "buy" | "sell") => {
      const isBuyForm = option === "buy"
      const isSelectedTokenSupported = supportedTokens.some((token) => token.tokenData.id === id)

      if (id && !isSelectedTokenSupported) {
        setValue("rampTokenAsset", DEFAULT_RAMP_TOKEN_ASSET, { shouldValidate: true })
        setValue("tokenAmount", 0, { shouldValidate: true })
      }
      const isFiatCurrencySupported = supportedRampCurrencies.some(
        (curr) => curr.fiatCurrency === fiatCurrency,
      )
      if (fiatCurrency && !isFiatCurrencySupported) {
        setValue("fiatCurrency", "", { shouldValidate: true })
      }

      // Reset the address field if no token is supported for the selected chain
      if (address && supportedTokens.length === 0) {
        setValue("address", "", { shouldValidate: true })
      }

      setIsBuyForm(isBuyForm)
    },
    [supportedTokens, id, supportedRampCurrencies, fiatCurrency, address, setValue],
  )

  const isFormDisabled = useMemo(
    () =>
      !isValid ||
      isRampQuoteError ||
      isRampQuoteLoading ||
      !isFiatAboveMinPurchaseAmount ||
      isRampNotSupported,
    [
      isFiatAboveMinPurchaseAmount,
      isRampNotSupported,
      isRampQuoteError,
      isRampQuoteLoading,
      isValid,
    ],
  )

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
    isRampNotSupported,
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

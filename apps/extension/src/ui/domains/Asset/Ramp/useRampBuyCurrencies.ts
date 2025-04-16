import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useCoinbaseBuyOptions } from "./coinbase/useCoinbaseBuyOptions"
import { getRampCurrencyInfo } from "./currencyInfo"
import { useGetRampCurrencies } from "./onramp/useRampOnRampCurrencies"

// type CoinbaseBuyConfigPaymentMethodId =
//   | "CARD"
//   | "CRYPTO_ACCOUNT"
//   | "FIAT_WALLET"
//   | "APPLE_PAY"
//   | "ACH_BANK_ACCOUNT"

// type CoinbaseBuyOptionsPaymentCurrency = {
//   /** Currency code */
//   id: string
//   limits: [
//     {
//       id: CoinbaseBuyConfigPaymentMethodId
//       max: string
//       min: string
//     },
//   ]
// }

// type CoinbaseBuyOptionsToken = {
//   id: string
//   name: string
//   symbol: string
//   networks: CoinbaseBuyOptionsTokenNetwork[]
//   icon_url: string
// }

// type CoinbaseBuyOptionsTokenNetwork = {
//   name: string
//   display_name: string
//   /** Empty string if native */
//   contract_address: string
//   chain_id: string
//   icon_url: string
// }

// type CoinbaseBuyOptionsPurchaseCurrency = CoinbaseBuyOptionsToken

// type CoinbaseBuyOptionsResponse = {
//   payment_currencies: CoinbaseBuyOptionsPaymentCurrency[]
//   purchase_currencies: CoinbaseBuyOptionsPurchaseCurrency[]
// }

// const useBuyCoinbaseOptions = () => {
//   return useQuery({
//     queryKey: ["useBuyCoinbaseOptions"],
//     queryFn: async (): Promise<CoinbaseBuyOptionsResponse> => {
//       const res = await fetch(urlJoin(COINBASE_API_BASE_PATH, "/buy/options"))
//       if (!res.ok) throw new Error("Failed to fetch coinbase buy config")
//       return await res.json()
//     },
//   })
// }

type CoinbaseBuyCurrency = {
  id: string
  min: string
  max: string
}

const useBuyCoinbaseCurrencies = () => {
  const { data: coinbaseBuyOptions, ...rest } = useCoinbaseBuyOptions()

  const data = useMemo(() => {
    if (coinbaseBuyOptions === undefined) return undefined

    return coinbaseBuyOptions.payment_currencies
      .map((curr): CoinbaseBuyCurrency | null => {
        const cardLimit = curr.limits.find((limit) => limit.id === "CARD")
        return cardLimit ? { id: curr.id, min: cardLimit.min, max: cardLimit.max } : null
      })
      .filter(isNotNil)
  }, [coinbaseBuyOptions])

  return { data, ...rest }
}

export const useRampBuyCurrencies = () => {
  const {
    data: rampCurrencies,
    isLoading: isLoadingOnRampCurrencies,
    error: errorOnRampCurrencies,
  } = useGetRampCurrencies()

  const {
    data: coinbaseCurrencies,
    isLoading: isLoadingCoinbaseCurrencies,
    error: errorCoinbaseCurrencies,
  } = useBuyCoinbaseCurrencies()

  const currencies = useMemo(() => {
    if (isLoadingCoinbaseCurrencies || isLoadingOnRampCurrencies) return undefined
    return [
      ...new Set([
        ...(rampCurrencies?.filter((c) => c.onrampAvailable).map((c) => c.fiatCurrency) ?? []),
        ...(coinbaseCurrencies?.map((c) => c.id) ?? []),
      ]),
    ]
      .map(getRampCurrencyInfo)
      .filter(isNotNil)
  }, [coinbaseCurrencies, isLoadingCoinbaseCurrencies, isLoadingOnRampCurrencies, rampCurrencies])

  return {
    currencies,
    isLoading: isLoadingOnRampCurrencies || isLoadingCoinbaseCurrencies,
    errors: errorOnRampCurrencies || errorCoinbaseCurrencies,
  }
}

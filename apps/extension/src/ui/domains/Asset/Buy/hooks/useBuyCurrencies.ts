import { useQuery } from "@tanstack/react-query"
import { COINBASE_API_BASE_PATH } from "extension-shared"
import { useMemo } from "react"
import urlJoin from "url-join"

import { useGetRampCurrencies } from "./useGetRampCurrencies"

type CoinbaseBuyConfigPaymentMethodId =
  | "CARD"
  | "CRYPTO_ACCOUNT"
  | "FIAT_WALLET"
  | "APPLE_PAY"
  | "ACH_BANK_ACCOUNT"

type CoinbaseBuyOptionsPaymentCurrency = {
  /** Currency code */
  id: string
  limits: [
    {
      id: CoinbaseBuyConfigPaymentMethodId
      max: string
      min: string
    },
  ]
}

type CoinbaseBuyOptionsToken = {
  id: string
  name: string
  symbol: string
  networks: CoinbaseBuyOptionsTokenNetwork[]
  icon_url: string
}

type CoinbaseBuyOptionsTokenNetwork = {
  name: string
  display_name: string
  /** Empty string if native */
  contract_address: string
  chain_id: string
  icon_url: string
}

type CoinbaseBuyOptionsPurchaseCurrency = CoinbaseBuyOptionsToken

export type CoinbaseBuyOptionsResponse = {
  payment_currencies: CoinbaseBuyOptionsPaymentCurrency[]
  purchase_currencies: CoinbaseBuyOptionsPurchaseCurrency[]
}

export const useBuyCoinbaseOptions = () => {
  return useQuery({
    queryKey: ["useBuyCoinbaseOptions"],
    queryFn: async (): Promise<CoinbaseBuyOptionsResponse> => {
      const res = await fetch(urlJoin(COINBASE_API_BASE_PATH, "/buy/options"))
      if (!res.ok) throw new Error("Failed to fetch coinbase buy config")
      return await res.json()
    },
  })
}

type CoinbaseBuyCurrency = {
  id: string
  min: string
  max: string
}

const isNotNil = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined

export const useBuyCoinbaseCurrencies = () => {
  const { data: coinbaseBuyOptions, ...rest } = useBuyCoinbaseOptions()

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

export const useBuyCurrencies = () => {
  const { data: rampCurrencies } = useGetRampCurrencies()
  // WIP
  return rampCurrencies
}

import { useQuery } from "@tanstack/react-query"
import { COINBASE_API_BASE_PATH } from "extension-shared"
import urlJoin from "url-join"

type CoinbaseBuyConfigPaymentMethodId =
  | "CARD"
  | "CRYPTO_ACCOUNT"
  | "FIAT_WALLET"
  | "APPLE_PAY"
  | "ACH_BANK_ACCOUNT"

export type CoinbaseBuyOptionsPaymentCurrency = {
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

export type CoinbaseBuyOptions = {
  payment_currencies: CoinbaseBuyOptionsPaymentCurrency[]
  purchase_currencies: CoinbaseBuyOptionsPurchaseCurrency[]
}

export const useCoinbaseBuyOptions = () => {
  return useQuery({
    queryKey: ["useRampCoinbaseBuyOptions"],
    queryFn: async (): Promise<CoinbaseBuyOptions> => {
      const res = await fetch(urlJoin(COINBASE_API_BASE_PATH, "/buy/options"))
      if (!res.ok) throw new Error("Failed to fetch coinbase buy config")
      return await res.json()
    },
  })
}

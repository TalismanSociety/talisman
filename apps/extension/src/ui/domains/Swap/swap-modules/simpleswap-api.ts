import { log } from "@common/log"
import type { SwapsConfig } from "@core/domains/swaps/env"
import BigNumber from "bignumber.js"
import { getSimpleSwapApiKey } from "./fee-utils"

type RouteProps = { currencyFrom: string; currencyTo: string }

type SimpleSwapCurrency = {
  name: string
  network: string
  symbol: string
  precision: number | null
  contract_address: string | null
  extra_id: string
  has_extra_id: boolean
  address_explorer: string
  confirmations_from: string
  image: string
  isFiat: boolean
}

export type Exchange = {
  id: string
  type: string
  timestamp: string
  updated_at: string
  valid_until: null
  currency_from: string
  currency_to: string
  amount_from: string
  expected_amount: string
  amount_to: string
  address_from: string
  address_to: string
  user_refund_address: string | null
  tx_from: null
  tx_to: null
  status: "waiting" | "confirming" | "exchanging" | "sending" | "finished" | "failed"
  redirect_url: null
  currencies: Record<
    string,
    {
      name: string
      symbol: string
      network: string
      image: string
      warnings_from: string[]
      warnings_to: string[]
      validation_address: string
      address_explorer: string
      tx_explorer: string
      confirmations_from: string
      contract_address: string | null
      isFiat: boolean
    }
  >
  trace_id: string
  code?: number
  description?: string
  error?: string
}

type Range = { min: BigNumber }

export const createSimpleSwapApi = ({
  fetch,
  getSwapsConfig,
}: {
  fetch: typeof globalThis.fetch
  getSwapsConfig: () => Promise<SwapsConfig>
}) => {
  const getApiKey = (route: RouteProps) => getSimpleSwapApiKey(route)
  return {
    getAllCurrencies: async (): Promise<SimpleSwapCurrency[]> => {
      const { simpleswapApiKey } = await getSwapsConfig()
      const allCurrenciesRes = await fetch(
        `https://api.simpleswap.io/get_all_currencies?api_key=${simpleswapApiKey}`
      )
      return await allCurrenciesRes.json()
    },
    getEstimate: async (props: {
      currencyFrom: string
      currencyTo: string
      amount: string
      fixed: boolean
    }): Promise<
      string | { code: number; error: string; description: string; trace_id: string } | null
    > => {
      try {
        const api_key = await getApiKey(props)
        if (!api_key) throw new Error("Simpleswap api key not found")
        const search = new URLSearchParams({
          api_key,
          fixed: `${props.fixed}`,
          currency_from: props.currencyFrom,
          currency_to: props.currencyTo,
          amount: props.amount,
        })
        const allCurrenciesRes = await fetch(
          `https://api.simpleswap.io/get_estimated?${search.toString()}`
        )
        return await allCurrenciesRes.json()
      } catch (cause) {
        log.error(new Error("Failed to fetch all simpleswap currencies", { cause }))
        return null
      }
    },
    getPairs: async (props: {
      symbol: string
      fixed: boolean
    }): Promise<
      string[] | { code: number; error: string; description: string; trace_id: string } | null
    > => {
      try {
        const { simpleswapApiKey } = await getSwapsConfig()
        if (!simpleswapApiKey) throw new Error("Simpleswap api key not found")
        const search = new URLSearchParams({
          api_key: simpleswapApiKey,
          fixed: `${props.fixed}`,
          symbol: props.symbol,
        })
        const allPairs = await fetch(`https://api.simpleswap.io/get_pairs?${search.toString()}`)
        return await allPairs.json()
      } catch (cause) {
        log.error(new Error("Failed to fetch simpleswap pairs", { cause }))
        return null
      }
    },
    createExchange: async (props: {
      fixed: boolean
      currency_from: string
      currency_to: string
      amount: number
      address_to: string
      extra_id_to?: string
      user_refund_address: string | null
      user_refund_extra_id: string | null
    }): Promise<Exchange> => {
      const api_key = await getApiKey({
        currencyFrom: props.currency_from,
        currencyTo: props.currency_to,
      })
      if (!api_key) throw new Error("Simpleswap api key not found")
      const search = new URLSearchParams({ api_key: api_key })
      const exchange = await fetch(
        `https://api.simpleswap.io/create_exchange?${search.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(props),
        }
      )

      return exchange.json()
    },
    getExchange: async (id: string): Promise<Exchange> => {
      const { simpleswapApiKey } = await getSwapsConfig()
      if (!simpleswapApiKey) throw new Error("Simpleswap api key not found")
      const search = new URLSearchParams({ api_key: simpleswapApiKey, id })
      const exchange = await fetch(`https://api.simpleswap.io/get_exchange?${search.toString()}`)
      return exchange.json()
    },
    getRange: async (props: {
      currency_from: string
      currency_to: string
    }): Promise<Range | undefined> => {
      const api_key = await getApiKey({
        currencyFrom: props.currency_from,
        currencyTo: props.currency_to,
      })
      if (!api_key) throw new Error("Simpleswap api key not found")
      const search = new URLSearchParams({
        api_key,
        fixed: "false",
        ...props,
      })
      const json:
        | { min?: string; trace_id?: string }
        | { code?: number; error?: string; description?: string; trace_id?: string } = await (
        await fetch(`https://api.simpleswap.io/get_ranges?${search.toString()}`)
      ).json()

      if ("error" in json) throw new Error(json.error)
      if (!("min" in json)) return

      if (typeof json.min !== "string") return

      return { min: BigNumber(json.min) }
    },
  }
}

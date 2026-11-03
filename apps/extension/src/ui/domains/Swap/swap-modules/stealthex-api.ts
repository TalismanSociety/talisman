import { gandalfFetch } from "@ui/util/gandalfFetch"
import BigNumber from "bignumber.js"
import createClient from "openapi-fetch"
import type {
  paths as StealthexApi,
  SchemaCurrency as StealthexCurrency,
  SchemaExchange as StealthexExchange,
} from "./stealthex.api.gen"

const apiUrl = "https://stealthex.talisman.xyz"

const createStealthexSdk = (fetch: typeof globalThis.fetch) => {
  const api = createClient<StealthexApi>({ baseUrl: apiUrl, fetch })
  return {
    getAllCurrencies: async (): Promise<StealthexCurrency[]> => {
      const allCurrencies: StealthexCurrency[] = []

      // TODO: When worker cache isn't warm, this takes too long to fetch all requests.
      const limit = 250
      for (let offset = 0; ; offset += limit) {
        const { data: currencies } = await api.GET("/v4/currencies", {
          params: { query: { limit, offset } },
        })
        if (!Array.isArray(currencies)) break

        allCurrencies.push(...currencies)
        if (currencies.length !== 250) break
      }

      return allCurrencies
    },
    getPairs: async ({
      symbol,
      network,
    }: {
      symbol: string
      network: string
    }): Promise<StealthexCurrency["available_routes"]> => {
      const { data: currency, error } = await api.GET("/v4/currencies/{symbol}/{network}", {
        params: { path: { symbol, network }, query: { include_available_routes: "true" } },
      })
      if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
      return currency?.available_routes
    },
    getRange: async ({
      route,
      estimation,
      rate,
      additional_fee_percent,
    }: {
      route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
      estimation?: "direct" | "reversed"
      rate?: "floating" | "fixed"
      additional_fee_percent?: number
    }): Promise<{ min: BigNumber }> => {
      // default values
      estimation ||= "direct"
      rate ||= "floating"

      const params = {
        route,
        estimation,
        rate,
        additional_fee_percent,
      }
      if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
      if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

      const { data: range, error } = await api.POST("/v4/rates/range", { body: params })
      if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
      return { min: BigNumber(range?.min_amount ?? 0) }
    },
    getEstimate: async ({
      route,
      amount,
      estimation,
      rate,
      additional_fee_percent,
    }: {
      route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
      amount: number
      estimation?: "direct" | "reversed"
      rate?: "floating" | "fixed"
      additional_fee_percent?: number
    }): Promise<number> => {
      // default values
      estimation ||= "direct"
      rate ||= "floating"

      const params = {
        route,
        amount,
        estimation,
        rate,
        additional_fee_percent,
      }
      if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
      if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

      const { data: estimate, error } = await api.POST("/v4/rates/estimated-amount", {
        body: params,
      })
      if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
      return estimate?.estimated_amount
    },
    createExchange: async ({
      route,
      amount,
      estimation,
      rate,
      address,
      extra_id,
      refund_address,
      refund_extra_id,
      additional_fee_percent,
    }: {
      route: { from: { network: string; symbol: string }; to: { network: string; symbol: string } }
      amount: number
      estimation?: "direct" | "reversed"
      rate?: "floating" | "fixed"
      address: string
      extra_id?: string
      refund_address?: string
      refund_extra_id?: string
      additional_fee_percent?: number
    }): Promise<StealthexExchange> => {
      // default values
      estimation ||= "direct"
      rate ||= "floating"

      const params = {
        route,
        amount,
        estimation,
        rate,
        address,
        extra_id,
        refund_address,
        refund_extra_id,
        additional_fee_percent,
      }
      if (extra_id === undefined) delete params.extra_id
      if (refund_address === undefined) delete params.refund_address
      if (refund_extra_id === undefined) delete params.refund_extra_id
      if (params.additional_fee_percent === undefined) delete params.additional_fee_percent
      if (params.additional_fee_percent === 0.0) delete params.additional_fee_percent

      const { data: exchange, error } = await api.POST("/v4/exchanges", { body: params })
      if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
      return exchange
    },
    getExchange: async (id: string): Promise<StealthexExchange> => {
      const { data: exchange, error } = await api.GET("/v4/exchanges/{id}", {
        params: { path: { id } },
      })
      if (error) throw new Error(`${error.err.kind}: ${error.err.details}`)
      return exchange
    },
  }
}

export const stealthexSdk = createStealthexSdk(gandalfFetch)

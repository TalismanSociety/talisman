import { formatPrice, tokensToPlanck } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { COINBASE_API_BASE_PATH, log } from "extension-shared"
import { useMemo } from "react"
import urlJoin from "url-join"

import { useToken } from "@ui/state"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import { getCoinbaseBuyUrl } from "../coinbase/helpers"
import {
  CoinbaseBuyOptions,
  CoinbaseBuyQuoteRequest,
  CoinbaseBuyQuoteResponse,
} from "../coinbase/types"
import { useCoinbaseBuyOptions } from "../coinbase/useCoinbaseBuyOptions"
import { RampsBuyQuote, RampsBuyQuoteError, RampsBuyQuoteOptions } from "./types"

export const useRampsBuyQuoteCoinbase = (
  config: RampsBuyQuoteOptions | null,
): UseQueryResult<RampsBuyQuote | null, Error> => {
  const token = useToken(config?.tokenId)
  const { data: options } = useCoinbaseBuyOptions()
  const coinbaseToken = useCoinbaseTokenSpecs(config?.tokenId)

  const inputError = useMemo<RampsBuyQuoteError | null>(() => {
    if (!config || !options) return null

    if (!options.payment_currencies.length)
      return {
        type: "error",
        message: "Unavailable",
        description: "This service is not available in your region yet.",
      }

    if (!coinbaseToken)
      return {
        type: "error",
        message: "Unavailable",
        description: `Asset ${token?.symbol} is not available yet.`,
      }

    const getInputErrorDescription = (
      config: RampsBuyQuoteOptions,
      coinbaseOpts: CoinbaseBuyOptions,
    ) => {
      const limit = coinbaseOpts.payment_currencies
        .find((c) => c.id === config.currencyCode)
        ?.limits.find((l) => l.id === "CARD")
      if (!limit) return `Currency ${config.currencyCode} is not available yet.`

      if (config.amount < Number(limit.min))
        return `Minimum purchase is ${formatPrice(Number(limit.min), config.currencyCode, true)}`
      if (config.amount > Number(limit.max))
        return `Maximum purchase is ${formatPrice(Number(limit.max), config.currencyCode, true)}`
      return null
    }

    const description = getInputErrorDescription(config, options)

    return description
      ? {
          type: "error",
          message: "Unavailable",
          description,
        }
      : null
  }, [coinbaseToken, config, options, token?.symbol])

  return useQuery({
    queryKey: ["useRampsBuyQuoteCoinbase", config, coinbaseToken, inputError],
    queryFn: () => {
      if (inputError) return inputError
      if (!config || !token || !coinbaseToken) return null
      return fetchCoinbaseBuyQuote(config.currencyCode, config.amount, coinbaseToken)
    },
    select: (res: FetchCoinbaseBuyQuoteResult | null): RampsBuyQuote | null => {
      if (!res) return null
      if (res.type === "error") return res
      return res.data && token && config && coinbaseToken
        ? {
            type: "success",
            fee: Number(res.data.coinbase_fee.value) + Number(res.data.network_fee.value),
            amountOut: tokensToPlanck(res.data.purchase_amount.value, token.decimals),
            getRedirectUrl: (address: string) =>
              getCoinbaseBuyUrl(
                res.data.payment_total.currency,
                res.data.payment_total.value,
                coinbaseToken.purchaseCurrency,
                coinbaseToken.purchaseNetwork,
                res.data.quote_id,
                res.data.purchase_amount.value,
                address,
              ),
          }
        : null
    },
    retry: false,
  })
}

type CoinbaseTokenSpecs = { purchaseCurrency: string; purchaseNetwork: string }

const useCoinbaseTokenSpecs = (tokenId: string | undefined) => {
  const { data: coinbaseBuyOptions } = useCoinbaseBuyOptions()
  const token = useToken(tokenId)

  return useMemo<CoinbaseTokenSpecs | null>(() => {
    if (!token) return null

    const item = coinbaseBuyOptions?.purchase_currencies
      .flatMap((c) => c.networks.map((n) => ({ id: c.id, symbol: c.symbol, ...n })))
      .find((n) => {
        if (isEvmToken(token) && n.chain_id === token.evmNetwork?.id) {
          if (
            token.type === "evm-erc20" &&
            token.contractAddress.toLowerCase() === n.contract_address.toLowerCase()
          )
            return true
          if (token.type === "evm-native" && !n.contract_address) return true
        }

        if (isSubToken(token) && n.name === token.chain?.id && n.symbol === token.symbol)
          return true

        return false
      })

    return item ? { purchaseCurrency: item.id, purchaseNetwork: item.name } : null
  }, [coinbaseBuyOptions, token])
}

type FetchCoinbaseBuyQuoteResult =
  | { type: "success"; data: CoinbaseBuyQuoteResponse }
  | RampsBuyQuoteError

const fetchCoinbaseBuyQuote = async (
  currencyCode: string,
  amountIn: number,
  coinbaseToken: CoinbaseTokenSpecs,
): Promise<FetchCoinbaseBuyQuoteResult> => {
  const body: CoinbaseBuyQuoteRequest = {
    paymentCurrency: currencyCode,
    paymentMethod: "CARD",
    paymentAmount: amountIn.toString(),
    ...coinbaseToken,
  }

  const response = await fetch(urlJoin(COINBASE_API_BASE_PATH, "/buy/quote"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    log.error("[ramp] Coinbase quote error", response.status, response.statusText, { body })
    try {
      const error = await response.json()
      log.error("[ramp] Coinbase quote error", error)
      return getCoinbaseQuoteError(error)
    } catch (err) {
      return { type: "error", message: "Unavailable" }
    }
  }

  const data: CoinbaseBuyQuoteResponse = await response.json()
  return { type: "success", data }
}

const getCoinbaseQuoteError = (error: { code: number; message: string }): RampsBuyQuoteError => {
  return {
    type: "error",
    message: "Unavailable",
    description: error.message,
  }
}

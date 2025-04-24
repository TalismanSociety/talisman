import { formatPrice } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { COINBASE_API_BASE_PATH, log } from "extension-shared"
import { t } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import urlJoin from "url-join"

import { useToken } from "@ui/state"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import { getCoinbaseSellUrl } from "../coinbase/helpers"
import {
  CoinbaseSellOptions,
  CoinbaseSellQuoteRequest,
  CoinbaseSellQuoteResponse,
} from "../coinbase/types"
import { useCoinbaseSellOptions } from "../coinbase/useCoinbaseSellOptions"
import { RampsSellQuote, RampsSellQuoteError, RampsSellQuoteOptions } from "./types"

export const useRampsSellQuoteCoinbase = (
  config: RampsSellQuoteOptions | null,
): UseQueryResult<RampsSellQuote | null, Error> => {
  const { t } = useTranslation()
  const token = useToken(config?.tokenId)
  const { data: options } = useCoinbaseSellOptions()
  const coinbaseToken = useCoinbaseTokenSpecs(config?.tokenId)

  const minMaxAmount = useMemo(() => {
    if (!config || !options) return null

    const currency = options.cashout_currencies.find((c) => c.id === config.currencyCode)
    const limit = currency?.limits.find((l) => l.id === "FIAT_WALLET")
    if (!currency || !limit) return null

    return t("Cashout amount must be between {{min}} and {{max}}", {
      min: formatPrice(Number(limit.min), currency.id, true),
      max: formatPrice(Number(limit.max), currency.id, true),
    })

    // if (config.amount < Number(limit.min))
    //   return `Minimum sell is ${formatPrice(Number(limit.min), config.currencyCode, true)}`
    // if (config.amount > Number(limit.max))
    //   return `Maximum sell is ${formatPrice(Number(limit.max), config.currencyCode, true)}`
  }, [config, options, t])

  const inputError = useMemo<RampsSellQuoteError | null>(() => {
    if (!config || !options) return null

    if (!options.cashout_currencies.length)
      return {
        type: "error",
        message: t("Unavailable"),
        description: t("This service is not available in your region yet."),
      }

    if (!coinbaseToken)
      return {
        type: "error",
        message: t("Unavailable"),
        description: t("Asset {{symbol}} is not available yet.", { symbol: token?.symbol ?? "" }),
      }

    const getInputErrorDescription = (
      config: RampsSellQuoteOptions,
      coinbaseOpts: CoinbaseSellOptions,
    ) => {
      const limit = coinbaseOpts.cashout_currencies
        .find((c) => c.id === config.currencyCode)
        ?.limits.find((l) => l.id === "FIAT_WALLET")
      if (!limit) return t("Currency {{currencyCode}} is not available yet.", config)

      // sadly we dont know the price of the token here, so we cant validate min/max up front

      // if (config.amount < Number(limit.min))
      //   return `Minimum sell is ${formatPrice(Number(limit.min), config.currencyCode, true)}`
      // if (config.amount > Number(limit.max))
      //   return `Maximum sell is ${formatPrice(Number(limit.max), config.currencyCode, true)}`
      return null
    }

    const description = getInputErrorDescription(config, options)

    return description
      ? {
          type: "error",
          message: t("Unavailable"),
          description,
        }
      : null
  }, [coinbaseToken, config, options, t, token?.symbol])

  return useQuery({
    queryKey: ["useRampsSellQuoteCoinbase", config, coinbaseToken, inputError, minMaxAmount],
    queryFn: () => {
      if (inputError) return inputError
      if (!config || !token || !coinbaseToken) return null
      return fetchCoinbaseSellQuote(
        config.currencyCode,
        config.amount,
        coinbaseToken,
        token.decimals,
        minMaxAmount,
      )
    },
    select: (res: FetchCoinbaseSellQuoteResult | null): RampsSellQuote | null => {
      if (!res) return null
      if (res.type === "error") return res
      return res.data && token && config && coinbaseToken
        ? {
            type: "success",
            fee: Number(res.data.coinbase_fee.value),
            amountOut: Number(res.data.cashout_total.value),
            tokenPrice:
              Number(res.data.cashout_subtotal.value) / Number(res.data.sell_amount.value),
            getRedirectUrl: (address: string) =>
              getCoinbaseSellUrl(
                res.data.cashout_total.currency,
                res.data.sell_amount.value,
                coinbaseToken.sellCurrency,
                coinbaseToken.sellNetwork,
                res.data.quote_id,
                res.data.cashout_total.value,
                address,
              ),
          }
        : null
    },
    retry: false,
  })
}

type CoinbaseTokenSpecs = { sellCurrency: string; sellNetwork: string }

const useCoinbaseTokenSpecs = (tokenId: string | undefined) => {
  const { data: coinbaseBuyOptions } = useCoinbaseSellOptions()
  const token = useToken(tokenId)

  return useMemo<CoinbaseTokenSpecs | null>(() => {
    if (!token) return null

    const item = coinbaseBuyOptions?.sell_currencies
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

    return item ? { sellCurrency: item.id, sellNetwork: item.name } : null
  }, [coinbaseBuyOptions?.sell_currencies, token])
}

type FetchCoinbaseSellQuoteResult =
  | { type: "success"; data: CoinbaseSellQuoteResponse }
  | RampsSellQuoteError

const fetchCoinbaseSellQuote = async (
  currencyCode: string,
  amountIn: number,
  coinbaseToken: CoinbaseTokenSpecs,
  decimals: number,
  minMaxAmount: string | null,
): Promise<FetchCoinbaseSellQuoteResult> => {
  const body: CoinbaseSellQuoteRequest = {
    cashoutCurrency: currencyCode,
    paymentMethod: "FIAT_WALLET",
    sellAmount: formatTokens(amountIn, decimals), // dont send "1e-9" ^^
    ...coinbaseToken,
  }

  const response = await fetch(urlJoin(COINBASE_API_BASE_PATH, "/sell/quote"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    log.error("[ramp] Coinbase quote error", response.status, response.statusText)
    try {
      const error = await response.json()
      log.error("[ramp] Coinbase quote error", error)
      return getCoinbaseQuoteError(error, minMaxAmount)
    } catch (err) {
      return { type: "error", message: t("Unavailable") }
    }
  }

  const data: CoinbaseSellQuoteResponse = await response.json()
  return { type: "success", data }
}

const getCoinbaseQuoteError = (
  error: { code: number; message: string },
  minMaxAmount: string | null,
): RampsSellQuoteError => {
  const getDescription = () => {
    if (minMaxAmount && error.message.includes("purchase amount")) return minMaxAmount

    switch (error.message) {
      case "ERROR_CODE_ASSET_NOT_TRADABLE":
        return undefined
      default:
        return error.message
    }
  }

  return {
    type: "error",
    message: t("Unavailable"),
    description: getDescription(),
  }
}

const formatTokens = (tokens: number, decimals: number): string => {
  const value = tokens.toFixed(decimals)
  if (!value.includes(".")) return value // No decimal, return as-is

  // trim trailing zeros
  return value
    .replace(/(\.\d*?[1-9])0+$/, "$1") // Remove trailing zeros
    .replace(/\.0+$/, "") // Remove trailing .0 or .000...
}

import { isTokenDot, isTokenEth } from "@talismn/chaindata-provider"
import { formatPrice } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import BigNumber from "bignumber.js"
import { log, RAMPS_COINBASE_API_BASE_PATH } from "extension-shared"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import urlJoin from "url-join"

import { useToken } from "@ui/state"

import { RampsSellQuote, RampsSellQuoteOptions } from "../sell/types"
import { getRampsQuoteError } from "../shared/getRampsQuoteError"
import { RampsQuoteError } from "../shared/types"
import { getCoinbaseSellUrl } from "./helpers"
import { CoinbaseSellOptions, CoinbaseSellQuoteRequest, CoinbaseSellQuoteResponse } from "./types"
import { useCoinbaseSellOptions } from "./useCoinbaseSellOptions"

export const useCoinbaseSellQuote = (
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
  }, [config, options, t])

  const inputError = useMemo<RampsQuoteError | null>(() => {
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
                coinbaseToken.sellSymbol,
                coinbaseToken.sellNetwork,
                res.data.quote_id,
                address,
              ),
          }
        : null
    },
    retry: false,
  })
}

type CoinbaseTokenSpecs = { sellCurrency: string; sellSymbol: string; sellNetwork: string }

const useCoinbaseTokenSpecs = (tokenId: string | undefined) => {
  const { data: coinbaseBuyOptions } = useCoinbaseSellOptions()
  const token = useToken(tokenId)

  return useMemo<CoinbaseTokenSpecs | null>(() => {
    if (!token) return null

    const item = coinbaseBuyOptions?.sell_currencies
      .flatMap((c) => c.networks.map((n) => ({ id: c.id, symbol: c.symbol, ...n })))
      .find((n) => {
        if (isTokenEth(token) && n.chain_id === token.networkId) {
          if (
            token.type === "evm-erc20" &&
            token.contractAddress.toLowerCase() === n.contract_address.toLowerCase()
          )
            return true
          if (token.type === "evm-native" && !n.contract_address) return true
        }

        if (isTokenDot(token) && n.name === token.networkId && n.symbol === token.symbol)
          return true

        return false
      })

    return item ? { sellCurrency: item.id, sellSymbol: item.symbol, sellNetwork: item.name } : null
  }, [coinbaseBuyOptions?.sell_currencies, token])
}

type FetchCoinbaseSellQuoteResult =
  | { type: "success"; data: CoinbaseSellQuoteResponse }
  | RampsQuoteError

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
    sellAmount: BigNumber(amountIn).decimalPlaces(decimals, BigNumber.ROUND_DOWN).toString(10),
    ...coinbaseToken,
  }

  const response = await fetch(urlJoin(RAMPS_COINBASE_API_BASE_PATH, "/sell/quote"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    log.error("[ramp] Coinbase quote error", response.status, response.statusText)
    const error = await response.json()
    const description =
      minMaxAmount && error.message.includes("purchase amount") ? minMaxAmount : undefined

    return getRampsQuoteError(description)
  }

  const data: CoinbaseSellQuoteResponse = await response.json()
  return { type: "success", data }
}

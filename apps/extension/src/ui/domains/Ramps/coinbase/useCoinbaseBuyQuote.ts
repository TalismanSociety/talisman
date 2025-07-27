import { isTokenDot, isTokenEth } from "@talismn/chaindata-provider"
import { formatPrice, tokensToPlanck } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { RAMPS_COINBASE_API_BASE_PATH } from "extension-shared"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import urlJoin from "url-join"

import { useToken } from "@ui/state"

import { RampsBuyQuote, RampsBuyQuoteOptions } from "../buy/types"
import { getRampsQuoteError } from "../shared/getRampsQuoteError"
import { RampsQuoteError } from "../shared/types"
import { getCoinbaseBuyUrl } from "./helpers"
import { CoinbaseBuyOptions, CoinbaseBuyQuoteRequest, CoinbaseBuyQuoteResponse } from "./types"
import { useCoinbaseBuyOptions } from "./useCoinbaseBuyOptions"

export const useCoinbaseBuyQuote = (
  config: RampsBuyQuoteOptions | null,
): UseQueryResult<RampsBuyQuote | null, Error> => {
  const { t } = useTranslation()
  const token = useToken(config?.tokenId)
  const { data: options } = useCoinbaseBuyOptions()
  const coinbaseToken = useCoinbaseTokenSpecs(config?.tokenId)

  const inputError = useMemo<RampsQuoteError | null>(() => {
    if (!config || !options) return null

    if (!options.payment_currencies.length)
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
      config: RampsBuyQuoteOptions,
      coinbaseOpts: CoinbaseBuyOptions,
    ) => {
      const limit = coinbaseOpts.payment_currencies
        .find((c) => c.id === config.currencyCode)
        ?.limits.find((l) => l.id === "CARD")
      if (!limit) return t("Currency {{currencyCode}} is not available yet.", config)

      if (config.amount < Number(limit.min))
        return t("Minimum purchase is {{value}}", {
          value: formatPrice(Number(limit.min), config.currencyCode, true),
        })
      if (config.amount > Number(limit.max))
        return t("Maximum purchase is {{value}}", {
          value: formatPrice(Number(limit.max), config.currencyCode, true),
        })

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
                coinbaseToken.purchaseSymbol,
                coinbaseToken.purchaseNetwork,
                res.data.quote_id,
                address,
              ),
          }
        : null
    },
    retry: false,
  })
}

type CoinbaseTokenSpecs = {
  purchaseCurrency: string
  purchaseSymbol: string
  purchaseNetwork: string
}

const useCoinbaseTokenSpecs = (tokenId: string | undefined) => {
  const { data: coinbaseBuyOptions } = useCoinbaseBuyOptions()
  const token = useToken(tokenId)

  return useMemo<CoinbaseTokenSpecs | null>(() => {
    if (!token) return null

    const item = coinbaseBuyOptions?.purchase_currencies
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

    return item
      ? { purchaseCurrency: item.id, purchaseSymbol: item.symbol, purchaseNetwork: item.name }
      : null
  }, [coinbaseBuyOptions, token])
}

type FetchCoinbaseBuyQuoteResult =
  | { type: "success"; data: CoinbaseBuyQuoteResponse }
  | RampsQuoteError

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

  const response = await fetch(urlJoin(RAMPS_COINBASE_API_BASE_PATH, "/buy/quote"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) return getRampsQuoteError()

  const data: CoinbaseBuyQuoteResponse = await response.json()
  return { type: "success", data }
}

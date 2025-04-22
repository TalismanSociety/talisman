import { formatPrice, tokensToPlanck } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo } from "react"

import { useToken } from "@ui/state"

import { getRampApiUrl } from "../ramp/getRampApiUrl"
import { getRampSellUrl } from "../ramp/helpers"
import { RampSellQuoteResult } from "../ramp/types"
import { RampCryptoAsset, useRampCryptoAsset } from "../ramp/useRampCryptoAsset"
import { useRampCurrencies } from "../ramp/useRampCurrencies"
import { RampsSellQuote, RampsSellQuoteError, RampsSellQuoteOptions } from "./types"

export const useRampsSellQuoteRamp = (
  config: RampsSellQuoteOptions | null,
): UseQueryResult<RampsSellQuote | null, Error> => {
  const token = useToken(config?.tokenId)
  const rampCryptoAsset = useRampCryptoAsset(config?.currencyCode, config?.tokenId, "sell")
  const { data: currencies } = useRampCurrencies()

  const inputError = useMemo<RampsSellQuoteError | null>(() => {
    if (!config || !currencies) return null

    const currency = currencies.find(
      (c) => c.fiatCurrency === config.currencyCode && c.onrampAvailable,
    )
    if (!currency)
      return {
        type: "error",
        message: "Unavailable",
        description: `Currency ${config.currencyCode} is not available yet.`,
      }

    if (!rampCryptoAsset)
      return {
        type: "error",
        message: "Unavailable",
        description: `This token is not available`,
      }

    const getInputErrorDescription = (config: RampsSellQuoteOptions, asset: RampCryptoAsset) => {
      const fiatAmount = config.amount * asset.price

      if (typeof asset.min === "number" && fiatAmount < asset.min)
        return `Minimum sell is ${formatPrice(asset.min, config.currencyCode, true)}`
      if (typeof asset.max === "number" && fiatAmount > asset.max)
        return `Maximum sell is ${formatPrice(asset.max, config.currencyCode, true)}`
      return null
    }

    const description = getInputErrorDescription(config, rampCryptoAsset)

    return description
      ? {
          type: "error",
          message: "Unavailable",
          description,
        }
      : null
  }, [config, currencies, rampCryptoAsset])

  return useQuery({
    queryKey: ["useRampsSellQuoteRamp", config, rampCryptoAsset, inputError],
    queryFn: () => {
      if (inputError) return inputError

      if (!config || !token || !rampCryptoAsset) return null

      const planckIn = tokensToPlanck(config.amount.toString(), token.decimals)

      return fetchRampSellQuote(config.currencyCode, rampCryptoAsset.id, planckIn)
    },
    select: (res: FetchRampSellQuoteResult | null): RampsSellQuote | null => {
      if (!res) return null
      if (res.type === "error") return res

      // TODO consider other payout options ?
      return res.data.CARD && config && token
        ? {
            type: "success",
            fee: res.data.CARD.appliedFee,
            amountOut: res.data.CARD.fiatValue,
            tokenPrice: res.data.asset.price[config.currencyCode],
            getRedirectUrl: (address: string) =>
              getRampSellUrl(
                config.currencyCode,
                res.data.CARD.cryptoAmount,
                token.symbol,
                address,
              ),
          }
        : null
    },
    retry: false,
  })
}

type FetchRampSellQuoteResult = { type: "success"; data: RampSellQuoteResult } | RampsSellQuoteError

const fetchRampSellQuote = async (
  currencyCode: string,
  cryptoAssetSymbol: string,
  plancks: string,
): Promise<FetchRampSellQuoteResult> => {
  const url = await getRampApiUrl("/offramp/quote/all")

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fiatCurrency: currencyCode,
      cryptoAssetSymbol,
      cryptoAmount: plancks,
    }),
  })

  if (!response.ok) {
    log.error("[ramp] Ramp quote error", response.status, response.statusText)
    if (response.status === 403) return { type: "error", message: "Unavailable in your region" }
    try {
      const error = await response.json()
      return getRampErrorMessage(error)
    } catch (err) {
      return { type: "error", message: "Unavailable" }
    }
  }

  const data: RampSellQuoteResult = await response.json()
  return { type: "success", data }
}

const getRampErrorMessage = (error: { code: string }): RampsSellQuoteError => {
  const getDescription = (code: string) => {
    switch (code) {
      case "SWAP.VALIDATION.SWAP_VALUE_IS_ZERO":
        return "Insufficent amount"
      default:
        return undefined
    }
  }

  return {
    type: "error",
    message: "Unavailable",
    description: getDescription(error.code),
  }
}

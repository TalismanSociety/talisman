import { formatPrice } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { log } from "extension-shared"
import { t } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useToken } from "@ui/state"

import { getRampApiUrl } from "../ramp/getRampApiUrl"
import { getRampBuyUrl } from "../ramp/helpers"
import { RampBuyQuoteResult } from "../ramp/types"
import { RampCryptoAsset, useRampCryptoAsset } from "../ramp/useRampCryptoAsset"
import { useRampCurrencies } from "../ramp/useRampCurrencies"
import { RampsBuyQuote, RampsBuyQuoteError, RampsBuyQuoteOptions } from "./types"

export const useRampsBuyQuoteRamp = (
  config: RampsBuyQuoteOptions | null,
): UseQueryResult<RampsBuyQuote | null, Error> => {
  const { t } = useTranslation()
  const token = useToken(config?.tokenId)
  const rampCryptoAsset = useRampCryptoAsset(config?.currencyCode, config?.tokenId, "buy")
  const { data: currencies } = useRampCurrencies()

  const inputError = useMemo<RampsBuyQuoteError | null>(() => {
    if (!config || !currencies) return null

    const currency = currencies.find(
      (c) => c.fiatCurrency === config.currencyCode && c.onrampAvailable,
    )
    if (!currency)
      return {
        type: "error",
        message: t("Unavailable"),
        description: t("Currency {{currencyCode}} is not available yet.", config),
      }

    if (!rampCryptoAsset)
      return {
        type: "error",
        message: t("Unavailable"),
        description: t("Asset {{symbol}} is not available yet.", { symbol: token?.symbol ?? "" }),
      }

    const getInputErrorDescription = (config: RampsBuyQuoteOptions, asset: RampCryptoAsset) => {
      if (typeof asset.min === "number" && config.amount < asset.min)
        return t("Minimum purchase is {{value}}", {
          value: formatPrice(asset.min, config.currencyCode, true),
        })
      if (typeof asset.max === "number" && config.amount > asset.max)
        return t("Maximum purchase is {{value}}", {
          value: formatPrice(asset.max, config.currencyCode, true),
        })

      return null
    }

    const description = getInputErrorDescription(config, rampCryptoAsset)

    return description
      ? {
          type: "error",
          message: t("Unavailable"),
          description,
        }
      : null
  }, [config, currencies, rampCryptoAsset, t, token?.symbol])

  return useQuery({
    queryKey: ["useRampsBuyQuoteRamp", config, rampCryptoAsset, inputError],
    queryFn: () => {
      if (inputError) return inputError
      if (!config || !token || !rampCryptoAsset) return null
      return fetchRampBuyQuote(config.currencyCode, rampCryptoAsset.id, config.amount)
    },
    select: (res: FetchRampBuyQuoteResult | null): RampsBuyQuote | null => {
      if (!res) return null
      if (res.type === "error") return res
      return res.data.CARD_PAYMENT && config && rampCryptoAsset
        ? {
            type: "success",
            fee: res.data.CARD_PAYMENT.appliedFee,
            amountOut: res.data.CARD_PAYMENT.cryptoAmount,
            getRedirectUrl: (address: string) =>
              getRampBuyUrl(config.currencyCode, config.amount, rampCryptoAsset.id, address),
          }
        : null
    },
    retry: false,
  })
}

type FetchRampBuyQuoteResult = { type: "success"; data: RampBuyQuoteResult } | RampsBuyQuoteError

const fetchRampBuyQuote = async (
  currencyCode: string,
  cryptoAssetSymbol: string,
  amount: number,
): Promise<FetchRampBuyQuoteResult> => {
  const url = await getRampApiUrl("/onramp/quote/all")

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fiatCurrency: currencyCode,
      cryptoAssetSymbol,
      fiatValue: amount,
    }),
  })

  if (!response.ok) {
    log.error("[ramp] Ramp quote error", response.status, response.statusText)
    if (response.status === 403)
      return {
        type: "error",
        message: t("Unavailable"),
        description: t("This service is not available in your region yet."),
      }
    try {
      const error = await response.json()
      return getRampErrorMessage(error)
    } catch (err) {
      return { type: "error", message: "Unavailable" }
    }
  }

  const data: RampBuyQuoteResult = await response.json()
  return { type: "success", data }
}

const getRampErrorMessage = (error: { code: string }): RampsBuyQuoteError => {
  const getDescription = (code: string) => {
    switch (code) {
      case "SWAP.VALIDATION.SWAP_VALUE_IS_ZERO":
        return t("Insufficent amount")
      default:
        return undefined
    }
  }

  return {
    type: "error",
    message: t("Unavailable"),
    description: getDescription(error.code),
  }
}

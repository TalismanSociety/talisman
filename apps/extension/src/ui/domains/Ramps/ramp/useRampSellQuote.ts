import { formatPrice, tokensToPlanck } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { log, RAMPS_RAMP_API_URL } from "extension-shared"
import { t } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useToken } from "@ui/state"

import { RampsSellQuote, RampsSellQuoteOptions } from "../sell/types"
import { getRampsQuoteError } from "../shared/getRampsQuoteError"
import { RampsQuoteError } from "../shared/types"
import { useCountryCode } from "../shared/useCountryCode"
import { getRampSellUrl } from "./helpers"
import { RampSellQuoteResult } from "./types"
import { RampCryptoAsset, useRampCryptoAsset } from "./useRampCryptoAsset"
import { useRampCurrencies } from "./useRampCurrencies"

export const useRampSellQuote = (
  config: RampsSellQuoteOptions | null,
): UseQueryResult<RampsSellQuote | null, Error> => {
  const { t } = useTranslation()
  const token = useToken(config?.tokenId)
  const rampCryptoAsset = useRampCryptoAsset(config?.currencyCode, config?.tokenId, "sell")
  const { data: currencies } = useRampCurrencies()
  const { data: countryInfo } = useCountryCode()

  const inputError = useMemo<RampsQuoteError | null>(() => {
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

    const getInputErrorDescription = (config: RampsSellQuoteOptions, asset: RampCryptoAsset) => {
      const fiatAmount = config.amount * asset.price

      if (typeof asset.min === "number" && fiatAmount < asset.min)
        return t("Minimum sell is {{value}}", {
          value: formatPrice(asset.min, config.currencyCode, true),
        })
      if (typeof asset.max === "number" && fiatAmount > asset.max)
        return t("Maximum sell is {{value}}", {
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

      return res.data.CARD && config && rampCryptoAsset
        ? {
            type: "success",
            fee: res.data.CARD.appliedFee,
            amountOut: res.data.CARD.fiatValue,
            tokenPrice: res.data.asset.price[config.currencyCode],
            getRedirectUrl: (address: string) =>
              getRampSellUrl(
                rampCryptoAsset.id,
                res.data.CARD.cryptoAmount,
                address,
                config.currencyCode,
                countryInfo?.countryCode ?? "",
              ),
          }
        : null
    },
    retry: false,
  })
}

type FetchRampSellQuoteResult = { type: "success"; data: RampSellQuoteResult } | RampsQuoteError

const fetchRampSellQuote = async (
  currencyCode: string,
  cryptoAssetSymbol: string,
  plancks: string,
): Promise<FetchRampSellQuoteResult> => {
  const url = `${RAMPS_RAMP_API_URL}/api/host-api/v3/offramp/quote/all`

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
    const description =
      response.status === 403 ? t("This service is not available in your region yet.") : undefined

    return getRampsQuoteError(description)
  }

  const data: RampSellQuoteResult = await response.json()
  return { type: "success", data }
}

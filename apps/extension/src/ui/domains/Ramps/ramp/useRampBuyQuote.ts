import { formatPrice } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { log, RAMPS_RAMP_API_URL } from "extension-shared"
import { t } from "i18next"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useToken } from "@ui/state"

import { RampsBuyQuote, RampsBuyQuoteOptions } from "../buy/types"
import { getRampsQuoteError } from "../shared/getRampsQuoteError"
import { RampsQuoteError } from "../shared/types"
import { useCountryCode } from "../shared/useCountryCode"
import { getRampBuyUrl } from "./helpers"
import { RampBuyQuoteResult } from "./types"
import { RampCryptoAsset, useRampCryptoAsset } from "./useRampCryptoAsset"
import { useRampCurrencies } from "./useRampCurrencies"

export const useRampBuyQuote = (
  config: RampsBuyQuoteOptions | null,
): UseQueryResult<RampsBuyQuote | null, Error> => {
  const { t } = useTranslation()
  const token = useToken(config?.tokenId)
  const rampCryptoAsset = useRampCryptoAsset(config?.currencyCode, config?.tokenId, "buy")
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
              getRampBuyUrl(
                config.currencyCode,
                config.amount,
                rampCryptoAsset.id,
                address,
                countryInfo?.countryCode ?? "",
              ),
          }
        : null
    },
    retry: false,
  })
}

type FetchRampBuyQuoteResult = { type: "success"; data: RampBuyQuoteResult } | RampsQuoteError

const fetchRampBuyQuote = async (
  currencyCode: string,
  cryptoAssetSymbol: string,
  amount: number,
): Promise<FetchRampBuyQuoteResult> => {
  const url = `${RAMPS_RAMP_API_URL}/api/host-api/v3/onramp/quote/all`

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

    const description =
      response.status === 403 ? t("This service is not available in your region yet.") : undefined

    return getRampsQuoteError(description)
  }

  const data: RampBuyQuoteResult = await response.json()
  return { type: "success", data }
}

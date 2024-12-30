import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { RAMP_API_BASE_PATH, RAMP_API_KEY } from "extension-shared"

import { RampCurrencyWithAssets } from "../types"

const fetchRampQuote = async ({
  currencyCode,
  swapAsset,
  tokenAmount,
  fiatAmount,
  isFiatQuote,
}: {
  currencyCode: string
  swapAsset: string
  tokenAmount: string
  fiatAmount: number
  isFiatQuote: boolean
}): Promise<RampCurrencyWithAssets> => {
  try {
    const requestBody: Record<string, string | number> = {
      fiatCurrency: currencyCode,
      cryptoAssetSymbol: swapAsset,
    }

    if (isFiatQuote) {
      requestBody.fiatValue = fiatAmount
    } else {
      requestBody.cryptoAmount = tokenAmount
    }

    return await (
      await fetch(`${RAMP_API_BASE_PATH}/onramp/quote/all/?hostApiKey=${RAMP_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
    ).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp assets", { cause })
  }
}

export const useGetRampQuote = ({
  currencyCode,
  swapAsset,
  tokenAmount,
  fiatAmount,
  isFiatQuote,
}: {
  currencyCode: string
  swapAsset: string
  tokenAmount: string
  fiatAmount: number
  isFiatQuote: boolean
}) => {
  return useQuery({
    queryKey: ["useGetRampQuote", currencyCode, swapAsset, tokenAmount, isFiatQuote, fiatAmount],
    queryFn: () =>
      fetchRampQuote({ currencyCode, swapAsset, tokenAmount, fiatAmount, isFiatQuote }),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: !!currencyCode && isFiatQuote ? fiatAmount > 0 : Number(tokenAmount) > 0,
  })
}

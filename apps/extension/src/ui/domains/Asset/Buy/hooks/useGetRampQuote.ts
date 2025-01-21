import { useQuery } from "@tanstack/react-query"

import { useRemoteConfig } from "@ui/state"

import { RampQuote } from "../types"

const fetchRampQuote = async ({
  currencyCode,
  swapAsset,
  tokenAmount,
  fiatAmount,
  isFiatQuote,
  isBuyForm,
  rampApiBasePath,
  rampApiKey,
}: {
  currencyCode: string
  swapAsset: string
  tokenAmount: string
  fiatAmount: number
  isFiatQuote: boolean
  isBuyForm: boolean
  rampApiBasePath: string | undefined
  rampApiKey: string | undefined
}): Promise<RampQuote> => {
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

    const response = await fetch(
      `${rampApiBasePath}/${isBuyForm ? "onramp" : "offramp"}/quote/all/?hostApiKey=${rampApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return await response.json()
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
  isBuyForm,
  isEnabled,
  retry = true,
}: {
  currencyCode: string
  swapAsset: string
  tokenAmount: string
  fiatAmount: number
  isFiatQuote: boolean
  isBuyForm: boolean
  isEnabled: boolean
  retry?: boolean
}) => {
  const {
    rampConfig: { rampApiBasePath, rampApiKey },
  } = useRemoteConfig()

  return useQuery({
    queryKey: [
      "useGetRampQuote",
      currencyCode,
      swapAsset,
      tokenAmount,
      fiatAmount,
      { isFiatQuote, isBuyForm },
    ],
    queryFn: () =>
      fetchRampQuote({
        currencyCode,
        swapAsset,
        tokenAmount,
        fiatAmount,
        isFiatQuote,
        isBuyForm,
        rampApiBasePath,
        rampApiKey,
      }),
    staleTime: 1000 * 60,
    retry,
    enabled: isEnabled && !!currencyCode && isFiatQuote ? fiatAmount > 0 : Number(tokenAmount) > 0,
  })
}

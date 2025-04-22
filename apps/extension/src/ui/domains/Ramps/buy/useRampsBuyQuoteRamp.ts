import { formatPrice } from "@talismn/util"
import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo } from "react"

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
        message: "Unavailable",
        description: `Currency ${config.currencyCode} is not available yet.`,
      }

    if (!rampCryptoAsset)
      return {
        type: "error",
        message: "Unavailable",
        description: `Asset ${token?.symbol} is not available yet.`,
      }

    const getInputErrorDescription = (config: RampsBuyQuoteOptions, asset: RampCryptoAsset) => {
      if (typeof asset.min === "number" && config.amount < asset.min)
        return `Minimum purchase is ${formatPrice(asset.min, config.currencyCode, true)}`
      if (typeof asset.max === "number" && config.amount > asset.max)
        return `Maximum purchase is ${formatPrice(asset.max, config.currencyCode, true)}`
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
  }, [config, currencies, rampCryptoAsset, token?.symbol])

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
      return res.data.CARD_PAYMENT && config && token
        ? {
            type: "success",
            fee: res.data.CARD_PAYMENT.appliedFee,
            amountOut: res.data.CARD_PAYMENT.cryptoAmount,
            getRedirectUrl: (address: string) =>
              getRampBuyUrl(config.currencyCode, config.amount, token.symbol, address),
          }
        : null
    },
    retry: false,
  })
}

// // TODO helpers ?
// const getRampTokenType = (type: Token["type"]) => {
//   switch (type) {
//     case "evm-erc20":
//       return "ERC20"
//     case "substrate-native":
//     case "evm-native":
//       return "NATIVE"
//     default:
//       return null
//   }
// }

// // TODO helpers ?
// const getRampChainId = (remoteConfig: RemoteConfigStoreData, talismanNetworkId: string) => {
//   const entry = Object.entries(remoteConfig.rampNetworks).find(
//     ([, talismanId]) => talismanId === talismanNetworkId,
//   )
//   return entry ? entry[0] : undefined
// }

// type RampCryptoAsset = {
//   id: string
//   min: number | null
//   max: number | null
// }

// const useRampBuyCryptoAsset = (
//   currencyCode: string | undefined,
//   tokenId: string | undefined,
// ): RampCryptoAsset | null => {
//   const { data: rampAssets } = useRampTokens(currencyCode, "buy")
//   const token = useToken(tokenId)
//   const remoteConfig = useRemoteConfig()

//   return useMemo(() => {
//     if (!token) return null
//     const type = getRampTokenType(token.type)
//     const chainId = getRampChainId(remoteConfig, token.evmNetwork?.id ?? token.chain?.id ?? "")

//     if (!type || !chainId) return null

//     const asset = rampAssets?.assets.find(
//       (a) =>
//         a.chain === chainId &&
//         a.type === type &&
//         (token.type !== "evm-erc20" ||
//           a.address?.toLowerCase() === token.contractAddress.toLowerCase()),
//     )

//     return asset
//       ? {
//           id: `${asset.chain}_${asset.symbol}`,
//           min: asset.minPurchaseAmount === -1 ? null : asset.minPurchaseAmount,
//           max: asset.maxPurchaseAmount === -1 ? null : asset.maxPurchaseAmount,
//         }
//       : null
//   }, [rampAssets?.assets, remoteConfig, token])
// }

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
    if (response.status === 403) return { type: "error", message: "Unavailable in your region" }
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

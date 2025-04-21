import { useMemo } from "react"

import { RampBuyQuoteOptions, RampBuyQuoteQuery } from "./types"
import { useRampBuyQuoteCoinbase } from "./useRampBuyQuoteCoinbase"
import { useRampBuyQuoteRamp } from "./useRampBuyQuoteRamp"

// export type RampBuyQuoteOptions = {
//   currencyCode: string
//   tokenId: string
//   amount: number
// }

// export type RampBuyQuoteError = {
//   type: "error"
//   message: string
//   description?: string
// }

// export type RampBuyQuoteSuccess = {
//   type: "success"
//   amountOut: string
//   fee: number
//   getRedirectUrl: (address: string) => string | Promise<string> // TODO remove string ?
// }

// export type RampBuyQuote = RampBuyQuoteError | RampBuyQuoteSuccess

// export type RampBuyQuoteQuery = {
//   provider: RampProvider
//   query: UseQueryResult<RampBuyQuote | null, Error>
// }

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

// const getRampChainId = (remoteConfig: RemoteConfigStoreData, talismanNetworkId: string) => {
//   const entry = Object.entries(remoteConfig.rampNetworks).find(
//     ([, talismanId]) => talismanId === talismanNetworkId,
//   )
//   return entry ? entry[0] : undefined
// }

// export const useRampBuyCryptoAssetSymbol = (
//   currencyCode: string | undefined,
//   tokenId: string | undefined,
// ) => {
//   const { data: rampAssets } = useRampTokensRamp(currencyCode)
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

//     return asset ? `${asset.chain}_${asset.symbol}` : null
//   }, [rampAssets?.assets, remoteConfig, token])
// }

// type CoinbaseTokenSpecs = { purchaseCurrency: string; purchaseNetwork: string }

// export const useCoinbaseTokenSpecs = (tokenId: string | undefined) => {
//   const { data: coinbaseBuyOptions } = useCoinbaseBuyOptions()
//   const token = useToken(tokenId)

//   return useMemo<CoinbaseTokenSpecs | null>(() => {
//     if (!token) return null

//     const item = coinbaseBuyOptions?.purchase_currencies
//       .flatMap((c) => c.networks.map((n) => ({ id: c.id, symbol: c.symbol, ...n })))
//       .find((n) => {
//         if (isEvmToken(token) && n.chain_id === token.evmNetwork?.id) {
//           if (
//             token.type === "evm-erc20" &&
//             token.contractAddress.toLowerCase() === n.contract_address.toLowerCase()
//           )
//             return true
//           if (token.type === "evm-native" && !n.contract_address) return true
//         }

//         if (isSubToken(token) && n.name === token.chain?.id && n.symbol === token.symbol)
//           return true

//         return false
//       })

//     return item ? { purchaseCurrency: item.id, purchaseNetwork: item.name } : null
//   }, [coinbaseBuyOptions?.purchase_currencies, token])
// }

// const useRampBuyQuoteCoinbase = (
//   config: RampBuyQuoteOptions | null,
// ): UseQueryResult<RampBuyQuote | null, Error> => {
//   const token = useToken(config?.tokenId)
//   const { data: options } = useCoinbaseBuyOptions()
//   const coinbaseToken = useCoinbaseTokenSpecs(config?.tokenId)

//   const inputError = useMemo<RampBuyQuoteError | null>(() => {
//     if (!config || !options) return null

//     const getInputErrorDescription = (
//       config: RampBuyQuoteOptions,
//       coinbaseOpts: CoinbaseBuyOptions,
//     ) => {
//       const limit = coinbaseOpts.payment_currencies
//         .find((c) => c.id === config.currencyCode)
//         ?.limits.find((l) => l.id === "CARD")
//       if (!limit) return `Currency ${config.currencyCode} is not available`

//       if (config.amount < Number(limit.min))
//         return `Minimum purchase is ${formatPrice(Number(limit.min), config.currencyCode, true)}`
//       if (config.amount > Number(limit.max))
//         return `Maximum purchase is ${formatPrice(Number(limit.max), config.currencyCode, true)}`
//       return null
//     }

//     const description = getInputErrorDescription(config, options)

//     return description
//       ? {
//           type: "error",
//           message: "Unavailable",
//           description,
//         }
//       : null
//   }, [config, options])

//   return useQuery({
//     queryKey: ["useRampBuyQuoteCoinbase", config, coinbaseToken, inputError],
//     queryFn: () => {
//       if (!config || !token || !coinbaseToken) return null

//       if (inputError) return inputError

//       return fetchCoinbaseBuyQuote(config.currencyCode, config.amount, coinbaseToken)
//     },
//     select: (res: FetchCoinbaseBuyQuoteResult | null): RampBuyQuote | null => {
//       if (!res) return null
//       if (res.type === "error") return res
//       return res.data && token && config && coinbaseToken
//         ? {
//             type: "success",
//             fee: Number(res.data.coinbase_fee.value) + Number(res.data.network_fee.value),
//             amountOut: tokensToPlanck(res.data.purchase_amount.value, token.decimals),
//             getRedirectUrl: (address: string) =>
//               getCoinbaseBuyUrl(
//                 res.data.payment_total.currency,
//                 res.data.payment_total.value,
//                 coinbaseToken.purchaseCurrency,
//                 coinbaseToken.purchaseNetwork,
//                 res.data.quote_id,
//                 res.data.purchase_amount.value,
//                 address,
//               ),
//           }
//         : null
//     },
//     retry: false,
//   })
// }

// const useRampBuyQuoteRamp = (
//   config: RampBuyQuoteOptions | null,
// ): UseQueryResult<RampBuyQuote | null, Error> => {
//   const token = useToken(config?.tokenId)
//   const rampCryptoAssetSymbol = useRampBuyCryptoAssetSymbol(config?.currencyCode, config?.tokenId)

//   return useQuery({
//     queryKey: ["rampBuyQuote", config, rampCryptoAssetSymbol],
//     queryFn: () =>
//       config && token && rampCryptoAssetSymbol
//         ? fetchRampBuyQuote(config.currencyCode, rampCryptoAssetSymbol, config.amount)
//         : null,
//     select: (res: FetchRampBuyQuoteResult | null): RampBuyQuote | null => {
//       if (!res) return null
//       if (res.type === "error") return res
//       return res.data.CARD_PAYMENT && config && token
//         ? {
//             type: "success",
//             fee: res.data.CARD_PAYMENT.appliedFee,
//             amountOut: res.data.CARD_PAYMENT.cryptoAmount,
//             getRedirectUrl: (address: string) =>
//               getRampBuyUrl(config.currencyCode, config.amount, token.symbol, address),
//           }
//         : null
//     },
//     retry: false,
//   })
// }

export const useRampBuyQuotes = (config: RampBuyQuoteOptions | null) => {
  // const rampCryptoAssetSymbol = useRampBuyCryptoAssetSymbol(config?.currencyCode, config?.tokenId)
  // const coinbaseToken = useCoinbaseTokenSpecs(config?.tokenId)
  // const token = useToken(config?.tokenId)

  // const queries = useQueries({
  //   queries: [
  //     {
  //       queryKey: ["rampBuyQuote", config, rampCryptoAssetSymbol],
  //       queryFn: () =>
  //         config && token && rampCryptoAssetSymbol
  //           ? fetchRampBuyQuote(config.currencyCode, rampCryptoAssetSymbol, config.amount)
  //           : null,
  //       select: (res: FetchRampBuyQuoteResult | null): RampBuyQuote | null => {
  //         if (!res) return null
  //         if (res.type === "error") return res
  //         return res.data.CARD_PAYMENT && config && token
  //           ? {
  //               type: "success",
  //               fee: res.data.CARD_PAYMENT.appliedFee,
  //               amountOut: res.data.CARD_PAYMENT.cryptoAmount,
  //               getRedirectUrl: (address: string) =>
  //                 getRampBuyUrl(config.currencyCode, config.amount, token.symbol, address),
  //             }
  //           : null
  //       },
  //       retry: false,
  //     },
  //     {
  //       queryKey: ["coinbaseBuyQuote", config, coinbaseToken],
  //       queryFn: () => {
  //         return config && token && coinbaseToken
  //           ? fetchCoinbaseBuyQuote(config.currencyCode, config.amount, coinbaseToken)
  //           : null
  //       },
  //       select: (res: FetchCoinbaseBuyQuoteResult | null): RampBuyQuote | null => {
  //         if (!res) return null
  //         if (res.type === "error") return res
  //         return res.data && token && config && coinbaseToken
  //           ? {
  //               type: "success",
  //               fee: Number(res.data.coinbase_fee.value) + Number(res.data.network_fee.value),
  //               amountOut: tokensToPlanck(res.data.purchase_amount.value, token.decimals),
  //               getRedirectUrl: (address: string) =>
  //                 getCoinbaseBuyUrl(
  //                   res.data.payment_total.currency,
  //                   res.data.payment_total.value,
  //                   coinbaseToken.purchaseCurrency,
  //                   coinbaseToken.purchaseNetwork,
  //                   res.data.quote_id,
  //                   res.data.purchase_amount.value,
  //                   address,
  //                 ),
  //             }
  //           : null
  //       },
  //       retry: false,
  //     },
  //   ],
  // })

  const queryRamp = useRampBuyQuoteRamp(config)
  const queryCoinbase = useRampBuyQuoteCoinbase(config)

  return useMemo<RampBuyQuoteQuery[]>(
    () => [
      { provider: "ramp", query: queryRamp },
      { provider: "coinbase", query: queryCoinbase },
    ],
    [queryRamp, queryCoinbase],
  )
}

// type FetchCoinbaseBuyQuoteResult =
//   | { type: "success"; data: CoinbaseBuyQuoteResponse }
//   | RampBuyQuoteError

// const fetchCoinbaseBuyQuote = async (
//   currencyCode: string,
//   amountIn: number,
//   coinbaseToken: CoinbaseTokenSpecs,
// ): Promise<FetchCoinbaseBuyQuoteResult> => {
//   const body: CoinbaseBuyOptionsRequestInput = {
//     paymentCurrency: currencyCode,
//     paymentMethod: "CARD",
//     paymentAmount: amountIn.toString(),
//     ...coinbaseToken,
//   }

//   const response = await fetch(urlJoin(COINBASE_API_BASE_PATH, "/buy/quote"), {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify(body),
//   })

//   if (!response.ok) {
//     log.error("[ramp] Coinbase quote error", response.status, response.statusText)
//     try {
//       const error = await response.json()
//       log.error("[ramp] Coinbase quote error", error)
//       return getCoinbaseQuoteError(error)
//     } catch (err) {
//       return { type: "error", message: "Unavailable" }
//     }
//   }

//   const data: CoinbaseBuyQuoteResponse = await response.json()
//   return { type: "success", data }
// }

// const getCoinbaseQuoteError = (error: { code: number; message: string }): RampBuyQuoteError => {
//   // switch (error.code) {
//   // case 3: invalidAmount
//   //   default:
//   //     return error.message
//   // }

//   return {
//     type: "error",
//     message: "Unavailable",
//     description: error.message,
//   }
// }

// type FetchRampBuyQuoteResult = { type: "success"; data: RampQuoteResult } | RampBuyQuoteError

// const fetchRampBuyQuote = async (
//   currencyCode: string,
//   cryptoAssetSymbol: string,
//   amount: number,
// ): Promise<FetchRampBuyQuoteResult> => {
//   const url = await getRampApiUrl("/onramp/quote/all")

//   const response = await fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       fiatCurrency: currencyCode,
//       cryptoAssetSymbol,
//       fiatValue: amount,
//     }),
//   })

//   if (!response.ok) {
//     log.error("[ramp] Ramp quote error", response.status, response.statusText)
//     if (response.status === 403) return { type: "error", message: "Unavailable in your region" }
//     try {
//       const error = await response.json()
//       return getRampErrorMessage(error)
//     } catch (err) {
//       return { type: "error", message: "Unavailable" }
//     }
//   }

//   const data: RampQuoteResult = await response.json()
//   return { type: "success", data }
// }

// const getRampErrorMessage = (error: { code: string }): RampBuyQuoteError => {
//   const getDescription = (code: string) => {
//     switch (code) {
//       case "SWAP.VALIDATION.SWAP_VALUE_IS_ZERO":
//         return "Insufficent amount"
//       default:
//         return undefined
//     }
//   }

//   return {
//     type: "error",
//     message: "Unavailable",
//     description: getDescription(error.code),
//   }
// }

// import { useMutation } from "@tanstack/react-query"
// import { RAMP_API_BASE_PATH, RAMP_API_KEY } from "extension-shared"

// import { RampQuote } from "../types"

// const fetchRampQuote = async ({
//   currencyCode,
//   swapAsset,
//   tokenAmount,
//   fiatAmount,
//   isFiatQuote,
//   isBuyForm,
// }: {
//   currencyCode: string
//   swapAsset: string
//   tokenAmount: string
//   fiatAmount: number
//   isFiatQuote: boolean
//   isBuyForm: boolean
// }): Promise<RampQuote> => {
//   try {
//     const requestBody: Record<string, string | number> = {
//       fiatCurrency: currencyCode,
//       cryptoAssetSymbol: swapAsset,
//     }

//     if (isFiatQuote) {
//       requestBody.fiatValue = fiatAmount
//     } else {
//       requestBody.cryptoAmount = tokenAmount
//     }

//     const response = await (
//       await fetch(
//         `${RAMP_API_BASE_PATH}/${isBuyForm ? "onramp" : "offramp"}/quote/all/?hostApiKey=${RAMP_API_KEY}`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(requestBody),
//         },
//       )
//     ).json()
//     // Hacky way to throw an error because POST method is being used instead of a GET for this API call
//     if (response.code || response.statusCode) {
//       throw new Error(response)
//     }
//     return response
//   } catch (cause) {
//     throw new Error("Failed to fetch Ramp assets", { cause })
//   }
// }

// export const useGetRampQuote = ({
//   currencyCode,
//   swapAsset,
//   tokenAmount,
//   fiatAmount,
//   isFiatQuote,
//   isBuyForm,
//   isEnabled,
// }: {
//   currencyCode: string
//   swapAsset: string
//   tokenAmount: string
//   fiatAmount: number
//   isFiatQuote: boolean
//   isBuyForm: boolean
//   isEnabled: boolean
// }) => {
//   return useMutation({
//     mutationKey: [
//       "useGetRampQuote",
//       currencyCode,
//       swapAsset,
//       tokenAmount,
//       fiatAmount,
//       { isFiatQuote, isBuyForm },
//     ],
//     mutationFn: () =>
//       fetchRampQuote({ currencyCode, swapAsset, tokenAmount, fiatAmount, isFiatQuote, isBuyForm }),
//     staleTime: 1000 * 60,

//     enabled: isEnabled && !!currencyCode && isFiatQuote ? fiatAmount > 0 : Number(tokenAmount) > 0,
//   })
// }

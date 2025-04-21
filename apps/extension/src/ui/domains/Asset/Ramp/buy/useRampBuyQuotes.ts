import { Token } from "@talismn/chaindata-provider"
import { tokensToPlanck } from "@talismn/util"
import { useQueries, UseQueryResult } from "@tanstack/react-query"
import { RemoteConfigStoreData } from "extension-core"
import { COINBASE_API_BASE_PATH, log } from "extension-shared"
import { useMemo } from "react"
import urlJoin from "url-join"

import { useRemoteConfig, useToken } from "@ui/state"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"

import { getCoinbaseBuyUrl } from "../coinbase/helpers"
import {
  CoinbaseBuyOptionsRequestInput,
  CoinbaseBuyQuoteResponse,
  RampProvider,
} from "../coinbase/types"
import { useCoinbaseBuyOptions } from "../coinbase/useCoinbaseBuyOptions"
import { getRampApiUrl } from "../onramp/getRampApiUrl"
import { getRampBuyUrl } from "../onramp/helpers"
import { RampQuoteResult } from "../onramp/types"
import { useRampTokensRamp } from "../onramp/useRampTokensRamp"

export type RampBuyQuoteOptions = {
  currencyCode: string
  tokenId: string
  amount: number
}

export type RampBuyQuote = {
  amountOut: string
  fee: number
  getRedirectUrl: (address: string) => string | Promise<string> // TODO remove string ?
}

export type RampBuyQuoteQuery = {
  provider: RampProvider
  quote: UseQueryResult<RampBuyQuote | null, Error>
}

const getRampTokenType = (type: Token["type"]) => {
  switch (type) {
    case "evm-erc20":
      return "ERC20"
    case "substrate-native":
    case "evm-native":
      return "NATIVE"
    default:
      return null
  }
}

const getRampChainId = (remoteConfig: RemoteConfigStoreData, talismanNetworkId: string) => {
  const entry = Object.entries(remoteConfig.rampNetworks).find(
    ([, talismanId]) => talismanId === talismanNetworkId,
  )
  return entry ? entry[0] : undefined
}

export const useRampBuyCryptoAssetSymbol = (
  currencyCode: string | undefined,
  tokenId: string | undefined,
) => {
  const { data: rampAssets } = useRampTokensRamp(currencyCode)
  const token = useToken(tokenId)
  const remoteConfig = useRemoteConfig()

  return useMemo(() => {
    if (!token) return null
    const type = getRampTokenType(token.type)
    const chainId = getRampChainId(remoteConfig, token.evmNetwork?.id ?? token.chain?.id ?? "")

    if (!type || !chainId) return null

    const asset = rampAssets?.assets.find(
      (a) =>
        a.chain === chainId &&
        a.type === type &&
        (token.type !== "evm-erc20" ||
          a.address?.toLowerCase() === token.contractAddress.toLowerCase()),
    )

    return asset ? `${asset.chain}_${asset.symbol}` : null
  }, [rampAssets?.assets, remoteConfig, token])
}

type CoinbaseTokenSpecs = { purchaseCurrency: string; purchaseNetwork: string }

export const useCoinbaseTokenSpecs = (tokenId: string | undefined) => {
  const { data: coinbaseBuyOptions } = useCoinbaseBuyOptions()
  const token = useToken(tokenId)

  return useMemo<CoinbaseTokenSpecs | null>(() => {
    if (!token) return null

    const item = coinbaseBuyOptions?.purchase_currencies
      .flatMap((c) => c.networks.map((n) => ({ id: c.id, symbol: c.symbol, ...n })))
      .find((n) => {
        if (isEvmToken(token) && n.chain_id === token.evmNetwork?.id) {
          if (
            token.type === "evm-erc20" &&
            token.contractAddress.toLowerCase() === n.contract_address.toLowerCase()
          )
            return true
          if (token.type === "evm-native" && !n.contract_address) return true
        }

        if (isSubToken(token) && n.name === token.chain?.id && n.symbol === token.symbol)
          return true

        return false
      })

    return item ? { purchaseCurrency: item.id, purchaseNetwork: item.name } : null
  }, [coinbaseBuyOptions?.purchase_currencies, token])
}

export const useRampBuyQuotes = (config: RampBuyQuoteOptions | null) => {
  const rampCryptoAssetSymbol = useRampBuyCryptoAssetSymbol(config?.currencyCode, config?.tokenId)
  const coinbaseToken = useCoinbaseTokenSpecs(config?.tokenId)
  const token = useToken(config?.tokenId)

  const queries = useQueries({
    queries: [
      {
        queryKey: ["rampBuyQuote", config, rampCryptoAssetSymbol],
        queryFn: () =>
          config && token && rampCryptoAssetSymbol
            ? fetchRampBuyQuote(config.currencyCode, rampCryptoAssetSymbol, config.amount)
            : null,
        select: (data: RampQuoteResult | null): RampBuyQuote | null =>
          data?.CARD_PAYMENT && config && token
            ? {
                // provider: "ramp",
                fee: data.CARD_PAYMENT.appliedFee,
                amountOut: data.CARD_PAYMENT.cryptoAmount,
                getRedirectUrl: (address: string) =>
                  getRampBuyUrl(config.currencyCode, config.amount, token.symbol, address),
              }
            : null,
        retry: false,
      },
      {
        queryKey: ["coinbaseBuyQuote", config, coinbaseToken],
        queryFn: () =>
          config && token && coinbaseToken
            ? fetchCoinbaseBuyQuote(config.currencyCode, config.amount, coinbaseToken)
            : null,
        select: (data: CoinbaseBuyQuoteResponse | null): RampBuyQuote | null => {
          return data && token && config && coinbaseToken
            ? {
                // provider: "coinbase",
                fee: Number(data.coinbase_fee.value) + Number(data.network_fee.value),
                amountOut: tokensToPlanck(data.purchase_amount.value, token.decimals),
                getRedirectUrl: (address: string) =>
                  getCoinbaseBuyUrl(
                    data.payment_total.currency,
                    data.payment_total.value,
                    coinbaseToken.purchaseCurrency,
                    coinbaseToken.purchaseNetwork,
                    data.quote_id,
                    data.purchase_amount.value,
                    address,
                  ),
              }
            : null
        },
        retry: false,
      },
    ],
  })

  return useMemo<RampBuyQuoteQuery[]>(
    () => [
      { provider: "ramp", quote: queries[0] },
      { provider: "coinbase", quote: queries[1] },
    ],
    [queries],
  )
}

const fetchCoinbaseBuyQuote = async (
  currencyCode: string,
  amountIn: number,
  coinbaseToken: CoinbaseTokenSpecs,
): Promise<CoinbaseBuyQuoteResponse> => {
  const body: CoinbaseBuyOptionsRequestInput = {
    paymentCurrency: currencyCode,
    paymentMethod: "CARD",
    paymentAmount: amountIn.toString(),
    ...coinbaseToken,
  }

  const response = await fetch(urlJoin(COINBASE_API_BASE_PATH, "/buy/quote"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    log.error("Failed to fetch Ramp assets", response.status, response.statusText)
    if (response.status === 403) throw new Error("Unavailable in your region")
    try {
      const error = await response.json()
      log.error("Coinbase quote error", error)
      throw new Error(getCoinbaseErrorMessage(error))
    } catch (err) {
      throw new Error("Unavailable")
    }
  }

  return await response.json()
}

const getCoinbaseErrorMessage = (error: { code: number; message: string }) => {
  switch (error.code) {
    default:
      return "Unavailable"
  }
}

const fetchRampBuyQuote = async (
  currencyCode: string,
  cryptoAssetSymbol: string,
  amount: number,
): Promise<RampQuoteResult> => {
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
    log.error("Failed to fetch Ramp assets", response.status, response.statusText)
    if (response.status === 403) throw new Error("Unavailable in your region")
    try {
      const error: { code: string } = await response.json()
      throw new Error(getRampErrorMessage(error.code))
    } catch (err) {
      throw new Error("Unavailable")
    }
  }

  // const params = new URLSearchParams({
  //   hostApiKey: rampApiKey,
  //   hostLogoUrl: TALISMAN_LOGO_URL,
  //   defaultFlow: "ONRAMP",
  //   enabledFlows: "ONRAMP,OFFRAMP",
  //   swapAsset: `${rampTokenAsset.chain}_${rampTokenAsset.symbol}`,
  //   userAddress: formattedAddress,
  //   fiatCurrency: fiatCurrency,
  //   hostAppName: "Talisman",
  // })

  // // Dynamically add the amount parameter based on the dirtyAmountField
  // if (dirtyAmountField === "fiatAmount") {
  //   params.append("fiatValue", fiatAmount.toString())
  // } else {
  //   params.append(
  //     "swapAmount",
  //     tokensToPlanck(tokenAmount.toString(), rampTokenAsset.decimals).toString(),
  //   )
  // }

  // const url = `${rampBasePath}/?${params.toString()}`

  return await response.json()
}

const getRampErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    case "SWAP.VALIDATION.SWAP_VALUE_IS_ZERO":
      return "Insufficent amount"
    default:
      return "Unavailable"
  }
}

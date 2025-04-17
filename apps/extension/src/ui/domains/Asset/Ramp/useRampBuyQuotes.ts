import { Token } from "@talismn/chaindata-provider"
import { tokensToPlanck } from "@talismn/util"
import { useQueries, UseQueryResult } from "@tanstack/react-query"
import { RemoteConfigStoreData } from "extension-core"
import { COINBASE_API_BASE_PATH, log } from "extension-shared"
import { useMemo } from "react"
import urlJoin from "url-join"

import { useRemoteConfig, useToken } from "@ui/state"

import { CoinbaseBuyOptionsRequestInput, CoinbaseBuyQuoteResponse } from "./coinbase/types"
import { useCoinbaseBuyOptions } from "./coinbase/useCoinbaseBuyOptions"
import { getRampApiUrl } from "./onramp/getRampApiUrl"
import { RampQuoteResult } from "./onramp/types"
import { useRampTokensRamp } from "./onramp/useRampTokensRamp"

export type BuyQuoteConfig = {
  currencyCode: string
  tokenId: string
  amount: number
}

export type BuyQuote = {
  provider: "coinbase" | "ramp"
  amountOut: string
  fee: number
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
      .find(
        (n) =>
          n.chain_id === (token.evmNetwork?.id ?? token.chain?.id) &&
          ((token.type === "evm-erc20" &&
            token.contractAddress.toLowerCase() === n.contract_address.toLowerCase()) ||
            (token.type === "evm-native" && !n.contract_address)),
      )

    return item ? { purchaseCurrency: item.id, purchaseNetwork: item.name } : null
  }, [coinbaseBuyOptions?.purchase_currencies, token])
}

export type RampBuyQuotes = {
  ramp: UseQueryResult<BuyQuote | null, Error>
  coinbase: UseQueryResult<BuyQuote | null, Error>
}

export const useRampBuyQuotes = (config: BuyQuoteConfig | null): RampBuyQuotes => {
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
        select: (data: RampQuoteResult | null): BuyQuote | null =>
          data?.CARD_PAYMENT
            ? {
                provider: "ramp",
                fee: data.CARD_PAYMENT.appliedFee,
                amountOut: data.CARD_PAYMENT.cryptoAmount,
              }
            : null,
      },
      {
        queryKey: ["coinbaseBuyQuote", config, coinbaseToken],
        queryFn: () =>
          config && token && coinbaseToken
            ? fetchCoinbaseBuyQuote(config.currencyCode, config.amount, coinbaseToken)
            : null,
        select: (data: CoinbaseBuyQuoteResponse | null): BuyQuote | null => {
          return data && token
            ? {
                provider: "coinbase",
                fee: Number(data.coinbase_fee.value) + Number(data.network_fee.value),
                amountOut: tokensToPlanck(data.purchase_amount.value, token.decimals),
              }
            : null
        },
      },
    ],
  })

  return { ramp: queries[0], coinbase: queries[1] }
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

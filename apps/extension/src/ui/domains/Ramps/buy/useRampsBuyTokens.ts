import { Token, TokenList } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { log } from "extension-shared"
import { groupBy } from "lodash"
import { useMemo } from "react"

import { useRemoteConfig, useTokensMap } from "@ui/state"

import { CoinbaseTokenNetwork } from "../coinbase/types"
import { useCoinbaseBuyOptions } from "../coinbase/useCoinbaseBuyOptions"
import { useRampTokens } from "../ramp/useRampTokens"

const getDotNativeTokenId = (chainId: string) => [chainId, "substrate-native"].join("-")
const getEvmNativeTokenId = (evmNetworkId: string) => [evmNetworkId, "evm-native"].join("-")
const getErc20TokenId = (evmNetworkId: string, contractAddress: string) =>
  [evmNetworkId, "evm-erc20", contractAddress.toLowerCase()].join("-")
const getDotSubstrateAssetTokenIdPrefix = (chainId: string, assetId: string) =>
  [chainId, "substrate-assets", assetId].join("-")

const getTalismanTokenFromCoinbaseToken = (
  coinbaseTokenNetwork: CoinbaseTokenNetwork,
  tokens: TokenList,
) => {
  if (coinbaseTokenNetwork.chain_id && coinbaseTokenNetwork.chain_id !== "0") {
    const tokenId = coinbaseTokenNetwork.contract_address
      ? getErc20TokenId(coinbaseTokenNetwork.chain_id, coinbaseTokenNetwork.contract_address)
      : getEvmNativeTokenId(coinbaseTokenNetwork.chain_id)
    return tokens[tokenId]
  }

  return tokens[getDotNativeTokenId(coinbaseTokenNetwork.name)] ?? null // should work only with polkadot and kusama
}

type UnfoundCoinbaseToken = {
  id: string
  name: string
  symbol: string
  networkName: string
  chainId: string
  contractAddress: string
  networkDisplayName: string
}

const useBuyTokensCoinbase = () => {
  const { data: coinbaseBuyOptions, isLoading, error } = useCoinbaseBuyOptions()

  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const tokens = useMemo<Token[] | undefined>(() => {
    const unfound: UnfoundCoinbaseToken[] = []

    const assets = coinbaseBuyOptions?.purchase_currencies
      .flatMap(({ networks, ...token }) => networks.map((n) => [token, n] as const))
      .map(([token, tokenNetwork]) => {
        const talismanToken = getTalismanTokenFromCoinbaseToken(tokenNetwork, talismanTokens)

        if (!talismanToken)
          unfound.push({
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            networkName: tokenNetwork.name,
            chainId: tokenNetwork.chain_id,
            contractAddress: tokenNetwork.contract_address,
            networkDisplayName: tokenNetwork.display_name,
          })

        return talismanToken
      })
      .filter(isNotNil)

    // @dev: have a look at this once in a while and add missing entries in remoteConfig
    if (unfound.length) log.warn("[ramps] Unfound COINBASE tokens", groupBy(unfound, "networkName"))

    return assets
  }, [coinbaseBuyOptions?.purchase_currencies, talismanTokens])

  return { tokens, isLoading, error }
}

const useBuyTokensRamp = (currency: string | undefined) => {
  const remoteConfig = useRemoteConfig()
  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const { data, isLoading, error } = useRampTokens(currency, "buy")

  const tokens = useMemo<Token[] | undefined>(() => {
    const unfound: unknown[] = []

    const assets = data?.assets
      .map((asset) => {
        const networkId = remoteConfig.rampNetworks[asset.chain]
        if (!networkId) {
          unfound.push(asset)
          return null
        }
        if (asset.type === "ERC20")
          return talismanTokens[getErc20TokenId(networkId, asset.address ?? "")]
        if (asset.type === "NATIVE")
          return (
            talismanTokens[getEvmNativeTokenId(networkId)] ??
            talismanTokens[getDotNativeTokenId(networkId)]
          )
        if (asset.type === "DOT_AH") {
          // substrate tokens have the symbol at the end of id, which might be different from coinbase's
          // => can only determine the begining of our id based on our inputs
          const tokenIdPrefix = getDotSubstrateAssetTokenIdPrefix(
            networkId,
            asset.address ?? "UNKNOWN",
          )
          const tokenId = Object.keys(talismanTokens).find((id) => id.startsWith(tokenIdPrefix))
          if (tokenId) return talismanTokens[tokenId]
        }
        return null
      })
      .filter(isNotNil)

    // @dev: have a look at this once in a while and add missing entries in remoteConfig
    if (unfound.length) log.warn("[ramps] Unfound RAMP tokens", groupBy(unfound, "chain"))

    return assets
  }, [data?.assets, remoteConfig.rampNetworks, talismanTokens])

  return { tokens, isLoading, error }
}

export const useRampsBuyTokens = (currency: string | undefined) => {
  const {
    tokens: coinbaseTokens = [],
    isLoading: isLoadingCoinbaseTokens,
    error: errorCoinbaseTokens,
  } = useBuyTokensCoinbase()

  const {
    tokens: rampTokens = [],
    isLoading: isLoadingRampTokens,
    error: errorRampTokens,
  } = useBuyTokensRamp(currency)

  const tokens = useMemo(() => {
    return Object.values(
      Object.assign(
        Object.fromEntries(coinbaseTokens.map((t) => [t.id, t])),
        Object.fromEntries(rampTokens.map((t) => [t.id, t])),
      ),
    )
  }, [coinbaseTokens, rampTokens])

  return {
    tokens,
    isLoading: isLoadingCoinbaseTokens || isLoadingRampTokens,
    error: errorCoinbaseTokens || errorRampTokens,
  }
}

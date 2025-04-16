import { Token } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useRemoteConfig, useTokensMap } from "@ui/state"

import { useCoinbaseBuyOptions } from "./coinbase/useCoinbaseBuyOptions"
import { useRampBuyAssetsByCurrency } from "./onramp/useRampBuyAssetsByCurrency"

const getDotNativeTokenId = (chainId: string) => [chainId, "substrate-native"].join("-")
const getEvmNativeTokenId = (evmNetworkId: string) => [evmNetworkId, "evm-native"].join("-")
const getErc20TokenId = (evmNetworkId: string, contractAddress: string) =>
  [evmNetworkId, "evm-erc20", contractAddress.toLowerCase()].join("-")

const useBuyTokensCoinbase = () => {
  const { data: coinbaseBuyOptions, isLoading, error } = useCoinbaseBuyOptions()

  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const tokens = useMemo<Token[] | undefined>(() => {
    // if (isLoading || error) return undefined

    return coinbaseBuyOptions?.purchase_currencies
      .flatMap((c) => c.networks)
      .map((n) => {
        if (n.chain_id && n.chain_id !== "0") {
          const tokenId = n.contract_address
            ? getErc20TokenId(n.chain_id, n.contract_address)
            : getEvmNativeTokenId(n.chain_id)
          return talismanTokens[tokenId]
        }

        return talismanTokens[getDotNativeTokenId(n.name)] // should work only with polkadot and kusama
      })
      .filter(isNotNil)
  }, [coinbaseBuyOptions?.purchase_currencies, talismanTokens])

  return { tokens, isLoading, error }
}

const useBuyTokensRamp = (currency: string | undefined) => {
  const remoteConfig = useRemoteConfig()
  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const { data, isLoading, error } = useRampBuyAssetsByCurrency(currency)

  const tokens = useMemo<Token[] | undefined>(() => {
    // if (!currency|| isLoading || error) return undefined

    return data?.assets
      .map((asset) => {
        const networkId = remoteConfig.rampNetworks[asset.chain]
        if (!networkId) return null
        if (asset.type === "ERC20") return talismanTokens[getErc20TokenId(networkId, asset.address)]
        if (asset.type === "NATIVE")
          return (
            talismanTokens[getEvmNativeTokenId(networkId)] ??
            talismanTokens[getDotNativeTokenId(networkId)]
          )
        return null
      })
      .filter(isNotNil)
  }, [data?.assets, remoteConfig.rampNetworks, talismanTokens])

  return { tokens, isLoading, error }
}

export const useRampBuyTokens = (currency: string | undefined) => {
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

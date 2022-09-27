import {
  Chain,
  ChainId,
  ChainList,
  ChaindataProvider,
  EvmNetwork,
  EvmNetworkId,
  EvmNetworkList,
  Token,
  TokenId,
  TokenList,
} from "@talismn/chaindata-provider"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"
import { useEffect, useState } from "react"

import log from "../log"

// TODO: Allow user to call useChaindata from multiple places

export function useChaindata() {
  const [chaindataProvider, setChaindataProvider] = useState<
    (ChaindataProvider & { generation?: number }) | null
  >(null)

  // this number is incremented each time the chaindataProvider has fetched new data
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const chaindataProvider = new ChaindataProviderExtension()

    let shouldHydrate = true

    const timer = 300_000 // 300_000ms = 300s = 5 minutes
    const hydrate = async () => {
      if (!shouldHydrate) return

      try {
        const updated = await chaindataProvider.hydrate()
        if (updated) setGeneration((generation) => (generation + 1) % Number.MAX_SAFE_INTEGER)
        setTimeout(hydrate, timer)
      } catch (error) {
        const retryTimeout = 5_000 // 5_000ms = 5 seconds
        log.error(
          `Failed to fetch chaindata, retrying in ${Math.round(retryTimeout / 1000)} seconds`,
          error
        )
        setTimeout(hydrate, retryTimeout)
      }
    }

    setChaindataProvider(chaindataProvider)
    hydrate()

    return () => {
      shouldHydrate = false
    }
  }, [])

  if (chaindataProvider) chaindataProvider.generation = generation
  return chaindataProvider
}

export function useChains(
  chaindata: (ChaindataProvider & { generation?: number }) | null
): ChainList {
  const [chains, setChains] = useState<ChainList>()
  useEffect(() => {
    if (!chaindata) return

    const thisGeneration = chaindata.generation
    chaindata.chains().then((chains) => {
      if (thisGeneration !== chaindata.generation) return
      setChains(chains)
    })
  }, [chaindata?.generation])

  return chains || {}
}

export function useChain(
  chaindata: (ChaindataProvider & { generation?: number }) | null,
  chainId?: ChainId
): Chain | null | undefined {
  const [chain, setChain] = useState<Chain | null | undefined>()
  useEffect(() => {
    if (chaindata === null) return
    if (!chainId) return
    chaindata.getChain(chainId).then(setChain)
  }, [chaindata?.generation])

  return chain
}

export function useEvmNetworks(
  chaindata: (ChaindataProvider & { generation?: number }) | null
): EvmNetworkList {
  const [evmNetworks, setEvmNetworks] = useState<EvmNetworkList>()
  useEffect(() => {
    if (!chaindata) return

    const thisGeneration = chaindata.generation
    chaindata.evmNetworks().then((evmNetworks) => {
      if (thisGeneration !== chaindata.generation) return
      setEvmNetworks(evmNetworks)
    })
  }, [chaindata?.generation])

  return evmNetworks || {}
}

export function useEvmNetwork(
  chaindata: (ChaindataProvider & { generation?: number }) | null,
  evmNetworkId?: EvmNetworkId
): EvmNetwork | null | undefined {
  const [evmNetwork, setEvmNetwork] = useState<EvmNetwork | null | undefined>()
  useEffect(() => {
    if (chaindata === null) return
    if (!evmNetworkId) return
    chaindata.getEvmNetwork(evmNetworkId).then(setEvmNetwork)
  }, [chaindata?.generation])

  return evmNetwork
}

export function useTokens(
  chaindata: (ChaindataProvider & { generation?: number }) | null
): TokenList {
  const [tokens, setTokens] = useState<TokenList>()
  useEffect(() => {
    if (!chaindata) return

    const thisGeneration = chaindata.generation
    chaindata.tokens().then((tokens) => {
      if (thisGeneration !== chaindata.generation) return
      setTokens(tokens)
    })
  }, [chaindata?.generation])

  return tokens || {}
}

export function useToken(
  chaindata: (ChaindataProvider & { generation?: number }) | null,
  tokenId?: TokenId
): Token | null | undefined {
  const [token, setToken] = useState<Token | null | undefined>()
  useEffect(() => {
    if (chaindata === null) return
    if (!tokenId) return
    chaindata.getToken(tokenId).then(setToken)
  }, [chaindata?.generation])

  return token
}

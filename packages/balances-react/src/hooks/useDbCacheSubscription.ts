import {
  BalanceModule,
  Balances,
  db as balancesDb,
  balances as balancesFn,
} from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChaindataProvider, TokenList } from "@talismn/chaindata-provider"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"
import { DbTokenRates, fetchTokenRates, db as tokenRatesDb } from "@talismn/token-rates"
import md5 from "blueimp-md5"
import { liveQuery } from "dexie"
import { default as debounce } from "lodash/debounce"
import { useCallback, useMemo } from "react"

import log from "../log"
import { useAllAddresses } from "./useAllAddresses"
import { useBalanceModules } from "./useBalanceModules"
import { useChainConnectors } from "./useChainConnectors"
import { useChaindata } from "./useChaindata"
import { useSharedSubscription } from "./useSharedSubscription"
import { useTokens } from "./useTokens"
import { useWithTestnets } from "./useWithTestnets"

export type DbEntityType = "chains" | "evmNetworks" | "tokens" | "tokenRates"

/**
 * This hook is responsible for fetching the data used for balances and inserting it into the db.
 */
export const useDbCacheSubscription = (subscribeTo: DbEntityType) => {
  const provider = useChaindata()

  // can't handle balances here as there are more dependencies, it would trigger to many subscriptions
  const subscribe = useCallback(() => {
    switch (subscribeTo) {
      case "chains":
        return subscribeChainDataHydrate(provider, "chains")
      case "evmNetworks":
        return subscribeChainDataHydrate(provider, "evmNetworks")
      case "tokens":
        return subscribeChainDataHydrate(provider, "tokens")
      case "tokenRates":
        return subscribeTokenRates(provider)
    }
  }, [provider, subscribeTo])

  useSharedSubscription(subscribeTo, subscribe)
}

/**
 * This hook is responsible for fetching the data used for balances and inserting it into the db.
 */
export function useDbCacheBalancesSubscription() {
  const { withTestnets } = useWithTestnets()
  const balanceModules = useBalanceModules()
  const chaindataProvider = useChaindata()
  const chainConnectors = useChainConnectors()
  const [allAddresses] = useAllAddresses()
  const tokens = useTokens(withTestnets)

  const subscriptionKey = useMemo(
    // not super sexy but we need key to change based on this stuff
    () => {
      const key = allAddresses
        .sort()
        .join()
        .concat(
          ...Object.values(tokens ?? {})
            .map(({ id }) => id)
            .sort()
        )
        .concat(
          `evm:${!!chainConnectors.evm}`,
          `sub:${!!chainConnectors.substrate}`,
          ...balanceModules.map((m) => m.type).sort(),
          `cd:${!!chaindataProvider}`
        )
      return `balances-${md5(key)}`
    },
    [allAddresses, balanceModules, chainConnectors, chaindataProvider, tokens]
  )

  const subscription = useCallback(() => {
    if (!Object.values(tokens ?? {}).length || !allAddresses.length) return () => {}
    return subscribeBalances(
      tokens ?? {},
      allAddresses,
      chainConnectors,
      chaindataProvider,
      balanceModules
    )
  }, [allAddresses, balanceModules, chainConnectors, chaindataProvider, tokens])

  useSharedSubscription(subscriptionKey, subscription)
}

const subscribeChainDataHydrate = (
  provider: ChaindataProvider,
  type: "chains" | "evmNetworks" | "tokens"
) => {
  log.debug("subscribeChainDataHydrate", type)
  const chaindata = provider as ChaindataProviderExtension
  const delay = 300_000 // 300_000ms = 300s = 5 minutes

  let timeout: NodeJS.Timeout | null = null

  const hydrate = async () => {
    try {
      if (type === "chains") await chaindata.hydrateChains()
      if (type === "evmNetworks") await chaindata.hydrateEvmNetworks()
      if (type === "tokens") await chaindata.hydrateTokens()

      timeout = setTimeout(hydrate, delay)
    } catch (error) {
      const retryTimeout = 5_000 // 5_000ms = 5 seconds
      log.error(
        `Failed to fetch chaindata, retrying in ${Math.round(retryTimeout / 1000)} seconds`,
        error
      )
      timeout = setTimeout(hydrate, retryTimeout)
    }
  }

  return () => {
    if (timeout) clearTimeout(timeout)
  }
}

const subscribeTokenRates = (provider: ChaindataProvider) => {
  const REFRESH_INTERVAL = 300_000 // 6 minutes
  const RETRY_INTERVAL = 5_000 // 5 sec

  const observeTokens = liveQuery(() => provider.tokens())

  let timeout: NodeJS.Timeout | null = null

  // debounce to prevent burst calls
  const refreshTokenRates = debounce(async (tokens) => {
    try {
      if (timeout) clearTimeout(timeout)

      const tokenRates = await fetchTokenRates(tokens)

      const putTokenRates = Object.entries(tokenRates).map(
        ([tokenId, rates]): DbTokenRates => ({
          tokenId,
          rates,
        })
      )
      tokenRatesDb.transaction(
        "rw",
        tokenRatesDb.tokenRates,
        async () => await tokenRatesDb.tokenRates.bulkPut(putTokenRates)
      )

      timeout = setTimeout(async () => {
        refreshTokenRates(await provider.tokens())
      }, REFRESH_INTERVAL)
    } catch (error) {
      log.error(
        `Failed to fetch tokenRates, retrying in ${Math.round(RETRY_INTERVAL / 1000)} seconds`,
        error
      )
      setTimeout(async () => {
        refreshTokenRates(await provider.tokens())
      }, RETRY_INTERVAL)
    }
  }, 200)

  // refetch if tokens change
  const subscribe = observeTokens.subscribe(refreshTokenRates)

  return () => {
    if (timeout) clearTimeout(timeout)
    subscribe.unsubscribe()
  }
}

const subscribeBalances = (
  tokens: TokenList,
  addresses: string[],
  chainConnectors: {
    substrate?: ChainConnector
    evm?: ChainConnectorEvm
  },
  provider: ChaindataProvider,
  balanceModules: Array<BalanceModule<any, any, any, any, any>>
) => {
  const tokenIds = Object.values(tokens).map(({ id }) => id)
  const addressesByToken = Object.fromEntries(tokenIds.map((tokenId) => [tokenId, addresses]))

  const updateDb = (balances: Balances) => {
    const putBalances = Object.entries(balances.toJSON()).map(([id, balance]) => ({
      id,
      ...balance,
    }))
    balancesDb.transaction(
      "rw",
      balancesDb.balances,
      async () => await balancesDb.balances.bulkPut(putBalances)
    )
  }

  let unsubscribed = false

  // eslint-disable-next-line no-console
  log.log(
    "subscribing to balance changes for %d tokens and %d addresses",
    tokenIds.length,
    addresses.length
  )
  const unsubs = balanceModules.map(async (balanceModule) => {
    // filter out tokens to only include those which this module knows how to fetch balances for
    const moduleTokenIds = Object.values(tokens ?? {})
      .filter(({ type }) => type === balanceModule.type)
      .map(({ id }) => id)
    const addressesByModuleToken = Object.fromEntries(
      Object.entries(addressesByToken).filter(([tokenId]) => moduleTokenIds.includes(tokenId))
    )

    const unsub = balancesFn(
      balanceModule,
      chainConnectors,
      provider,
      addressesByModuleToken,
      (error, balances) => {
        // log errors
        if (error) return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
        // ignore empty balance responses
        if (!balances) return
        // ignore balances from old subscriptions which are still in the process of unsubscribing
        if (unsubscribed) return

        updateDb(balances)
      }
    )

    return () => {
      // TODO should we add a timeout before unsubscribe to prevent closing sockets to quickly ?
      unsub.then((unsubscribe) => unsubscribe())
      balancesDb.transaction(
        "rw",
        balancesDb.balances,
        async () =>
          await balancesDb.balances
            .filter((balance) => {
              if (balance.source !== balanceModule.type) return false
              if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
              if (!addressesByModuleToken[balance.tokenId].includes(balance.address)) return false
              return true
            })
            .modify({ status: "cache" })
      )
    }
  })

  const unsubscribeAll = () => {
    unsubscribed = true

    unsubs.forEach((unsub) => unsub.then((unsubscribe) => unsubscribe()))
  }

  return unsubscribeAll
}

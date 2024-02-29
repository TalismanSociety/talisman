import {
  AnyBalanceModule,
  BalanceStatusLive,
  Balances,
  db as balancesDb,
  balances as balancesFn,
  createSubscriptionId,
  deleteSubscriptionId,
} from "@talismn/balances"
import { ChaindataProvider, IChaindataProvider, TokenList } from "@talismn/chaindata-provider"
import { fetchTokenRates, db as tokenRatesDb } from "@talismn/token-rates"
import md5 from "blueimp-md5"
import { useCallback, useMemo } from "react"

import log from "../log"
import { useSharedSubscription } from "../util/useSharedSubscription"
import { useAllAddresses } from "./useAllAddresses"
import { useBalanceModules } from "./useBalanceModules"
import { useChainConnectors } from "./useChainConnectors"
import { useChaindata } from "./useChaindata"
import { useDbCache } from "./useDbCache"
import { useEnabledChains } from "./useEnabledChains"
import { useWithTestnets } from "./useWithTestnets"

export type DbEntityType = "chains" | "evmNetworks" | "tokens"

/**
 * This hook is responsible for fetching the data used for balances and inserting it into the db.
 */
export const useDbCacheSubscription = (subscribeTo: DbEntityType) => {
  const provider = useChaindata()

  // can't handle balances & tokenRates here as they have other dependencies, it would trigger to many subscriptions
  const subscribe = useCallback(() => {
    switch (subscribeTo) {
      case "chains":
        return subscribeChaindataHydrate(provider, "chains")
      case "evmNetworks":
        return subscribeChaindataHydrate(provider, "evmNetworks")
      case "tokens":
        return subscribeChaindataHydrate(provider, "tokens")
    }
  }, [provider, subscribeTo])

  useSharedSubscription(subscribeTo, subscribe)
}

/**
 * This hook is responsible for fetching the data used for token rates and inserting it into the db.
 */
export function useDbCacheTokenRatesSubscription() {
  const { withTestnets } = useWithTestnets()
  const tokens = useTokens(withTestnets)

  const subscriptionKey = useMemo(
    // not super sexy but we need key to change based on this stuff
    () => {
      const key = Object.values(tokens ?? {})
        .map(({ id }) => id)
        .sort()
        .join()
      return `tokenRates-${md5(key)}`
    },
    [tokens]
  )

  const subscription = useCallback(() => {
    if (!Object.values(tokens ?? {}).length) return () => {}
    return subscribeTokenRates(tokens)
  }, [tokens])

  useSharedSubscription(subscriptionKey, subscription)
}

/**
 * This hook is responsible for fetching the data used for balances and inserting it into the db.
 */
export function useDbCacheBalancesSubscription() {
  const { withTestnets } = useWithTestnets()
  const { enabledChains } = useEnabledChains()
  const balanceModules = useBalanceModules()
  const chaindataProvider = useChaindata()
  const chainConnectors = useChainConnectors()
  const [allAddresses] = useAllAddresses()
  const chains = useChains(withTestnets)
  const allTokens = useTokens(withTestnets)

  const tokens = useMemo(() => {
    if (!enabledChains) return allTokens

    const chainsByGenesisHash = new Map(
      Object.values(chains).flatMap((chain) =>
        chain.genesisHash ? [[chain.genesisHash, chain.id]] : []
      )
    )
    const enabledChainIds = enabledChains.flatMap(
      (genesisHash) => chainsByGenesisHash.get(genesisHash as `0x${string}`) ?? []
    )
    return Object.fromEntries(
      Object.entries(allTokens).flatMap(([id, token]) =>
        token.chain && enabledChainIds.includes(token.chain.id) ? [[id, token]] : []
      )
    )
  }, [allTokens, chains, enabledChains])

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
    return subscribeBalances(tokens ?? {}, allAddresses, balanceModules)
  }, [allAddresses, balanceModules, tokens])

  useSharedSubscription(subscriptionKey, subscription)
}

// subscriptionless version of useChains and useTokens, prevents circular dependency
const useChains = (withTestnets?: boolean) => {
  const { chainsWithTestnetsMap, chainsWithoutTestnetsMap } = useDbCache()
  return withTestnets ? chainsWithTestnetsMap : chainsWithoutTestnetsMap
}
const useTokens = (withTestnets?: boolean) => {
  const { tokensWithTestnetsMap, tokensWithoutTestnetsMap } = useDbCache()
  return withTestnets ? tokensWithTestnetsMap : tokensWithoutTestnetsMap
}

const subscribeChaindataHydrate = (
  provider: IChaindataProvider,
  type: "chains" | "evmNetworks" | "tokens"
) => {
  const chaindata = provider as ChaindataProvider
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

  // launch the loop
  hydrate()

  return () => {
    if (timeout) clearTimeout(timeout)
  }
}

const subscribeTokenRates = (tokens: TokenList) => {
  const REFRESH_INTERVAL = 300_000 // 6 minutes
  const RETRY_INTERVAL = 5_000 // 5 sec

  let timeout: NodeJS.Timeout | null = null

  const refreshTokenRates = async () => {
    try {
      if (timeout) clearTimeout(timeout)

      const tokenRates = await fetchTokenRates(tokens)
      const putTokenRates = Object.entries(tokenRates).map(([tokenId, rates]) => ({
        tokenId,
        rates,
      }))

      await tokenRatesDb.transaction("rw", tokenRatesDb.tokenRates, async () => {
        // override all tokenRates
        await tokenRatesDb.tokenRates.bulkPut(putTokenRates)

        // delete tokenRates for tokens which no longer exist
        const tokenIds = await tokenRatesDb.tokenRates.toCollection().primaryKeys()
        const validTokenIds = new Set(Object.keys(tokenRates))
        const deleteTokenIds = tokenIds.filter((tokenId) => !validTokenIds.has(tokenId))
        if (deleteTokenIds.length > 0) await tokenRatesDb.tokenRates.bulkDelete(deleteTokenIds)
      })

      timeout = setTimeout(() => {
        refreshTokenRates()
      }, REFRESH_INTERVAL)
    } catch (error) {
      log.error(
        `Failed to fetch tokenRates, retrying in ${Math.round(RETRY_INTERVAL / 1000)} seconds`,
        error
      )
      setTimeout(async () => {
        refreshTokenRates()
      }, RETRY_INTERVAL)
    }
  }

  // launch the loop
  refreshTokenRates()

  return () => {
    if (timeout) clearTimeout(timeout)
  }
}

const subscribeBalances = (
  tokens: TokenList,
  addresses: string[],
  balanceModules: Array<AnyBalanceModule>
) => {
  const tokenIds = Object.values(tokens).map(({ id }) => id)
  const addressesByToken = Object.fromEntries(tokenIds.map((tokenId) => [tokenId, addresses]))

  const subscriptionId = createSubscriptionId()

  // TODO: Create subscriptions in a service worker, where we can detect page closes
  // and therefore reliably delete the subscriptionId when the user closes our dapp
  //
  // For more information, check out https://developer.chrome.com/blog/page-lifecycle-api/#faqs
  // and scroll down to:
  // - `What is the back/forward cache?`, and
  // - `If I can't run asynchronous APIs in the frozen or terminated states, how can I save data to IndexedDB?
  //
  // For now, we'll just last-ditch remove the subscriptionId (it works surprisingly well!) in the beforeunload event
  window.onbeforeunload = () => {
    deleteSubscriptionId()
  }

  const updateDb = (balances: Balances) => {
    const putBalances = Object.entries(balances.toJSON()).map(([id, balance]) => ({
      id,
      ...balance,
      status: BalanceStatusLive(subscriptionId),
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

    const unsub = balancesFn(balanceModule, addressesByModuleToken, (error, balances) => {
      // log errors
      if (error) {
        if (
          error?.type === "STALE_RPC_ERROR" ||
          error?.type === "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR"
        )
          return balancesDb.balances
            .where({ source: balanceModule.type, chainId: error.chainId })
            .filter((balance) => {
              if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
              if (!addressesByModuleToken[balance.tokenId].includes(balance.address)) return false
              return true
            })
            .modify({ status: "stale" })

        return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
      }
      // ignore empty balance responses
      if (!balances) return
      // ignore balances from old subscriptions which are still in the process of unsubscribing
      if (unsubscribed) return

      updateDb(balances)
    })

    return () => {
      // wait 2 seconds before actually unsubscribing, allowing for websocket to be reused
      unsub.then((unsubscribe) => {
        setTimeout(unsubscribe, 2_000)
      })
      deleteSubscriptionId()
    }
  })

  const unsubscribeAll = () => {
    unsubscribed = true

    unsubs.forEach((unsub) => unsub.then((unsubscribe) => unsubscribe()))
  }

  return unsubscribeAll
}

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
import { liveQuery } from "dexie"
import { useLiveQuery } from "dexie-react-hooks"
import { default as debounce } from "lodash/debounce"
import { useCallback, useEffect, useMemo, useRef } from "react"

import log from "../log"
import { useMulticastSubscription } from "../util"
import { useAllAddresses } from "./useAllAddresses"
import { useBalanceModules } from "./useBalanceModules"
import { useChainConnectors } from "./useChainConnectors"
import { useChaindata } from "./useChaindata"
import { useMessageSubscription } from "./useMessageSubscription"

export type DbEntityType = "chains" | "evmNetworks" | "tokens" | "tokenRates" // | "balances"

// const useSubscriptionsProvider = () => [
//   useSubscribeChaindataHydrate("chains"),
//   useSubscribeChaindataHydrate("evmNetworks"),
//   useSubscribeChaindataHydrate("tokens"),
//   useSubscribeTokenRates(),
//   useSubscribeBalances(),
// ]
// export const [SubscriptionsProvider, useSubscriptions] = provideContext(useSubscriptionsProvider)

/**
 * This hook is responsible for fetching the data used for balances and inserting it into the db.
 */
export const useDbCacheSubscription = (subscribeTo: DbEntityType) => {
  // const [
  //   subscribeHydrateChains,
  //   subscribeHydrateEvmNetworks,
  //   subscribeHydrateTokens,
  //   subscribeTokenRates,
  //   subscribeBalances,
  // ] = useSubscriptions()
  const provider = useChaindata()

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
      // case "balances":
      //   return subscribeBalances(provider)
    }
  }, [provider, subscribeTo])

  // useEffect(() => {
  //   switch (subscribeTo) {
  //     case "chains":
  //       return subscribeChainDataHydrate(provider, "chains")
  //     case "evmNetworks":
  //       return subscribeChainDataHydrate(provider, "evmNetworks")
  //     case "tokens":
  //       return subscribeChainDataHydrate(provider, "tokens")
  //     case "tokenRates":
  //       return subscribeTokenRates()
  //     case "balances":
  //       return subscribeBalances()
  //   }
  // }, [
  //   subscribeTo,
  //   // subscribeHydrateChains,
  //   // subscribeHydrateEvmNetworks,
  //   // subscribeHydrateTokens,
  //   // subscribeTokenRates,
  //   // subscribeBalances,
  // ])
  useMessageSubscription(subscribeTo, null, subscribe)
}

const subscribeChainDataHydrate = (
  provider: ChaindataProvider,
  type: "chains" | "evmNetworks" | "tokens"
) => {
  // eslint-disable-next-line no-console
  console.log("subscribeChainDataHydrate")
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

function useSubscribeChaindataHydrate(type: "chains" | "evmNetworks" | "tokens") {
  const chaindata =
    // cheeky hack to give us access to the hydrate methods
    useChaindata() as ChaindataProviderExtension | undefined

  const createSubscription = useCallback(() => {
    if (!chaindata) return

    let active = true
    const interval = 300_000 // 300_000ms = 300s = 5 minutes

    const hydrate = async () => {
      if (!active) return

      try {
        if (type === "chains") await chaindata.hydrateChains()
        if (type === "evmNetworks") await chaindata.hydrateEvmNetworks()
        if (type === "tokens") await chaindata.hydrateTokens()

        setTimeout(hydrate, interval)
      } catch (error) {
        const retryTimeout = 5_000 // 5_000ms = 5 seconds
        log.error(
          `Failed to fetch chaindata, retrying in ${Math.round(retryTimeout / 1000)} seconds`,
          error
        )
        setTimeout(hydrate, retryTimeout)
      }
    }
    hydrate()

    return () => {
      active = false
    }
  }, [chaindata, type])

  const subscribe = useMulticastSubscription(createSubscription)

  return subscribe
}

const subscribeTokenRates = (provider: ChaindataProvider) => {
  const REFRESH_INTERVAL = 300_000 // 6 minutes
  const RETRY_INTERVAL = 5_000 // 5 sec

  const observeTokens = liveQuery(() => provider.tokens())

  let timeout: NodeJS.Timeout | null = null

  // debounce to prevent burst calls
  const refreshTokenRates = debounce(async (tokens) => {
    // eslint-disable-next-line no-console
    console.log("refreshing token rates")
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

// function useSubscribeTokenRates(provider: ChaindataProvider) {
//   // const chaindataProvider = useChaindata()
//   // const tokens = useLiveQuery(() => chaindataProvider?.tokens(), [chaindataProvider])

//   // const generationRef = useRef(0)

//   // const createSubscription = useCallback(() => {
//   //   if (!chaindataProvider) return
//   //   if (!tokens) return
//   //   if (Object.keys(tokens).length < 1) return

//   //   // when we make a new request, we want to ignore any old requests which haven't yet completed
//   //   // otherwise we risk replacing the most recent data with older data
//   //   const generation = (generationRef.current + 1) % Number.MAX_SAFE_INTEGER
//   //   generationRef.current = generation

//   //   let active = true
//   //   const REFRESH_INTERVAL = 300_000 // 300_000ms = 5 minutes
//   //   const RETRY_INTERVAL = 5_000 // 5_000ms = 5 seconds

//   //   const hydrate = async () => {
//   //     if (!active) return
//   //     if (generationRef.current !== generation) return

//   //     try {
//   //       const tokenRates = await fetchTokenRates(tokens)

//   //       if (!active) return
//   //       if (generationRef.current !== generation) return

//   //       const putTokenRates = Object.entries(tokenRates).map(
//   //         ([tokenId, rates]): DbTokenRates => ({
//   //           tokenId,
//   //           rates,
//   //         })
//   //       )
//   //       tokenRatesDb.transaction(
//   //         "rw",
//   //         tokenRatesDb.tokenRates,
//   //         async () => await tokenRatesDb.tokenRates.bulkPut(putTokenRates)
//   //       )

//   //       setTimeout(hydrate, REFRESH_INTERVAL)
//   //     } catch (error) {
//   //       log.error(
//   //         `Failed to fetch tokenRates, retrying in ${Math.round(RETRY_INTERVAL / 1000)} seconds`,
//   //         error
//   //       )
//   //       setTimeout(hydrate, RETRY_INTERVAL)
//   //     }
//   //   }
//   //   hydrate()

//   //   return () => {
//   //     active = false
//   //   }
//   // }, [chaindataProvider, tokens])

//   // const subscribe = useMulticastSubscription(createSubscription)

//   // return subscribe

//   useMessageSubscription("tokenRates", null, subscribeTokenRates(provider))
// }

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
  console.log("launching balance subscriptions")
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

  //   const subscribe = createMulticastSubscription<Balances>((next) => {

  //     return () => {
  //       // unsubscribe from upstream
  //       unsub.then((unsubscribe) => unsubscribe())

  //       // set this subscription's balances in the store to status: cache
  //       balancesDb.transaction(
  //         "rw",
  //         balancesDb.balances,
  //         async () =>
  //           await balancesDb.balances
  //             .filter((balance) => {
  //               if (balance.source !== balanceModule.type) return false
  //               if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
  //               if (!addressesByModuleToken[balance.tokenId].includes(balance.address))
  //                 return false
  //               return true
  //             })
  //             .modify({ status: "cache" })
  //       )
  //     }
  //   })

  //   const unsubscribe = subscribe((balances) => {
  //     const putBalances = Object.entries(balances.toJSON()).map(([id, balance]) => ({
  //       id,
  //       ...balance,
  //     }))
  //     balancesDb.transaction(
  //       "rw",
  //       balancesDb.balances,
  //       async () => await balancesDb.balances.bulkPut(putBalances)
  //     )
  //   })

  //   return unsubscribe
  // })

  const unsubscribeAll = () => {
    // eslint-disable-next-line no-console
    console.log("closing balance subscriptions")
    unsubscribed = true

    unsubs.forEach((unsub) => unsub.then((unsubscribe) => unsubscribe()))
  }

  return unsubscribeAll
}

export function useDbCacheBalancesSubscription() {
  const balanceModules = useBalanceModules()
  const chaindataProvider = useChaindata()
  const chainConnectors = useChainConnectors()
  const [allAddresses] = useAllAddresses()
  const tokens = useLiveQuery(() => chaindataProvider.tokens(), [chaindataProvider])

  const key = useMemo(
    // not super sexy but we need key to change based on this stuff
    () =>
      allAddresses
        .join()
        .concat(...Object.values(tokens ?? {}).map(({ id }) => id))
        .concat(
          `evm:${!!chainConnectors.evm}`,
          `sub:${!!chainConnectors.substrate}`,
          ...balanceModules.map((m) => m.type).join(),
          `cd:${!!chaindataProvider}`
        ),
    [allAddresses, balanceModules, chainConnectors, chaindataProvider, tokens]
  )

  const subscription = useCallback(() => {
    if (!tokens) return () => {}
    return subscribeBalances(
      tokens ?? {},
      allAddresses,
      chainConnectors,
      chaindataProvider,
      balanceModules
    )
  }, [allAddresses, balanceModules, chainConnectors, chaindataProvider, tokens])

  useMessageSubscription(key, null, subscription)

  // const tokenIds = useMemo(() => Object.values(tokens ?? {}).map(({ id }) => id), [tokens])
  // const addressesByToken = useMemo(
  //   () => Object.fromEntries(tokenIds.map((tokenId) => [tokenId, allAddresses])),
  //   [allAddresses, tokenIds]
  // )

  // const generationRef = useRef(0)

  // const createSubscription = useCallback(() => {
  //   if (!chainConnectors.substrate) return
  //   if (!chainConnectors.evm) return
  //   if (!chaindataProvider) return

  //   console.log("subscribeBalances")

  //   const generation = (generationRef.current + 1) % Number.MAX_SAFE_INTEGER
  //   generationRef.current = generation

  //   const unsubs = balanceModules.map((balanceModule) => {
  //     // filter out tokens to only include those which this module knows how to fetch balances for
  //     const moduleTokenIds = Object.values(tokens ?? {})
  //       .filter(({ type }) => type === balanceModule.type)
  //       .map(({ id }) => id)
  //     const addressesByModuleToken = Object.fromEntries(
  //       Object.entries(addressesByToken).filter(([tokenId]) => moduleTokenIds.includes(tokenId))
  //     )

  //     const subscribe = createMulticastSubscription<Balances>((next) => {
  //       const unsub = balancesFn(
  //         balanceModule,
  //         chainConnectors,
  //         chaindataProvider,
  //         addressesByModuleToken,
  //         (error, balances) => {
  //           // log errors
  //           if (error) return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
  //           // ignore empty balance responses
  //           if (!balances) return
  //           // ignore balances from old subscriptions which are still in the process of unsubscribing
  //           if (generationRef.current !== generation) return

  //           next(balances)
  //         }
  //       )

  //       return () => {
  //         // unsubscribe from upstream
  //         unsub.then((unsubscribe) => unsubscribe())

  //         // set this subscription's balances in the store to status: cache
  //         balancesDb.transaction(
  //           "rw",
  //           balancesDb.balances,
  //           async () =>
  //             await balancesDb.balances
  //               .filter((balance) => {
  //                 if (balance.source !== balanceModule.type) return false
  //                 if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
  //                 if (!addressesByModuleToken[balance.tokenId].includes(balance.address))
  //                   return false
  //                 return true
  //               })
  //               .modify({ status: "cache" })
  //         )
  //       }
  //     })

  //     const unsubscribe = subscribe((balances) => {
  //       const putBalances = Object.entries(balances.toJSON()).map(([id, balance]) => ({
  //         id,
  //         ...balance,
  //       }))
  //       balancesDb.transaction(
  //         "rw",
  //         balancesDb.balances,
  //         async () => await balancesDb.balances.bulkPut(putBalances)
  //       )
  //     })

  //     return unsubscribe
  //   })

  //   const unsubscribeAll = () => {
  //     console.log("unsubscribeBalances")
  //     unsubs.forEach((unsub) => unsub())
  //   }

  //   return unsubscribeAll
  // }, [addressesByToken, balanceModules, chainConnectors, chaindataProvider, tokens])

  // const subscribe = useMulticastSubscription(createSubscription)

  // return subscribe
}

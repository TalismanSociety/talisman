import { Balances, balances as balancesFn } from "@talismn/balances"
import { db } from "@talismn/balances"
import { ChaindataProviderExtension } from "@talismn/chaindata-provider-extension"
import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useRef } from "react"
import { useEffect, useMemo } from "react"

import log from "../log"
import { createMulticastSubscription, provideContext, useMulticastSubscription } from "../util"
import { useAllAddresses } from "./useAllAddresses"
import { useBalanceModules } from "./useBalanceModules"
import { useChainConnectors } from "./useChainConnectors"
import { useChaindata } from "./useChaindata"

export type DbEntityType = "chains" | "evmNetworks" | "tokens" | "balances"

const useSubscriptionsProvider = () => [
  useSubscribeChaindataHydrate("chains"),
  useSubscribeChaindataHydrate("evmNetworks"),
  useSubscribeChaindataHydrate("tokens"),
  useSubscribeBalances(),
]
export const [SubscriptionsProvider, useSubscriptions] = provideContext(useSubscriptionsProvider)

/**
 * This hook is responsible for fetching the data used for balances and inserting it into the db.
 */
export const useDbCacheSubscription = (subscribeTo: DbEntityType) => {
  const [
    subscribeHydrateChains,
    subscribeHydrateEvmNetworks,
    subscribeHydrateTokens,
    subscribeBalances,
  ] = useSubscriptions()

  useEffect(() => {
    switch (subscribeTo) {
      case "chains":
        return subscribeHydrateChains()
      case "evmNetworks":
        return subscribeHydrateEvmNetworks()
      case "tokens":
        return subscribeHydrateTokens()
      case "balances":
        return subscribeBalances()
    }
  }, [
    subscribeBalances,
    subscribeHydrateChains,
    subscribeHydrateEvmNetworks,
    subscribeHydrateTokens,
    subscribeTo,
  ])
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

function useSubscribeBalances() {
  const balanceModules = useBalanceModules()
  const chaindataProvider = useChaindata()
  const chainConnectors = useChainConnectors()

  const [allAddresses] = useAllAddresses()
  const tokens = useLiveQuery(() => chaindataProvider?.tokens(), [chaindataProvider])
  const tokenIds = useMemo(() => Object.values(tokens ?? {}).map(({ id }) => id), [tokens])
  const addressesByToken = useMemo(
    () => Object.fromEntries(tokenIds.map((tokenId) => [tokenId, allAddresses])),
    [allAddresses, tokenIds]
  )

  const generationRef = useRef(0)

  const createSubscription = useCallback(() => {
    if (!chainConnectors.substrate) return
    if (!chainConnectors.evm) return
    if (!chaindataProvider) return

    const generation = (generationRef.current + 1) % Number.MAX_SAFE_INTEGER
    generationRef.current = generation

    const unsubs = balanceModules.map((balanceModule) => {
      // filter out tokens to only include those which this module knows how to fetch balances for
      const moduleTokenIds = Object.values(tokens ?? {})
        .filter(({ type }) => type === balanceModule.type)
        .map(({ id }) => id)
      const addressesByModuleToken = Object.fromEntries(
        Object.entries(addressesByToken).filter(([tokenId]) => moduleTokenIds.includes(tokenId))
      )

      const subscribe = createMulticastSubscription<Balances>((next) => {
        const unsub = balancesFn(
          balanceModule,
          chainConnectors,
          chaindataProvider,
          addressesByModuleToken,
          (error, balances) => {
            // log errors
            if (error) return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
            // ignore empty balance responses
            if (!balances) return
            // ignore balances from old subscriptions which are still in the process of unsubscribing
            if (generationRef.current !== generation) return

            next(balances)
          }
        )

        return () => {
          // unsubscribe from upstream
          unsub.then((unsubscribe) => unsubscribe())

          // set this subscription's balances in the store to status: cache
          db.transaction(
            "rw",
            db.balances,
            async () =>
              await db.balances
                .filter((balance) => {
                  if (balance.source !== balanceModule.type) return false
                  if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
                  if (!addressesByModuleToken[balance.tokenId].includes(balance.address))
                    return false
                  return true
                })
                .modify({ status: "cache" })
          )
        }
      })

      const unsubscribe = subscribe((balances) => {
        const putBalances = Object.entries(balances.toJSON()).map(([id, balance]) => ({
          id,
          ...balance,
        }))
        db.transaction("rw", db.balances, async () => await db.balances.bulkPut(putBalances))
      })

      return unsubscribe
    })

    const unsubscribeAll = () => unsubs.forEach((unsub) => unsub())

    return unsubscribeAll
  }, [addressesByToken, balanceModules, chainConnectors, chaindataProvider, tokens])

  const subscribe = useMulticastSubscription(createSubscription)

  return subscribe
}

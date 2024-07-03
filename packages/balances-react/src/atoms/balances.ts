import {
  AddressesByToken,
  Balance,
  BalanceJson,
  Balances,
  HydrateDb,
  balances as balancesFn,
  getBalanceId,
} from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/util"
import { atom } from "jotai"
import { atomEffect } from "jotai-effect"
import { atomWithObservable } from "jotai/utils"
import { isEqual } from "lodash"
import { BehaviorSubject, debounceTime, firstValueFrom, map } from "rxjs"

import log from "../log"
import { BalancesPersistBackend, localStorageBalancesPersistBackend } from "../util/balancesPersist"
import { allAddressesAtom } from "./allAddresses"
import { balanceModulesAtom } from "./balanceModules"
import {
  chaindataAtom,
  chainsAtom,
  chainsByIdAtom,
  evmNetworksAtom,
  evmNetworksByIdAtom,
  miniMetadatasAtom,
  tokensAtom,
  tokensByIdAtom,
} from "./chaindata"
import { miniMetadataHydratedAtom } from "./chaindataProvider"
import { enabledChainsAtom, enabledTokensAtom } from "./config"
import { cryptoWaitReadyAtom } from "./cryptoWaitReady"
import { tokenRatesAtom } from "./tokenRates"

export const allBalancesAtom = atom(async (get) => {
  // set up our subscription to fetch balances from the various blockchains
  get(balancesSubscriptionAtomEffect)

  const [balances, hydrateData] = await Promise.all([
    get(balancesObservableAtom),
    get(balancesHydrateDataAtom),
  ])

  return new Balances(
    Object.values(balances).filter((balance) => !!hydrateData?.tokens?.[balance.tokenId]),
    // hydrate balance chains, evmNetworks, tokens and tokenRates
    hydrateData
  )
})

const balancesObservable = new BehaviorSubject<Record<string, BalanceJson>>({})
const balancesObservableAtom = atomWithObservable<Record<string, BalanceJson>>(
  () => balancesObservable
)

export const balancesPersistBackendAtom = atom<BalancesPersistBackend>(
  localStorageBalancesPersistBackend
)

const hydrateBalancesObservableAtom = atom(async (get) => {
  const persistBackend = get(balancesPersistBackendAtom)
  const balances = await persistBackend.retrieve()

  balancesObservable.next(
    Object.fromEntries(
      balances.map((b) => [getBalanceId(b), { ...b, status: "cache" } as BalanceJson])
    )
  )
})

const balancesHydrateDataAtom = atom(async (get): Promise<HydrateDb> => {
  const [{ chainsById, evmNetworksById, tokensById }, tokenRates] = await Promise.all([
    get(chaindataAtom),
    get(tokenRatesAtom),
  ])

  return { chains: chainsById, evmNetworks: evmNetworksById, tokens: tokensById, tokenRates }
})

const balancesSubscriptionAtomEffect = atomEffect((get) => {
  // lets us tear down the existing subscriptions when the atomEffect is restarted
  const abort = new AbortController()

  // we have to specify these synchronously, otherwise jotai won't know
  // that it needs to restart our subscriptions when they change
  const atomDependencies = Promise.all([
    get(cryptoWaitReadyAtom),

    get(balanceModulesAtom),
    get(miniMetadataHydratedAtom),

    get(allAddressesAtom),
    get(chainsAtom),
    get(chainsByIdAtom),
    get(evmNetworksAtom),
    get(evmNetworksByIdAtom),
    get(tokensAtom),
    get(tokensByIdAtom),
    get(miniMetadatasAtom),

    get(enabledChainsAtom),
    get(enabledTokensAtom),
    get(hydrateBalancesObservableAtom),
  ])

  const persistBackend = get(balancesPersistBackendAtom)

  const unsubsPromise = (async () => {
    const [
      _cryptoReady,

      balanceModules,
      miniMetadataHydrated,

      allAddresses,
      chains,
      chainsById,
      evmNetworks,
      evmNetworksById,
      tokens,
      tokensById,
      _miniMetadatas,

      enabledChainsConfig,
      enabledTokensConfig,
    ] = await atomDependencies

    if (!miniMetadataHydrated) return
    if (abort.signal.aborted) return

    // persist data every thirty seconds
    balancesObservable.pipe(debounceTime(10000)).subscribe((balancesUpdate) => {
      persistBackend.persist(Object.values(balancesUpdate))
    })

    const updateBalances = async (balancesUpdates: BalanceJson[]) => {
      if (abort.signal.aborted) return

      const updatesWithIds = new Balances(balancesUpdates)
      const existing = balancesObservable.value

      // update initialising set here - before filtering out zero balances
      // while this may include stale balances, the important thing is that the balance is no longer "initialising"
      // balancesUpdates.forEach((b) => this.#initialising.delete(getBalanceId(b)))

      const newlyZeroBalances: string[] = []
      const changedBalances = Object.fromEntries(
        updatesWithIds.each
          .filter((newB) => {
            const isZero = newB.total.tokens === "0"
            // Keep new balances which are not zeros
            const existingB = existing[newB.id]
            if (!existingB && !isZero) return true

            const hasChanged = !isEqual(existingB, newB.toJSON())
            // Collect balances now confirmed to be zero separately, so they can be filtered out from the main set
            if (existingB && hasChanged && isZero) newlyZeroBalances.push(newB.id)
            // Keep changed balances, which are not known zeros
            return hasChanged && !isZero
          })
          .map((b) => [b.id, b.toJSON()])
      )

      if (Object.keys(changedBalances).length === 0 && newlyZeroBalances.length === 0) return

      const nonZeroBalances =
        newlyZeroBalances.length > 0
          ? Object.fromEntries(
              Object.entries(existing).filter(([id]) => !newlyZeroBalances.includes(id))
            )
          : existing
      const newBalancesState = { ...nonZeroBalances, ...changedBalances }

      if (Object.keys(newBalancesState).length === 0) return
      balancesObservable.next(newBalancesState)
    }

    const deleteBalances = async (balancesFilter: (balance: Balance) => boolean) => {
      if (abort.signal.aborted) return

      const balancesToKeep = Object.fromEntries(
        new Balances(Object.values(await get(balancesObservableAtom))).each
          .filter((b) => !balancesFilter(b))
          .map((b) => [b.id, b.toJSON()])
      )

      balancesObservable.next(balancesToKeep)
    }

    const enabledChainIds = enabledChainsConfig?.map(
      (genesisHash) => chains.find((chain) => chain.genesisHash === genesisHash)?.id
    )
    const enabledChainsFilter = enabledChainIds
      ? (token: Token) => token.chain && enabledChainIds?.includes(token.chain.id)
      : () => true
    const enabledTokensFilter = enabledTokensConfig
      ? (token: Token) => enabledTokensConfig.includes(token.id)
      : () => true

    const enabledTokenIds = tokens
      .filter(enabledChainsFilter)
      .filter(enabledTokensFilter)
      .map(({ id }) => id)

    if (enabledTokenIds.length < 1 || allAddresses.length < 1) return

    const addressesByTokenByModule: Record<string, AddressesByToken<Token>> = {}
    enabledTokenIds
      .flatMap((tokenId) => tokensById[tokenId])
      .forEach((token) => {
        // filter out tokens on chains/evmNetworks which have no rpcs
        const hasRpcs =
          (token.chain?.id && (chainsById[token.chain.id]?.rpcs?.length ?? 0) > 0) ||
          (token.evmNetwork?.id && (evmNetworksById[token.evmNetwork.id]?.rpcs?.length ?? 0) > 0)
        if (!hasRpcs) return

        if (!addressesByTokenByModule[token.type]) addressesByTokenByModule[token.type] = {}
        addressesByTokenByModule[token.type][token.id] = allAddresses.filter((address) => {
          // for each address, fetch balances only from compatible chains
          return isEthereumAddress(address)
            ? token.evmNetwork?.id || chainsById[token.chain?.id ?? ""]?.account === "secp256k1"
            : token.chain?.id && chainsById[token.chain?.id ?? ""]?.account !== "secp256k1"
        })
      })

    // Delete invalid cached balances
    const chainIds = new Set(chains.map((chain) => chain.id))
    const evmNetworkIds = new Set(evmNetworks.map((evmNetwork) => evmNetwork.id))
    await deleteBalances((balance) => {
      // delete cached balances for accounts which don't exist anymore
      if (!balance.address || !allAddresses.includes(balance.address)) return true

      // delete cached balances when chain/evmNetwork doesn't exist
      if (balance.chainId === undefined && balance.evmNetworkId === undefined) return true
      if (balance.chainId !== undefined && !chainIds.has(balance.chainId)) return true
      if (balance.evmNetworkId !== undefined && !evmNetworkIds.has(balance.evmNetworkId))
        return true

      // delete cached balance when token doesn't exist / is disabled
      if (!enabledTokenIds.includes(balance.tokenId)) return true

      // delete cached balance when module doesn't exist
      if (!balanceModules.find((module) => module.type === balance.source)) return true

      // delete cached balance for accounts on incompatible chains
      // (substrate accounts shouldn't have evm balances)
      // (evm accounts shouldn't have substrate balances (unless the chain uses secp256k1 accounts))
      const chain = (balance.chainId && chains.find(({ id }) => id === balance.chainId)) || null
      const hasChain = balance.chainId && chainIds.has(balance.chainId)
      const hasEvmNetwork = balance.evmNetworkId && evmNetworkIds.has(balance.evmNetworkId)
      const chainUsesSecp256k1Accounts = chain?.account === "secp256k1"
      if (!isEthereumAddress(balance.address)) {
        if (!hasChain) return true
        if (chainUsesSecp256k1Accounts) return true
      }
      if (isEthereumAddress(balance.address)) {
        if (!hasEvmNetwork && !chainUsesSecp256k1Accounts) return true
      }

      // keep balance
      return false
    })
    if (abort.signal.aborted) return

    // after 30 seconds, change the status of all balances still initializing to stale
    setTimeout(() => {
      if (abort.signal.aborted) return

      const staleObservable = balancesObservable.pipe(
        map((val) =>
          Object.values(val)
            .filter(({ status }) => status === "cache")
            .map((balance) => ({ ...balance, status: "stale" } as BalanceJson))
        )
      )

      firstValueFrom(staleObservable).then((v) => {
        if (v.length) updateBalances(v)
      })
    }, 30_000)

    return balanceModules.map((balanceModule) => {
      const unsub = balancesFn(
        balanceModule,
        addressesByTokenByModule[balanceModule.type] ?? {},
        (error, balances) => {
          // log errors
          if (error) {
            if (
              error?.type === "STALE_RPC_ERROR" ||
              error?.type === "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR"
            ) {
              const addressesByModuleToken = addressesByTokenByModule[balanceModule.type] ?? {}

              const staleObservable = balancesObservable.pipe(
                map((val) =>
                  Object.values(val)
                    .filter((balance) => {
                      const { tokenId, address, source } = balance
                      const chainComparison = error.chainId
                        ? "chainId" in balance && error.chainId === balance.chainId
                        : error.evmNetworkId
                        ? "evmNetworkId" in balance && error.evmNetworkId === balance.evmNetworkId
                        : true
                      return (
                        chainComparison &&
                        addressesByModuleToken[tokenId]?.includes(address) &&
                        source === balanceModule.type
                      )
                    })
                    .map((balance) => ({ ...balance, status: "stale" } as BalanceJson))
                )
              )

              firstValueFrom(staleObservable).then((v) => {
                if (v.length) updateBalances(v)
              })
            }

            return log.error(`Failed to fetch ${balanceModule.type} balances`, error)
          }

          // ignore empty balance responses
          if (!balances) return
          // ignore balances from old subscriptions which are still in the process of unsubscribing
          if (abort.signal.aborted) return

          // good balances
          if (balances) {
            if ("status" in balances) {
              // For modules using the new SubscriptionResultWithStatus pattern
              //TODO fix initialisin
              // if (result.status === "initialising") this.#initialising.add(balanceModule.type)
              // else this.#initialising.delete(balanceModule.type)
              updateBalances(balances.data)
            } else {
              // add good ones to initialisedBalances
              updateBalances(Object.values(balances.toJSON()))
            }
          }
        }
      )

      return () => unsub.then((unsubscribe) => unsubscribe())
    })
  })()

  // close the existing subscriptions when our effect unmounts
  // (wait 2 seconds before actually unsubscribing, to allow the websocket to be reused in that time)
  const unsubscribe = () =>
    unsubsPromise.then((unsubs) => {
      persistBackend.persist(Object.values(balancesObservable.value))
      unsubs?.forEach((unsub) => unsub())
    })
  abort.signal.addEventListener("abort", () => setTimeout(unsubscribe, 2_000))

  return () => abort.abort("Unsubscribed")
})

import keyring from "@polkadot/ui-keyring"
import { SingleAddress } from "@polkadot/ui-keyring/observable/types"
import { assert } from "@polkadot/util"
import {
  AddressesByToken,
  MiniMetadata,
  StoredBalanceJson,
  db as balancesDb,
} from "@talismn/balances"
import { configureStore } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { Deferred, encodeAnyAddress, isEthereumAddress } from "@talismn/util"
import { firstThenDebounce } from "@talismn/util/src/firstThenDebounce"
import { Dexie, liveQuery } from "dexie"
import { log } from "extension-shared"
import isEqual from "lodash/isEqual"
import omit from "lodash/omit"
import pick from "lodash/pick"
import {
  BehaviorSubject,
  Observable,
  ReplaySubject,
  Subject,
  Subscription,
  combineLatest,
  firstValueFrom,
} from "rxjs"
import { debounceTime, map } from "rxjs/operators"

import { sentry } from "../../config/sentry"
import { unsubscribe } from "../../handlers/subscriptions"
import { balanceModules } from "../../rpcs/balance-modules"
import { chaindataProvider } from "../../rpcs/chaindata"
import { Addresses, AddressesByChain } from "../../types/base"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { isBackgroundPage } from "../../util/isBackgroundPage"
import { settingsStore } from "../app/store.settings"
import { activeChainsStore, isChainActive } from "../chains/store.activeChains"
import { Chain } from "../chains/types"
import { activeEvmNetworksStore, isEvmNetworkActive } from "../ethereum/store.activeEvmNetworks"
import { EvmNetwork } from "../ethereum/types"
import { activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"
import {
  AddressesAndEvmNetwork,
  AddressesAndTokens,
  Balance,
  BalanceJson,
  BalanceSubscriptionResponse,
  Balances,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
} from "./types"

type ChainIdAndRpcs = Pick<Chain, "id" | "genesisHash" | "account" | "rpcs">
type EvmNetworkIdAndRpcs = Pick<EvmNetwork, "id" | "nativeToken" | "substrateChain" | "rpcs">
type TokenIdAndType = Pick<Token, "id" | "type" | "chain" | "evmNetwork">

type SubscriptionsState = "Closed" | "Closing" | "Open"

// debounce time before restarting subscriptions if one of the inputs change
const DEBOUNCE_TIMEOUT = 3_000

// balance modules that have been upgraed to the new SubscriptionResultWithStatus pattern
const NEW_BALANCE_MODULES = ["substrate-native", "evm-native", "evm-erc20"]

/**
 * Observables providing info necessary to fetch balances
 */

// create and subscribe to observables for active chains/evmNetworks/tokens here
const getActiveStuff = <T extends { isTestnet?: boolean }, A extends Record<string, boolean>>(
  dataObservable: Observable<Array<T>>,
  activeStoreObservable: Observable<A>,
  isActiveFn: (item: T, activeMap: A) => boolean
) => {
  return combineLatest([dataObservable, activeStoreObservable, settingsStore.observable]).pipe(
    map(([data, active, { useTestnets }]) => {
      return data
        .filter((item) => isActiveFn(item, active))
        .filter((item) => (useTestnets ? true : !item.isTestnet))
    })
  )
}
export const activeChainsObservable = getActiveStuff(
  chaindataProvider.chainsObservable,
  activeChainsStore.observable,
  isChainActive
)

export const activeEvmNetworksObservable = getActiveStuff(
  chaindataProvider.evmNetworksObservable,
  activeEvmNetworksStore.observable,
  isEvmNetworkActive
)

export const activeTokensObservable = getActiveStuff(
  chaindataProvider.tokensObservable,
  activeTokensStore.observable,
  isTokenActive
)

// todo: This can be configured with a different indexedDB table
const { persistData, retrieveData } = configureStore()

// TODO: Fix this class up
//       1. It shouldn't need a whole extra copy of addresses+chains+networks separate to the db
//       2. It shouldn't subscribe to all this data when subscriptions aren't even open
//       3. It should support one-off subscriptions for accounts which aren't in the wallet
//       4. It needs to stop trying to connect to broken RPCs after the subscriptions are closed

abstract class BalancePool {
  #persist = false
  #hasInitialised = Deferred() // has the pool been initialised with sufficient state to begin querying balances
  #subscriptionsState: SubscriptionsState = "Closed"
  #subscriptionsStateUpdated: Subject<void> = new Subject()
  #subscriptionsGeneration = 0
  #closeSubscriptionCallbacks: Array<Promise<() => void>> = []

  #subscribers: Subject<void> = new Subject()
  #pool: BehaviorSubject<Record<string, BalanceJson>> = new BehaviorSubject({})
  #initialising: Set<string> = new Set()

  /**
   * A map of accounts to query balances for, in the format:
   *
   * ```
   * {
   *   // if account is allowed on all chains, value will be `null`
   *   [`account address`]: [`allowed chain genesis hash`, ...] | null
   * }
   * ```
   */
  addresses: ReplaySubject<Addresses> = new ReplaySubject(1)
  chains: Record<string, ChainIdAndRpcs> = {}
  evmNetworks: Record<string, EvmNetworkIdAndRpcs> = {}
  tokens: TokenIdAndType[] = []
  #miniMetadataIds = new Set<string>()

  #cleanupSubs: Array<Promise<Subscription>>

  /**
   * Initialize the store with a set of addresses and chains.
   */
  constructor({ persist }: { persist?: boolean }) {
    this.#persist = Boolean(persist)

    // check for use outside of the background/service worker
    isBackgroundPage().then((backgroudPage) => {
      if (!backgroudPage) {
        throw new Error(
          `Balances pool should only be used in the background page - used in: ${window.location.href}`
        )
      }
    })

    // subscribe this store to all of the inputs it depends on
    this.#cleanupSubs = [this.initializeChaindataSubscription()]

    // if we already have subscriptions - start polling (after chaindata init)
    if (this.#subscribers.observed) this.hasInitialised.then(() => this.openSubscriptions())

    // Hydrate pool from indexedDB if persist = true
    const retrieveFn = persist
      ? retrieveData
      : () => new Promise<StoredBalanceJson[]>((resolve) => resolve([]))

    retrieveFn()
      .then((balances) => {
        const initialBalances = balances.map((b) => ({ ...b, status: "cache" } as BalanceJson))
        this.setPool(initialBalances)
      })
      .catch((e) => {
        log.error("Failed to retrieve balances from indexedDB", e)
      })

    // Persist pool to indexedDB every 1 minute
    setInterval(() => {
      if (this.#subscribers.observed) this.persist()
    }, 60_000)
    // Persist pool to indexedDB after 10 seconds of no updates
    this.#pool.pipe(
      debounceTime(10_000),
      map(() => {
        this.persist()
      })
    )
  }

  /**
   * Unsubscribes the store from the observables it depends on.
   */
  destroy() {
    return Promise.all(
      this.#cleanupSubs.map((p) => p.then((subscription) => subscription.unsubscribe()))
    )
  }

  get hasInitialised() {
    return this.#hasInitialised.promise
  }

  protected setOnCleanup(onCleanup: () => Promise<Subscription>) {
    this.#cleanupSubs.push(onCleanup())
  }

  get poolStatus() {
    const isInitialising = this.#initialising.size > 0
    return isInitialising ? "initialising" : "live"
  }

  /**
   * Create a new subscription to the balances pool.
   *
   * @param id - The message id
   * @param port - The message port
   * @returns The subscribe method of the balances pool
   */
  subscribe(
    id: string,
    onDisconnected: Promise<void>,
    cb: (val: BalanceSubscriptionResponse) => void
  ) {
    this.hasInitialised.then(() => {
      // fire a single initial balance update so front end knows we're initialising
      cb({ status: "initialising", data: Object.values(this.#pool.getValue()) })

      // create subscription to pool
      const poolSubscription = this.#pool.pipe(firstThenDebounce(500)).subscribe((balances) => {
        return cb({ status: this.poolStatus, data: Object.values(balances) })
      })
      // Because this.#pool can be observed directly in the backend, we can't use this.#pool.observed to
      // decide when to close the rpc subscriptions.
      // Instead, create a generic subscription just so that we know the front end is subscribing
      const subscription = this.#subscribers.subscribe(() => {})

      // open rpcs (if not already open)
      this.openSubscriptions()

      // close rpcs when the last subscriber disconnects
      onDisconnected.then(() => {
        unsubscribe(id)
        subscription.unsubscribe()
        poolSubscription.unsubscribe()

        setTimeout(() => {
          // wait 5 seconds to prevent subscription restart for these use cases :
          // - popup loses focus and user reopens it right away
          // - user opens popup and opens dashboard from it, which closes the popup
          if (!this.#subscribers.observed) {
            this.closeSubscriptions()
            // set all balances to cached
            this.updatePool(Object.values(this.balances).map((b) => ({ ...b, status: "cache" })))
            this.persist()
          }
        }, 5_000)
      })
    })
  }

  private persist() {
    if (!this.#persist) return
    const balancesToPersist = Object.entries(new Balances(this.balances).toJSON()).map(
      ([id, b]) => ({
        id,
        ...omit(b, "status"),
      })
    )
    try {
      persistData(balancesToPersist)
    } catch (e) {
      log.error("Failed to persist balances in pool", e)
    }
  }

  get balances() {
    return this.#pool.getValue()
  }

  get observable() {
    return this.#pool.asObservable()
  }

  private updatePool(updates: BalanceJson[]) {
    const updatesWithIds = new Balances(updates)
    const existing = this.balances
    // update initialising set here - before filtering out zero balances
    // while this may include stale balances, the important thing is that the balance is no longer "initialising"
    updates.forEach((b) => this.#initialising.delete(`${b.tokenId}:${b.address}`))

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

    const nonZeroBalances =
      newlyZeroBalances.length > 0
        ? Object.fromEntries(
            Object.entries(existing).filter(([id]) => !newlyZeroBalances.includes(id))
          )
        : existing
    const newBalancesState = { ...nonZeroBalances, ...changedBalances }

    this.#pool.next(newBalancesState)
  }

  private setPool(balances: BalanceJson[]) {
    const balancesWithIds = new Balances(balances).toJSON()
    this.#pool.next(balancesWithIds)
  }
  /**
   * Gets the balance for an address on a chain, either from the store if the address is in the wallet, or externally from the RPC if not.
   *
   * @param chainId - The id of the chain for which to query the balance
   * @param evmNetworkId - The id of the evmNetwork for which to query the balance
   * @param tokenId - The id of the token for which to query the balance
   * @param address - The address to query the balance
   */
  async getBalance({
    chainId,
    evmNetworkId,
    tokenId,
    address: chainFormattedAddress,
  }: RequestBalance): Promise<BalanceJson | undefined> {
    assert(chainId || evmNetworkId, "chainId or evmNetworkId is required")

    const address = encodeAnyAddress(chainFormattedAddress, 42)

    // search for existing balance in the store
    const storeBalances = new Balances(Object.values(this.balances))
    const networkFilter = chainId ? { chainId } : { evmNetworkId }
    const existing = storeBalances.find({ ...networkFilter, tokenId, address })
    if (existing.count > 0) return existing.sorted[0]?.toJSON()

    // no existing balance found, fetch it directly via rpc
    const token = await chaindataProvider.tokenById(tokenId)
    if (!token) {
      const error = new Error(`Failed to fetch balance: no token with id ${tokenId}`)
      sentry.captureException(error)
      log.error(error)
      return
    }

    const tokenType = token.type
    const balanceModule = balanceModules.find(({ type }) => type === token.type)
    if (!balanceModule) {
      const error = new Error(`Failed to fetch balance: no module with type ${tokenType}`)
      sentry.captureException(error)
      log.error(error)
      return
    }

    const addressesByToken = { [tokenId]: [address] }
    const balances = await balanceModule.fetchBalances(addressesByToken)

    return balances.find({ chainId, evmNetworkId, tokenId, address }).sorted[0]?.toJSON()
  }

  /**
   * Creates a subscription to automatically call `this.setChains` when any of the chains/tokens dependencies update.
   */
  private async initializeChaindataSubscription() {
    // subscribe to all the inputs that make up the list of tokens to watch balances for
    // debounce to avoid restarting subscriptions multiple times when settings change rapidly (ex: multiple networks/tokens activated/deactivated rapidly)
    return combineLatest([
      activeChainsObservable,
      activeEvmNetworksObservable,
      activeTokensObservable,
      liveQuery(() => balancesDb.miniMetadatas.toArray()),
    ])
      .pipe(firstThenDebounce(DEBOUNCE_TIMEOUT))
      .subscribe({
        next: (args) => {
          this.setChains(...args)
          this.#hasInitialised.resolve(true)
        },
        error: (error) =>
          error?.error?.name !== Dexie.errnames.DatabaseClosed && sentry.captureException(error),
      })
  }

  /**
   * Sets the list of chainIds to query.
   * Existing subscriptions are automatically updated.
   *
   * @param chains - The id and health status of some chains to watch for balances.
   *                 Chains not present in the store will be added.
   *                 Chains present in the store but not in this list will be removed.
   *                 Chains with a different health status to what is in the store will be updated.
   */
  private async setChains(
    chains: Chain[],
    evmNetworks: EvmNetwork[],
    tokens: Token[],
    miniMetadatas: MiniMetadata[]
  ) {
    // Check for changes since the last call to this.setChains
    // compare chains
    const newChains = Object.fromEntries(
      chains.map((chain) => [chain.id, pick(chain, ["id", "genesisHash", "account", "rpcs"])])
    )
    const noChainChanges =
      Object.keys(newChains).length === Object.keys(this.chains).length &&
      isEqual(newChains, this.chains)

    // compare evm networks
    const newEvmNetworks = Object.fromEntries(
      evmNetworks.map((evmNetwork) => [
        evmNetwork.id,
        pick(evmNetwork, ["id", "nativeToken", "substrateChain", "rpcs"]),
      ])
    )

    const noEvmNetworkChanges =
      Object.keys(newEvmNetworks).length === Object.keys(this.evmNetworks).length &&
      isEqual(newEvmNetworks, this.evmNetworks)

    // compare minimetadatas
    const existingMiniMetadataIds = this.#miniMetadataIds
    const noMiniMetadataChanges =
      existingMiniMetadataIds.size === miniMetadatas.length &&
      miniMetadatas.every((m) => existingMiniMetadataIds.has(m.id))

    // compare tokens
    const newTokens = tokens.map(({ id, type, chain, evmNetwork }) => ({
      id,
      type,
      chain,
      evmNetwork,
    }))

    const existingTokens = this.tokens
    const noTokenChanges = isEqual(newTokens, existingTokens)

    // Ignore this call if nothing has changed since the last call to this.setChains
    if (noChainChanges && noEvmNetworkChanges && noMiniMetadataChanges && noTokenChanges) return

    // Update stored chains, evmNetworks, tokens and miniMetadataIds
    this.chains = newChains
    this.evmNetworks = newEvmNetworks
    this.tokens = newTokens
    this.#miniMetadataIds = new Set(miniMetadatas.map((m) => m.id))

    // Delete stored balances for chains and evmNetworks which are inactive / no longer exist
    const tokenIds = new Set(tokens.map((token) => token.id))
    await this.deleteBalances((balance) => {
      // remove balance if chain/evm network doesn't exist
      if (balance.chainId === undefined && balance.evmNetworkId === undefined) return true
      if (balance.chainId !== undefined && !this.chains[balance.chainId]) return true
      if (balance.evmNetworkId !== undefined && !this.evmNetworks[balance.evmNetworkId]) return true

      // remove balance if token doesn't exist
      if (!tokenIds.has(balance.tokenId)) return true

      // remove balance if module doesn't exist
      if (!balanceModules.find((module) => module.type === balance.source)) return true

      // keep balance
      return false
    })

    // Update chains on existing subscriptions
    await this.restartSubscriptions()
  }

  /**
   * Sets the list of addresses to query.
   * Existing subscriptions are automatically updated.
   *
   * NOTE: Cached balances will be deleted for any addresses which are not provided
   * when calling this method.
   *
   * @param accounts - The accounts to watch for balances.
   */
  protected async setAccounts(accounts: Record<string, SingleAddress>) {
    // update the list of watched addresses
    const addresses = Object.fromEntries(
      Object.entries(accounts).map(([address, details]) => {
        const { genesisHash } = details.json.meta
        if (!genesisHash) return [address, null]

        // For accounts locked to a single chain, only query balances on that chain
        return [address, [genesisHash]]
      })
    )
    this.addresses.next(addresses)

    // delete cached balances for accounts which don't exist anymore
    await this.deleteBalances((balance) => {
      //
      // remove balance if account doesn't exist
      //
      if (!balance.address || addresses[balance.address] === undefined) return true

      // keep balance
      return false
    }).catch((error) => {
      log.error("Failed to clean up balances", { error })
    })

    // update addresses on existing subscriptions
    await this.restartSubscriptions()
  }

  /**
   * Deletes all balances from the pool for which the balancesFilter function returns `true`
   */
  private async deleteBalances(balancesFilter: (balance: Balance) => boolean) {
    const balancesToKeep = new Balances(Object.values(this.balances)).each
      .filter((b) => !balancesFilter(b))
      .map((b) => b.toJSON())
    this.setPool(balancesToKeep)
  }

  protected async getSubscriptionParameters(): Promise<Record<string, AddressesByToken<Token>>> {
    log.error("getSubscriptionParameters must be implemented")
    return {}
  }
  /**
   * Opens balance subscriptions to all watched chains and addresses.
   */
  private async openSubscriptions() {
    if (this.#subscriptionsState === "Closing")
      await firstValueFrom(this.#subscriptionsStateUpdated)

    if (this.#subscriptionsState !== "Closed") return
    this.setSubscriptionsState("Open")
    log.log("Opening balance subscriptions")

    const generation = this.#subscriptionsGeneration
    const subscriptionParameters = await this.getSubscriptionParameters()

    const existingBalances = this.balances
    const existingBalancesKeys = new Set(
      Object.values(existingBalances).map((b) => `${b.tokenId}:${b.address}`)
    )

    for (const balanceModule of balanceModules) {
      // some modules returns their initialising status in the subscribeBalances callback
      // so we don't need to check for it here
      // Todo: upgrade all balance modules to this pattern and then remove this logic
      if (NEW_BALANCE_MODULES.includes(balanceModule.type)) continue

      const addressesByToken = subscriptionParameters[balanceModule.type] ?? {}

      for (const [tokenId, addresses] of Object.entries(addressesByToken))
        for (const address of addresses) {
          const id = `${tokenId}:${address}`
          if (!existingBalancesKeys.has(id)) {
            this.#initialising.add(id)
          }
        }
    }

    // after 30 seconds, set the initialising balances to initialised
    // TODO balance modules should manage this like evm-erc20 does
    setTimeout(() => {
      if (this.#subscriptionsGeneration !== generation) return
      this.#initialising.clear()
      // set all currently cached balances to stale
      const staleBalances = Object.values(this.balances)
        .filter(({ status }) => status === "cache")
        .map((balance) => ({ ...balance, status: "stale" } as BalanceJson))

      this.updatePool(staleBalances)
    }, 30_000)

    const currentBalances = Object.values(this.balances)
    const closeSubscriptionCallbacks = balanceModules.map((balanceModule) => {
      const initialModuleBalances = currentBalances.filter((b) => b.source === balanceModule.type)

      return balanceModule.subscribeBalances(
        {
          addressesByToken: subscriptionParameters[balanceModule.type] ?? {},
          initialBalances: initialModuleBalances,
        },
        (error, result) => {
          // ignore old subscriptions which have been told to close but aren't closed yet
          if (this.#subscriptionsGeneration !== generation) return

          if (
            error?.type === "STALE_RPC_ERROR" ||
            error?.type === "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR" ||
            error?.type === "CHAIN_CONNECTION_ERROR"
          ) {
            const addressesByModuleToken = subscriptionParameters[balanceModule.type] ?? {}
            // set status to stale for balances matching the error
            const currentBalances = Object.values(this.balances)
            const staleBalances = Object.values(currentBalances)
              .filter(({ tokenId, address, source, ...rest }) => {
                const locationId = "chainId" in rest ? rest.chainId : rest.evmNetworkId
                const chainComparison = error.chainId
                  ? error.chainId === locationId
                  : error.evmNetworkId
                  ? error.evmNetworkId === locationId
                  : true
                return (
                  chainComparison &&
                  addressesByModuleToken[tokenId]?.includes(address) &&
                  source === balanceModule.type
                )
              })
              .map((balance) => ({ ...balance, status: "stale" } as BalanceJson))

            if (staleBalances.length) this.updatePool(staleBalances)
          } else if (error) {
            log.error("Balances Pool unknown error", error)
          }

          // good balances
          if (result) {
            if ("status" in result) {
              // For modules using the new SubscriptionResultWithStatus pattern
              if (result.status === "initialising") this.#initialising.add(balanceModule.type)
              else this.#initialising.delete(balanceModule.type)
              this.updatePool(result.data)
            } else {
              // add good ones to initialisedBalances
              this.updatePool(Object.values(result.toJSON()))
            }
          }
        }
      )
    })

    this.#closeSubscriptionCallbacks = this.#closeSubscriptionCallbacks.concat(
      closeSubscriptionCallbacks
    )
  }

  /**
   * Closes all balance subscriptions.
   */
  private async closeSubscriptions() {
    if (this.#subscriptionsState === "Closing")
      await firstValueFrom(this.#subscriptionsStateUpdated)

    if (this.#subscriptionsState !== "Open") return
    this.setSubscriptionsState("Closing")
    log.log("Closing balance subscriptions")

    // ignore old subscriptions if they're still closing when we next call `openSubscriptions()`
    this.#subscriptionsGeneration = (this.#subscriptionsGeneration + 1) % Number.MAX_SAFE_INTEGER

    this.#closeSubscriptionCallbacks
      .splice(0, this.#closeSubscriptionCallbacks.length)
      // wait 10_000ms in case the user is opening and closing the popup quickly
      // this way the rpcs will remain connected for an extra ten seconds
      .forEach((cb) => cb.then((close) => setTimeout(close, 10_000)))

    this.setSubscriptionsState("Closed")
    log.log("Closed balance subscriptions")
  }

  /**
   * Restarts all balances subscriptions (if they're open)
   */
  private async restartSubscriptions() {
    if (this.#subscribers.observed) {
      await this.closeSubscriptions()
      await this.openSubscriptions()
    }
  }

  private setSubscriptionsState(newState: SubscriptionsState) {
    this.#subscriptionsState = newState
    this.#subscriptionsStateUpdated.next()
  }
}

/**
 * A balance pool which uses the keyring to watch for balances on internal accounts.
 * Used as the default balance pool.
 */
class KeyringBalancePool extends BalancePool {
  constructor({ persist }: { persist?: boolean }) {
    super({ persist })
    this.initializeKeyringSubscription = this.initializeKeyringSubscription.bind(this)
    this.getSubscriptionParameters = this.getSubscriptionParameters.bind(this)
    this.setOnCleanup(this.initializeKeyringSubscription)
  }
  /**
   * Creates a subscription to automatically call `this.setAccounts` when `keyring.accounts.subject` updates.
   */
  private async initializeKeyringSubscription() {
    // When initializing, our keyring object doesn't immediately contain all of our accounts.
    // To avoid deleting the balances for accounts which are in the wallet, but have not yet
    // been loaded into the keyring, we wait for the full keyring to be loaded.
    await awaitKeyringLoaded()

    // accounts can be added to the keyring by batch (ex: multiple accounts imported from a seed phrase)
    // debounce to ensure the subscriptions aren't restarted multiple times unnecessarily
    return keyring.accounts.subject.pipe(firstThenDebounce(DEBOUNCE_TIMEOUT)).subscribe({
      next: (accounts) => this.setAccounts(accounts),
      error: (error) => sentry.captureException(error),
    })
  }

  async getSubscriptionParameters() {
    const addressesGenesisHashes = await firstValueFrom(this.addresses)

    const addressesByTokenByModule: Record<string, AddressesByToken<Token>> = {}
    this.tokens
      // filter out tokens on chains/evmNetworks which have no rpcs
      .filter(
        (token) =>
          (token.chain?.id && (this.chains[token.chain.id]?.rpcs?.length ?? 0) > 0) ||
          (token.evmNetwork?.id && (this.evmNetworks[token.evmNetwork.id]?.rpcs?.length ?? 0) > 0)
      )
      .forEach((token) => {
        if (!addressesByTokenByModule[token.type]) addressesByTokenByModule[token.type] = {}
        const chain = token.chain?.id ? this.chains[token.chain?.id] : undefined

        addressesByTokenByModule[token.type][token.id] = Object.entries(addressesGenesisHashes)
          .filter(
            // filter out substrate addresses which have a genesis hash that doesn't match the genesisHash of the token's chain
            ([, genesisHashes]) =>
              !token.chain || !genesisHashes || genesisHashes.includes(chain?.genesisHash ?? "")
          )
          .filter(([address]) => {
            // for each address, fetch balances only from compatible chains
            return isEthereumAddress(address)
              ? token.evmNetwork?.id || chain?.account === "secp256k1"
              : token.chain?.id && chain?.account !== "secp256k1"
          })
          .map(([address]) => address)
      })
    return addressesByTokenByModule
  }
}

export const balancePool = new KeyringBalancePool({ persist: true })

export class ExternalBalancePool extends BalancePool {
  #subscriptionParameters: Record<string, AddressesByToken<Token>> = {}

  constructor() {
    super({ persist: false })
  }

  async setSubcriptionParameters({
    addressesByChain,
    addressesAndEvmNetworks,
    addressesAndTokens,
  }: RequestBalancesByParamsSubscribe) {
    // must wait until initialised because some of the parameters to getSubscriptionParams
    // will be set during initialisation
    await this.hasInitialised
    const subscriptionParameters = getSubscriptionParams(
      addressesByChain,
      addressesAndEvmNetworks,
      addressesAndTokens,
      this.chains,
      this.evmNetworks,
      this.tokens
    )

    this.#subscriptionParameters = subscriptionParameters
  }

  protected getSubscriptionParameters(): Promise<Record<string, AddressesByToken<Token>>> {
    return Promise.resolve(this.#subscriptionParameters)
  }
}

const getSubscriptionParams = (
  addressesByChain: AddressesByChain,
  addressesAndEvmNetworks: AddressesAndEvmNetwork,
  addressesAndTokens: AddressesAndTokens,
  activeChains: Record<string, ChainIdAndRpcs>,
  activeEvmNetworks: Record<string, EvmNetworkIdAndRpcs>,
  activeTokens: TokenIdAndType[]
) => {
  //
  // Convert the inputs of `addressesByChain` and `addressesAndEvmNetworks` into what we need
  // for each balance module: `addressesByToken`.
  //

  // const chainsMap = new Map(activeChains.map((c) => [c.id, c]))
  // const evmNetworksMap = new Map(activeEvmNetworks.map((e) => [e.id, e]))
  const tokensMap = Object.fromEntries(activeTokens.map((t) => [t.id, t]))

  // typeguard
  const isNetworkFilter = <T extends ChainIdAndRpcs | EvmNetworkIdAndRpcs>(
    chainOrNetwork: T | undefined
  ): chainOrNetwork is T => chainOrNetwork !== undefined

  const chains = Object.keys(addressesByChain)
    .map((chainId) => activeChains[chainId])
    .filter(isNetworkFilter)
  const evmNetworks = addressesAndEvmNetworks.evmNetworks
    .map(({ id }) => activeEvmNetworks[id])
    .filter(isNetworkFilter)

  const chainsAndAddresses = [
    // includes chains and evmNetworks
    ...chains.map((chain) => [chain, addressesByChain[chain.id]] as const),
    ...evmNetworks.map((evmNetwork) => [evmNetwork, addressesAndEvmNetworks.addresses] as const),
  ]

  const addressesByToken: AddressesByToken<Token> = chainsAndAddresses
    // filter out requested chains/evmNetworks which have no rpcs
    .filter(([{ rpcs }]) => (rpcs?.length ?? 0) > 0)

    // convert chains and evmNetworks into a list of tokenIds
    .flatMap(([chainOrNetwork, addresses]) =>
      activeTokens
        .filter((t) => t.chain?.id === chainOrNetwork.id || t.evmNetwork?.id === chainOrNetwork.id)
        .map((t) => [t.id, addresses] as const)
    )

    // collect all of the addresses for each tokenId into a map of { [tokenId]: addresses }
    .reduce<AddressesByToken<Token>>((addressesByToken, [tokenId, addresses]) => {
      if (!addressesByToken[tokenId]) addressesByToken[tokenId] = []
      addressesByToken[tokenId].push(...addresses)
      return addressesByToken
    }, {})

  for (const tokenId of addressesAndTokens.tokenIds) {
    if (!addressesByToken[tokenId]) addressesByToken[tokenId] = []
    addressesByToken[tokenId].push(
      ...addressesAndTokens.addresses.filter((a) => !addressesByToken[tokenId].includes(a))
    )
  }

  //
  // Separate out the tokens in `addressesByToken` into groups based on `token.type`
  // Input:  {                 [token.id]: addresses,                    [token2.id]: addresses   }
  // Output: { [token.type]: { [token.id]: addresses }, [token2.type]: { [token2.id]: addresses } }
  //
  // This lets us only send each token to the balance module responsible for querying its balance.
  //
  const addressesByTokenByModule: Record<string, AddressesByToken<Token>> = [
    ...Object.entries(addressesByToken)
      // convert tokenIds into tokens
      .map(([tokenId, addresses]) => [tokensMap[tokenId], addresses] as const),
  ]
    // filter out tokens which don't exist
    .filter(([token]) => Boolean(token))

    // group each `{ [token.id]: addresses }` by token.type
    .reduce((byModule, [token, addresses]) => {
      if (!byModule[token.type]) byModule[token.type] = {}
      byModule[token.type][token.id] = addresses
      return byModule
    }, {} as Record<string, AddressesByToken<Token>>)

  return addressesByTokenByModule
}

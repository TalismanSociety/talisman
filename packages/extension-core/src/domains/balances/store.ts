import keyring from "@polkadot/ui-keyring"
import { SingleAddress } from "@polkadot/ui-keyring/observable/types"
import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import * as Sentry from "@sentry/browser"
import {
  AddressesByToken,
  MiniMetadata,
  db as balancesDb,
  deleteSubscriptionId,
} from "@talismn/balances"
import { persistData, retrieveData } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { encodeAnyAddress, isEthereumAddress } from "@talismn/util"
import { firstThenDebounce } from "@talismn/util/src/firstThenDebounce"
import { Dexie, liveQuery } from "dexie"
import { log } from "extension-shared"
import isEqual from "lodash/isEqual"
import omit from "lodash/omit"
import pick from "lodash/pick"
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  Subscription,
  combineLatest,
  firstValueFrom,
} from "rxjs"
import { debounceTime, map } from "rxjs/operators"

import { unsubscribe } from "../../handlers/subscriptions"
import { balanceModules } from "../../rpcs/balance-modules"
import { chaindataProvider } from "../../rpcs/chaindata"
import { Addresses } from "../../types/base"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { SettingsStoreData, settingsStore } from "../app/store.settings"
import { ActiveChains, activeChainsStore, isChainActive } from "../chains/store.activeChains"
import { Chain } from "../chains/types"
import {
  ActiveEvmNetworks,
  activeEvmNetworksStore,
  isEvmNetworkActive,
} from "../ethereum/store.activeEvmNetworks"
import { EvmNetwork } from "../ethereum/types"
import { ActiveTokens, activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"
import {
  Balance,
  BalanceJson,
  BalanceSubscriptionResponse,
  Balances,
  RequestBalance,
} from "./types"

type ChainIdAndRpcs = Pick<Chain, "id" | "genesisHash" | "account" | "rpcs">
type EvmNetworkIdAndRpcs = Pick<EvmNetwork, "id" | "nativeToken" | "substrateChain" | "rpcs">
type TokenIdAndType = Pick<Token, "id" | "type" | "chain" | "evmNetwork">

type SubscriptionsState = "Closed" | "Closing" | "Open"

// debounce time before restarting subscriptions if one of the inputs change
const DEBOUNCE_TIMEOUT = 3_000

// TODO: Fix this class up
//       1. It shouldn't need a whole extra copy of addresses+chains+networks separate to the db
//       2. It shouldn't subscribe to all this data when subscriptions aren't even open
//       3. It should support one-off subscriptions for accounts which aren't in the wallet
//       4. It needs to stop trying to connect to broken RPCs after the subscriptions are closed

export class BalanceStore {
  #subscriptionsState: SubscriptionsState = "Closed"
  #subscriptionsStateUpdated: Subject<void> = new Subject()
  #subscriptionsGeneration = 0
  #closeSubscriptionCallbacks: Array<Promise<() => void>> = []

  #subscribers: Subject<void> = new Subject()
  #pool: BehaviorSubject<Record<string, BalanceJson>> = new BehaviorSubject({})
  #poolStatus: BalanceSubscriptionResponse["status"] = "cached"

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
  #addresses: ReplaySubject<Addresses> = new ReplaySubject(1)
  #chains: ChainIdAndRpcs[] = []
  #evmNetworks: EvmNetworkIdAndRpcs[] = []
  #tokens: TokenIdAndType[] = []
  #miniMetadataIds = new Set<string>()

  #cleanupSubs: Array<Promise<Subscription>>

  /**
   * Initialize the store with a set of addresses and chains.
   */
  constructor() {
    // subscribe this store to all of the inputs it depends on
    this.#cleanupSubs = [
      this.initializeKeyringSubscription(),
      this.initializeChaindataSubscription(),
    ]

    // if we already have subscriptions - start polling
    if (this.#subscribers.observed) this.openSubscriptions()

    balancesDb.open()
    // Hydrate pool from indexedDB
    retrieveData().then((balances) => {
      this.setPool(balances.map((b) => ({ ...b, status: "cache" } as BalanceJson)))
    })

    // Persist pool to indexedDB every 1 minute
    setInterval(() => {
      if (this.#subscribers.observed) this.persist()
    }, 60_000)
  }

  /**
   * Unsubscribes the store from the observables it depends on.
   */
  destroy() {
    return Promise.all(
      this.#cleanupSubs.map((p) => p.then((subscription) => subscription.unsubscribe()))
    )
  }

  /**
   * Create a new subscription to the balances store.
   *
   * @param id - The message id
   * @param port - The message port
   * @returns The subscribe method of the balances pool
   */
  subscribe(id: string, onDisconnected: Promise<void>) {
    // create subscription
    const subscriptionFn = (cb: (val: BalanceSubscriptionResponse) => void) =>
      this.#pool.subscribe((balances) =>
        cb({ status: this.#poolStatus, data: Object.values(balances) })
      )
    const subscription = this.#subscribers.subscribe(() => {})

    // open rpcs (if not already open)
    this.openSubscriptions()

    // close rpcs when the last subscriber disconnects
    onDisconnected.then(() => {
      unsubscribe(id)
      subscription.unsubscribe()

      setTimeout(() => {
        // wait 5 seconds to prevent subscription restart for these use cases :
        // - popup loses focus and user reopens it right away
        // - user opens popup and opens dashboard from it, which closes the popup
        if (!this.#subscribers.observed) {
          this.closeSubscriptions()
          this.persist()
          this.#pool.unsubscribe()
        }
      }, 5_000)
    })

    return subscriptionFn
  }

  private persist() {
    const balancesToPersist = Object.entries(new Balances(this.balances).toJSON()).map(
      ([id, b]) => ({
        id,
        ...omit(b, "status"),
      })
    )

    persistData(balancesToPersist)
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

    const newlyZeroBalances: string[] = []
    const changedBalances = new Balances(
      updatesWithIds.each.filter((newB) => {
        const isLiveZero = newB.total.tokens === "0" && newB.status === "live"
        // Keep new balances, which are not known zeros
        const existingB = existing[newB.id]
        if (!existingB && !isLiveZero) return true

        const hasChanged = !isEqual(existingB, newB.toJSON())
        // Collect balances now confirmed to be zero separately, so they can be filtered out from the main set
        if (hasChanged && isLiveZero) newlyZeroBalances.push(newB.id)
        // Keep changed balances, which are not known zeros
        return hasChanged && !isLiveZero
      })
    ).toJSON()

    if (Object.keys(changedBalances).length === 0 && newlyZeroBalances.length === 0) return
    else
      this.#pool
        .pipe(debounceTime(500))
        .pipe(
          map((val) => {
            // Todo prevent balance modules from sending live 0 balances, for now filter them here
            const nonZeroBalances =
              newlyZeroBalances.length > 0
                ? Object.fromEntries(
                    Object.entries(val).filter(([id]) => !newlyZeroBalances.includes(id))
                  )
                : val
            return { ...nonZeroBalances, ...changedBalances }
          })
        )
        .subscribe({
          next: (v) => {
            this.#pool.next(v)
          },
          error: (e) => log.error(e),
        })
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
      Sentry.captureException(error)
      log.error(error)
      return
    }

    const tokenType = token.type
    const balanceModule = balanceModules.find(({ type }) => type === token.type)
    if (!balanceModule) {
      const error = new Error(`Failed to fetch balance: no module with type ${tokenType}`)
      Sentry.captureException(error)
      log.error(error)
      return
    }

    const addressesByToken = { [tokenId]: [address] }
    const balances = await balanceModule.fetchBalances(addressesByToken)

    return balances.find({ chainId, evmNetworkId, tokenId, address }).sorted[0]?.toJSON()
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
      error: (error) => Sentry.captureException(error),
    })
  }

  /**
   * Creates a subscription to automatically call `this.setChains` when any of the chains/tokens dependencies update.
   */
  private async initializeChaindataSubscription() {
    // subscribe to all the inputs that make up the list of tokens to watch balances for
    // debounce to avoid restarting subscriptions multiple times when settings change rapidly (ex: multiple networks/tokens activated/deactivated rapidly)
    return combineLatest([
      // chains
      chaindataProvider.chainsObservable,
      // evmNetworks
      chaindataProvider.evmNetworksObservable,
      // tokens
      chaindataProvider.tokensObservable,
      // miniMetadatas
      liveQuery(() => balancesDb.miniMetadatas.toArray()),

      // active state of substrate chains
      activeChainsStore.observable,
      // active state of evm networks
      activeEvmNetworksStore.observable,
      // enable state of tokens
      activeTokensStore.observable,

      // settings
      settingsStore.observable,
    ])
      .pipe(firstThenDebounce(DEBOUNCE_TIMEOUT))
      .subscribe({
        next: (args) => this.setChains(...args),
        error: (error) =>
          error?.error?.name !== Dexie.errnames.DatabaseClosed && Sentry.captureException(error),
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
    allChains: Chain[],
    allEvmNetworks: EvmNetwork[],
    allTokens: Token[],
    miniMetadatas: MiniMetadata[],

    activeChainsMap: ActiveChains,
    activeNetworksMap: ActiveEvmNetworks,
    activeTokensMap: ActiveTokens,

    settings: SettingsStoreData
  ) {
    // filter by active chains/networks/tokens
    const filterByActive = <T extends { isTestnet?: boolean }>(
      allItems: T[],
      activeMap: Record<string, boolean>,
      isActiveFn: (item: T, activeMap: Record<string, boolean>) => boolean
    ): T[] =>
      allItems
        .filter((item) => isActiveFn(item, activeMap))
        .filter(settings.useTestnets ? () => true : (item) => !item.isTestnet)

    const chains = filterByActive(allChains, activeChainsMap, isChainActive)
    const evmNetworks = filterByActive(allEvmNetworks, activeNetworksMap, isEvmNetworkActive)
    const tokens = filterByActive(allTokens, activeTokensMap, isTokenActive)

    // Check for changes since the last call to this.setChains
    const newChains = chains.map((chain) => pick(chain, ["id", "genesisHash", "account", "rpcs"]))
    const existingChainsMap = Object.fromEntries(this.#chains.map((chain) => [chain.id, chain]))
    const noChainChanges =
      newChains.length === this.#chains.length &&
      newChains.every((newChain) => isEqual(newChain, existingChainsMap[newChain.id]))
    const existingEvmNetworksMap = Object.fromEntries(
      this.#evmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork])
    )

    const newEvmNetworks = evmNetworks.map((evmNetwork) =>
      pick(evmNetwork, ["id", "nativeToken", "substrateChain", "rpcs"])
    )
    const noEvmNetworkChanges =
      newEvmNetworks.length === this.#evmNetworks.length &&
      newEvmNetworks.every((newEvmNetwork) =>
        isEqual(newEvmNetwork, existingEvmNetworksMap[newEvmNetwork.id])
      )

    const existingMiniMetadataIds = this.#miniMetadataIds
    const noMiniMetadataChanges =
      existingMiniMetadataIds.size === miniMetadatas.length &&
      miniMetadatas.every((m) => existingMiniMetadataIds.has(m.id))

    const newTokens = tokens.map(({ id, type, chain, evmNetwork }) => ({
      id,
      type,
      chain,
      evmNetwork,
    }))
    const existingTokens = this.#tokens
    const noTokenChanges = isEqual(newTokens, existingTokens)

    // Ignore this call if nothing has changed since the last call to this.setChains
    if (noChainChanges && noEvmNetworkChanges && noMiniMetadataChanges && noTokenChanges) return

    // Update stored chains, evmNetworks, tokens and miniMetadataIds
    this.#chains = newChains
    this.#evmNetworks = newEvmNetworks
    this.#tokens = newTokens
    this.#miniMetadataIds = new Set(miniMetadatas.map((m) => m.id))

    // Delete stored balances for chains and evmNetworks which are inactive / no longer exist
    const chainIds = new Set(this.#chains.map((chain) => chain.id))
    const evmNetworkIds = new Set(this.#evmNetworks.map((evmNetwork) => evmNetwork.id))
    const tokenIds = new Set(tokens.map((token) => token.id))
    await this.deleteBalances((balance) => {
      // remove balance if chain/evm network doesn't exist
      if (balance.chainId === undefined && balance.evmNetworkId === undefined) return true
      if (balance.chainId !== undefined && !chainIds.has(balance.chainId)) return true
      if (balance.evmNetworkId !== undefined && !evmNetworkIds.has(balance.evmNetworkId))
        return true

      // remove balance if token doesn't exist
      if (!tokenIds.has(balance.tokenId)) return true

      // remove balance if module doesn't exist
      if (!balanceModules.find((module) => module.type === balance.source)) return true

      // keep balance
      return false
    })

    // Delete stored balances for accounts on incompatible chains
    // 1. Hardware accounts which are locked to a chain shouldn't have balances on other chains
    // 2. Substrate accounts shouldn't have evm balances,
    //    Evm accounts shouldn't have substrate balances (unless the chain uses secp256k1 accounts)
    await firstValueFrom(this.#addresses).then((addresses) =>
      this.deleteBalances((balance) => {
        //
        // delete balances for hardware accounts on chains other than the chain the accounts are locked to
        // these balances aren't fetched anymore, but were fetched prior to v1.14.0, so we need ensure they are cleaned up
        //
        const chain =
          (balance.chainId && this.#chains.find(({ id }) => id === balance.chainId)) || null
        /** hash of balance chain */
        const genesisHash =
          (chain?.genesisHash?.startsWith?.("0x") && (chain.genesisHash as HexString)) || null
        /** chains which balance account is locked to (is null for non-hardware accounts) */
        const hardwareChains = addresses[balance.address]
        if (genesisHash && hardwareChains && !hardwareChains.includes(genesisHash)) return true

        //
        // delete balances for accounts on incompatible chains
        //
        const hasChain = balance.chainId && chainIds.has(balance.chainId)
        const hasEvmNetwork = balance.evmNetworkId && evmNetworkIds.has(balance.evmNetworkId)
        const chainUsesSecp256k1Accounts = chain?.account === "secp256k1"
        if (!isEthereumAddress(balance.address) && !hasChain) {
          return true
        }
        if (isEthereumAddress(balance.address) && !(hasEvmNetwork || chainUsesSecp256k1Accounts)) {
          return true
        }

        // keep balance
        return false
      })
    )

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
  private async setAccounts(accounts: Record<string, SingleAddress>) {
    // update the list of watched addresses
    const addresses = Object.fromEntries(
      Object.entries(accounts).map(([address, details]) => {
        const { genesisHash } = details.json.meta
        if (!genesisHash) return [address, null]

        // For accounts locked to a single chain, only query balances on that chain
        return [address, [genesisHash]]
      })
    )
    this.#addresses.next(addresses)

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
    const addresses = await firstValueFrom(this.#addresses)
    const tokens = this.#tokens
    const chainDetails = Object.fromEntries(
      this.#chains.map(({ id, genesisHash, rpcs, account }) => [id, { genesisHash, rpcs, account }])
    )
    const evmNetworkDetails = Object.fromEntries(
      this.#evmNetworks.map(({ id, rpcs }) => [id, { rpcs }])
    )

    const addressesByTokenByModule: Record<string, AddressesByToken<Token>> = {}
    tokens.forEach((token) => {
      // filter out tokens on chains/evmNetworks which have no rpcs
      const hasRpcs =
        (token.chain?.id && (chainDetails[token.chain.id]?.rpcs?.length ?? 0) > 0) ||
        (token.evmNetwork?.id && (evmNetworkDetails[token.evmNetwork.id]?.rpcs?.length ?? 0) > 0)
      if (!hasRpcs) return

      if (!addressesByTokenByModule[token.type]) addressesByTokenByModule[token.type] = {}

      addressesByTokenByModule[token.type][token.id] = Object.keys(addresses)
        .filter(
          // filter out substrate addresses which have a genesis hash that doesn't match the genesisHash of the token's chain
          (address) =>
            !token.chain ||
            !addresses[address] ||
            addresses[address]?.includes(chainDetails[token.chain.id]?.genesisHash ?? "")
        )
        .filter((address) => {
          // for each account, fetch balances only from compatible chains
          return isEthereumAddress(address)
            ? !!token.evmNetwork?.id || chainDetails[token.chain?.id ?? ""]?.account === "secp256k1"
            : !!token.chain?.id
        })
    })

    const initialisingBalances: Map<string, BalanceJson> = new Map()
    const initialisedBalances: string[] = []
    const existingBalances = this.balances
    const existingBalancesKeys = new Set(
      Object.values(existingBalances).map((b) => `${b.tokenId}:${b.address}`)
    )

    for (const balanceModule of balanceModules) {
      const addressesByToken = addressesByTokenByModule[balanceModule.type] ?? {}
      for (const [tokenId, addresses] of Object.entries(addressesByToken))
        for (const address of addresses) {
          const id = `${tokenId}:${address}`
          if (!existingBalancesKeys.has(id) && !initialisedBalances.includes(id))
            this.#poolStatus = "initialising"
        }
    }

    // after 30 seconds, set the initialising balances to initialised
    // TODO not sure if this should be here at all, balance modules should manage this
    setTimeout(() => {
      if (this.#subscriptionsGeneration !== generation) return
      initialisedBalances.push(...Array.from(initialisingBalances.keys()))
      this.#poolStatus = "live"
    }, 30_000)

    const closeSubscriptionCallbacks = balanceModules.map((balanceModule) =>
      balanceModule.subscribeBalances(
        addressesByTokenByModule[balanceModule.type] ?? {},
        (error, result) => {
          // ignore old subscriptions which have been told to close but aren't closed yet
          if (this.#subscriptionsGeneration !== generation) return

          if (
            error?.type === "STALE_RPC_ERROR" ||
            error?.type === "WEBSOCKET_ALLOCATION_EXHAUSTED_ERROR"
          ) {
            const addressesByModuleToken = addressesByTokenByModule[balanceModule.type] ?? {}
            // set status to stale for balances which are still initializing
            const staleObservable = this.#pool.pipe(
              map((val) =>
                Object.values(val)
                  .filter(
                    ({ tokenId, address, source, chainId, evmNetworkId }) =>
                      (chainId === error.chainId || evmNetworkId === error.evmNetworkId) &&
                      addressesByModuleToken[tokenId]?.includes(address) &&
                      source === balanceModule.type
                  )
                  .map((balance) => ({ ...balance, status: "stale" } as BalanceJson))
              )
            )

            firstValueFrom(staleObservable).then((v) => {
              if (v.length) this.updatePool(v)
            })

            return true
          }

          if (error) return log.error(error)
          // good balances
          if (result) {
            // add good ones to initialisedBalances
            this.updatePool(Object.values(result.toJSON()))
          }
        }
      )
    )

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

    try {
      deleteSubscriptionId()
    } catch (cause) {
      log.error(new Error("Failed to delete subscriptionId", { cause }))
    }

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

export const balanceStore = new BalanceStore()

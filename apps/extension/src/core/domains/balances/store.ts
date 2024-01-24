import { settingsStore } from "@core/domains/app/store.settings"
import { Balance, BalanceJson, Balances, RequestBalance } from "@core/domains/balances/types"
import { Chain } from "@core/domains/chains/types"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { Erc20Token } from "@core/domains/tokens/types"
import { unsubscribe } from "@core/handlers/subscriptions"
import { log } from "@core/log"
import { balanceModules } from "@core/rpcs/balance-modules"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { Addresses, Port } from "@core/types/base"
import { awaitKeyringLoaded } from "@core/util/awaitKeyringLoaded"
import { validateHexString } from "@core/util/validateHexString"
import keyring from "@polkadot/ui-keyring"
import { SingleAddress } from "@polkadot/ui-keyring/observable/types"
import { assert } from "@polkadot/util"
import { isEthereumAddress } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import {
  AddressesByToken,
  BalanceStatusLive,
  MiniMetadata,
  db as balancesDb,
  createSubscriptionId,
  deleteSubscriptionId,
} from "@talismn/balances"
import { Token, TokenList } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import { Dexie, liveQuery } from "dexie"
import isEqual from "lodash/isEqual"
import pick from "lodash/pick"
import {
  ReplaySubject,
  Subject,
  combineLatest,
  debounceTime,
  first,
  firstValueFrom,
  merge,
} from "rxjs"

import { activeChainsStore, isChainActive } from "../chains/store.activeChains"
import { activeEvmNetworksStore, isEvmNetworkActive } from "../ethereum/store.activeEvmNetworks"
import { activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"

type ChainIdAndRpcs = Pick<Chain, "id" | "genesisHash" | "account" | "rpcs">
type EvmNetworkIdAndRpcs = Pick<EvmNetwork, "id" | "nativeToken" | "substrateChain" | "rpcs"> & {
  erc20Tokens: Array<Pick<Erc20Token, "id" | "contractAddress">>
  substrateChainAccountFormat: string | null
}
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

  #chains: ChainIdAndRpcs[] = []
  #evmNetworks: EvmNetworkIdAndRpcs[] = []
  #tokens: TokenIdAndType[] = []
  #miniMetadataIds = new Set<string>()

  /**
   * A map of accounts to query balances for, in the format:
   *
   *     {
   *       [`account address`]: [`allowed chain genesis hash`, ...] | null // null if account is allowed on all chains
   *     }
   */
  #addresses: ReplaySubject<Addresses> = new ReplaySubject(1)
  #addressesCleanupTimeout: ReturnType<typeof setTimeout> | null = null

  #subscribers: Subject<void> = new Subject()

  /**
   * Initialize the store with a set of addresses and chains.
   */
  constructor() {
    awaitKeyringLoaded()
      .then(() => {
        // accounts can be added to the keyring by batch (ex: multiple accounts imported from a seed phrase)
        // debounce to ensure the subscriptions arent restarted multiple times unnecessarily
        merge(
          keyring.accounts.subject.pipe(first()),
          keyring.accounts.subject.pipe(debounceTime(DEBOUNCE_TIMEOUT))
        ).subscribe(this.setAccounts.bind(this))
      })
      .catch((err) => log.error("Failed to load keyring", { err }))

    // subscribe to all the inputs that make up the list of tokens to watch balances for
    const inputsObservable = combineLatest(
      // settings
      settingsStore.observable,
      // chains
      chaindataProvider.chainsListObservable,
      // evmNetworks
      chaindataProvider.evmNetworksListObservable,
      // tokens
      chaindataProvider.tokensListObservable,
      // miniMetadatas
      liveQuery(async () => await balancesDb.miniMetadatas.toArray()),
      // active state of evm networks
      activeEvmNetworksStore.observable,
      // active state of substrate chains
      activeChainsStore.observable,
      // enable state of tokens
      activeTokensStore.observable
    )

    // prevent restarting subscriptions when settings change rapidly (ex: multiple networks/tokens activated/deactivated rapidly)
    const debouncedInputsObservable = merge(
      inputsObservable.pipe(first()),
      inputsObservable.pipe(debounceTime(DEBOUNCE_TIMEOUT))
    )

    debouncedInputsObservable.subscribe({
      next: ([
        settings,
        chains,
        evmNetworks,
        tokens,
        miniMetadatas,
        activeEvmNetworks,
        activeChains,
        activeTokens,
      ]) => {
        const activeChainsList = Object.fromEntries(
          Object.entries(chains ?? {}).filter(
            ([, chain]) =>
              isChainActive(chain, activeChains) && (settings.useTestnets ? true : !chain.isTestnet)
          )
        )
        const activeEvmNetworksList = Object.fromEntries(
          Object.entries(evmNetworks ?? {}).filter(
            ([, evmNetwork]) =>
              isEvmNetworkActive(evmNetwork, activeEvmNetworks) &&
              (settings.useTestnets ? true : !evmNetwork.isTestnet)
          )
        )
        const activeTokensList = Object.fromEntries(
          Object.entries(tokens ?? {}).filter(
            ([, token]) =>
              (activeEvmNetworksList[token.evmNetwork?.id ?? ""] ||
                activeChainsList[token.chain?.id || ""]) &&
              isTokenActive(token, activeTokens) &&
              (settings.useTestnets ? true : !token.isTestnet)
          )
        )

        const arErc20Tokens = Object.values(activeTokensList).filter((t) => t.type === "evm-erc20")

        const erc20TokensByEvmNetwork = Object.keys(activeEvmNetworks).reduce(
          (groupByNetwork, evmNetworkId) => {
            const tokens = arErc20Tokens.filter((t) => t.evmNetwork?.id === evmNetworkId)
            if (tokens.length)
              groupByNetwork[evmNetworkId] = tokens.map((t) =>
                pick(t as Erc20Token, ["id", "contractAddress"])
              )
            return groupByNetwork
          },
          {} as { [key: EvmNetworkId]: EvmNetworkIdAndRpcs["erc20Tokens"] }
        )

        const chainsToFetch = Object.values(activeChainsList).map((chain) =>
          pick(chain, ["id", "genesisHash", "account", "rpcs"])
        )
        const evmNetworksToFetch = Object.values(activeEvmNetworksList).map((evmNetwork) => ({
          ...pick(evmNetwork, ["id", "nativeToken", "substrateChain", "rpcs"]),
          erc20Tokens: erc20TokensByEvmNetwork[evmNetwork.id],
          substrateChainAccountFormat:
            (evmNetwork.substrateChain && chains[evmNetwork.substrateChain.id]?.account) || null,
        }))

        this.setChains(chainsToFetch, evmNetworksToFetch, activeTokensList, miniMetadatas)
      },
      error: (error) => {
        if (error.cause?.name === Dexie.errnames.DatabaseClosed) return
        else Sentry.captureException(error)
      },
    })

    // if we already have subscriptions - start polling
    if (this.#subscribers.observed) this.openSubscriptions()
  }

  /**
   * Gets the balance for an address on a chain, either from the store if the address is in the wallet, or externally from the RPC.
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
    const storeBalances = new Balances(await balancesDb.balances.toArray())
    const networkFilter = chainId ? { chainId } : { evmNetworkId }
    const existing = storeBalances.find({ ...networkFilter, tokenId, address })
    if (existing.count > 0) return existing.sorted[0]?.toJSON()

    // no existing balance found, fetch it directly via rpc
    const token = await chaindataProvider.getToken(tokenId)
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
   * Sets the list of chainIds to query.
   * Existing subscriptions are automatically updated.
   *
   * @param chains - The id and health status of some chains to watch for balances.
   *                 Chains not present in the store will be added.
   *                 Chains present in the store but not in this list will be removed.
   *                 Chains with a different health status to what is in the store will be updated.
   */
  async setChains(
    newChains: ChainIdAndRpcs[],
    newEvmNetworks: EvmNetworkIdAndRpcs[],
    tokens: TokenList,
    miniMetadatas: MiniMetadata[]
  ) {
    // Check for updates
    const existingChainsMap = Object.fromEntries(this.#chains.map((chain) => [chain.id, chain]))
    const noChainChanges =
      newChains.length === this.#chains.length &&
      newChains.every((newChain) => isEqual(newChain, existingChainsMap[newChain.id]))
    const existingEvmNetworksMap = Object.fromEntries(
      this.#evmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork])
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

    const newTokens = Object.values(tokens).map(({ id, type, chain, evmNetwork }) => ({
      id,
      type,
      chain,
      evmNetwork,
    }))
    const existingTokens = this.#tokens
    const noTokenChanges = isEqual(newTokens, existingTokens)

    if (noChainChanges && noEvmNetworkChanges && noMiniMetadataChanges && noTokenChanges) return

    // Update chains and networks
    this.#chains = newChains
    this.#evmNetworks = newEvmNetworks
    this.#tokens = newTokens

    const chainsMap = Object.fromEntries(this.#chains.map((chain) => [chain.id, chain]))
    const evmNetworksMap = Object.fromEntries(
      this.#evmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork])
    )

    this.#miniMetadataIds = new Set(miniMetadatas.map((m) => m.id))

    // Delete stored balances for chains and networks which no longer exist
    await this.deleteBalances((balance) => {
      // remove balance if chain/evm network doesn't exist
      if (balance.chainId === undefined && balance.evmNetworkId === undefined) return true
      if (balance.chainId !== undefined && chainsMap[balance.chainId] === undefined) return true
      if (balance.evmNetworkId !== undefined && evmNetworksMap[balance.evmNetworkId] === undefined)
        return true

      // remove balance if token doesn't exist
      if (tokens[balance.tokenId] === undefined) return true

      // remove balance if module doesn't exist
      if (!balanceModules.find((module) => module.type === balance.source)) return true

      // keep balance
      return false
    })

    // Update chains on existing subscriptions
    if (this.#subscribers.observed) {
      await this.closeSubscriptions()
      await this.openSubscriptions()
    }
  }

  /**
   * Sets the list of addresses to query.
   * Existing subscriptions are automatically updated.
   *
   * @param accounts - The accounts to watch for balances.
   */
  private async setAccounts(accounts: Record<string, SingleAddress>) {
    // ignore empty keyring while the wallet is still initialising
    if (Object.keys(accounts).length < 1) return

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

    // delete stored balances for addresses which no longer exist
    //
    // When initializing, our keyring object doesn't immediately contain all of our accounts.
    // There will be a few updates where `accounts` is incomplete.
    // To avoid deleting the balances for accounts which are still in the wallet, but have not yet
    // been loaded into the keyring, we wait about 10 seconds before running this cleanup job.
    //
    // If this job is triggered while a pending cleanup has not run yet, we cancel the pending one
    // and replace it with the latest one (which will have more accounts loaded).
    if (this.#addressesCleanupTimeout !== null) clearTimeout(this.#addressesCleanupTimeout)
    this.#addressesCleanupTimeout = setTimeout(() => {
      this.#addressesCleanupTimeout = null
      this.deleteBalances((balance) => {
        // remove balance if account doesn't exist
        if (!balance.address || addresses[balance.address] === undefined) return true

        // delete balances for hardware accounts on chains other than the one they were created on
        // these aren't fetched anymore but were fetched prior to v1.14.0, so we need to clean them up
        const chainId = balance.chainId
        const chain = (chainId && this.#chains.find((chain) => chain.id === chainId)) || undefined
        const genesisHash = chain?.genesisHash ? validateHexString(chain.genesisHash) : undefined
        if (
          genesisHash &&
          addresses[balance.address] && // first check if account has any genesisHashes
          !addresses[balance.address]?.includes(genesisHash) // then check if match
        )
          return true

        // keep balance
        return false
      }).catch((error) => {
        log.error("Failed to clean up balances", { error })
      })
    }, 10_000 /* 10_000ms = 10 seconds */)

    // update addresses on existing subscriptions
    if (this.#subscribers.observed) {
      await this.closeSubscriptions()
      await this.openSubscriptions()
    }
  }

  /**
   * Deletes all balances from the DB for which the balancesFilter function returns `true`
   */
  private async deleteBalances(balancesFilter: (balance: Balance) => boolean) {
    return await balancesDb.transaction("rw", balancesDb.balances, async () => {
      const deleteBalances = new Balances(await balancesDb.balances.toArray()).each
        .filter(balancesFilter)
        .map((balance) => balance.id)

      await balancesDb.balances.bulkDelete(deleteBalances)
    })
  }

  /**
   * Create a new subscription to the balances store.
   *
   * @param id - The message id
   * @param port - The message port
   * @returns The subscription `Unsubscribe` function
   */
  async subscribe(id: string, port: Port) {
    // create subscription
    const subscription = this.#subscribers.subscribe(() => {})

    // open rpcs (if not already open)
    this.openSubscriptions()

    // close rpcs when the last subscriber disconnects
    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()

      setTimeout(() => {
        // wait 5 seconds to prevent subscription restart for these use cases :
        // - popup loses focus and user reopens it right away
        // - user opens popup and opens dashboard from it, which closes the popup
        if (!this.#subscribers.observed) this.closeSubscriptions()
      }, 5_000)
    })

    return true
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

    const subscriptionId = createSubscriptionId()

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

    // create placeholder rows for all missing balances, so FE knows they are initializing
    const missingBalances: BalanceJson[] = []
    const existingBalances = await balancesDb.balances.toArray()
    const existingBalancesKeys = new Set(existingBalances.map((b) => `${b.tokenId}:${b.address}`))

    for (const balanceModule of balanceModules) {
      const addressesByToken = addressesByTokenByModule[balanceModule.type] ?? {}
      for (const [tokenId, addresses] of Object.entries(addressesByToken))
        for (const address of addresses) {
          if (!existingBalancesKeys.has(`${tokenId}:${address}`))
            missingBalances.push(balanceModule.getPlaceholderBalance(tokenId, address))
        }
    }

    if (missingBalances.length) {
      const updates = Object.entries(new Balances(missingBalances).toJSON()).map(
        ([id, balance]) => ({ id, ...balance })
      )
      await balancesDb.balances.bulkPut(updates)
    }

    // after 30 seconds, change the status of all balances still initializing to stale
    setTimeout(() => {
      if (this.#subscriptionsGeneration !== generation) return

      balancesDb.balances
        .where({ status: "initializing" })
        .modify({ status: "stale" })
        .catch((error) => log.error("Failed to update balances", { error }))
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
            balancesDb.balances
              .where({ source: balanceModule.type, chainId: error.chainId })
              .filter((balance) => {
                if (!Object.keys(addressesByModuleToken).includes(balance.tokenId)) return false
                if (!addressesByModuleToken[balance.tokenId].includes(balance.address)) return false
                return true
              })
              .modify({ status: "stale" })
            return
          }

          if (error) return log.error(error)

          this.upsertBalances(subscriptionId, result ?? new Balances([])).catch((error) =>
            log.error("Failed to upsert balances", { error })
          )
        }
      )
    )

    this.#closeSubscriptionCallbacks = this.#closeSubscriptionCallbacks.concat(
      closeSubscriptionCallbacks
    )
  }

  /**
   * A callback which receives updated balances from the upstream RPCs.
   *
   * @param balancesUpdates - An list of updated balances.
   */
  private async upsertBalances(subscriptionId: string, balancesUpdates: Balances) {
    // seralize
    const updates = Object.entries(balancesUpdates.toJSON()).map(([id, balance]) => ({
      id,
      ...balance,
      status: BalanceStatusLive(subscriptionId),
    }))

    // update stored balances
    await balancesDb.balances.bulkPut(updates)
  }

  /**
   * Closes all balance subscriptions.
   */
  private async closeSubscriptions() {
    if (this.#subscriptionsState === "Closing")
      await firstValueFrom(this.#subscriptionsStateUpdated)

    if (this.#subscriptionsState !== "Open") return
    this.setSubscriptionsState("Closing")

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
  }

  private setSubscriptionsState(newState: SubscriptionsState) {
    this.#subscriptionsState = newState
    this.#subscriptionsStateUpdated.next()
  }
}

export const balanceStore = new BalanceStore()

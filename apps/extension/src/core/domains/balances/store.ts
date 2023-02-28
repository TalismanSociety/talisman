import { DEBUG } from "@core/constants"
import { settingsStore } from "@core/domains/app/store.settings"
import { Balance, BalanceJson, Balances, RequestBalance } from "@core/domains/balances/types"
import { Chain } from "@core/domains/chains/types"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { Erc20Token } from "@core/domains/tokens/types"
import { unsubscribe } from "@core/handlers/subscriptions"
import { log } from "@core/log"
import { chainConnector } from "@core/rpcs/chain-connector"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { Addresses, Port } from "@core/types/base"
import keyring from "@polkadot/ui-keyring"
import { SingleAddress } from "@polkadot/ui-keyring/observable/types"
import { assert } from "@polkadot/util"
import * as Sentry from "@sentry/browser"
import { AddressesByToken, db as balancesDb } from "@talismn/balances"
import { balanceModules as defaultBalanceModules } from "@talismn/balances-default-modules"
import { Token, TokenList } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/util"
import { liveQuery } from "dexie"
import isEqual from "lodash/isEqual"
import pick from "lodash/pick"
import { ReplaySubject, Subject, combineLatest, firstValueFrom } from "rxjs"

export const balanceModules = defaultBalanceModules

type ChainIdAndHealth = Pick<Chain, "id" | "isHealthy" | "genesisHash" | "account">
type EvmNetworkIdAndHealth = Pick<
  EvmNetwork,
  "id" | "isHealthy" | "nativeToken" | "substrateChain"
> & {
  erc20Tokens: Array<Pick<Erc20Token, "id" | "contractAddress">>
  substrateChainAccountFormat: string | null
}
type TokenIdAndType = Pick<Token, "id" | "type" | "chain" | "evmNetwork">

type SubscriptionsState = "Closed" | "Closing" | "Open"

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

  #chains: ChainIdAndHealth[] = []
  #evmNetworks: EvmNetworkIdAndHealth[] = []
  #tokens: ReplaySubject<TokenIdAndType[]> = new ReplaySubject(1)

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
    // subscribe to the account addresseses from the keyring, and add them to list of addresses to query balances for
    keyring.accounts.subject.subscribe(this.setAccounts.bind(this))

    // subscribe to the chainstore and add chains to the list here
    combineLatest(
      // settings
      settingsStore.observable,
      // chains
      liveQuery(async () => await chaindataProvider.chains()),
      // evmNetworks
      liveQuery(async () => await chaindataProvider.evmNetworks()),
      // tokens
      liveQuery(async () => await chaindataProvider.tokens())
    ).subscribe({
      next: ([settings, chains, evmNetworks, tokens]) => {
        const erc20TokensByNetwork = Object.values(tokens).reduce((byNetwork, token) => {
          if (token.type !== "evm-erc20") return byNetwork

          const { evmNetwork } = token
          if (!evmNetwork) return byNetwork

          if (!byNetwork[evmNetwork.id]) byNetwork[evmNetwork.id] = []
          byNetwork[evmNetwork.id].push(pick(token, ["id", "contractAddress"]))

          return byNetwork
        }, {} as { [key: EvmNetworkId]: EvmNetworkIdAndHealth["erc20Tokens"] })

        // TODO: Only connect to chains on which the user has a non-zero balance.
        this.setChains(
          // substrate chains
          Object.values(chains ?? {})
            .filter((chain) => (settings.useTestnets ? true : !chain.isTestnet))
            .map((chain) => pick(chain, ["id", "isHealthy", "genesisHash", "account"])),

          // evm chains
          Object.values(evmNetworks ?? {})
            .filter((evmNetwork) => (settings.useTestnets ? true : !evmNetwork.isTestnet))
            .map((evmNetwork) => ({
              ...pick(evmNetwork, ["id", "isHealthy", "nativeToken", "substrateChain"]),
              erc20Tokens: erc20TokensByNetwork[evmNetwork.id],
              substrateChainAccountFormat: null,
            })),

          // tokens
          tokens
        )
      },
      error: (error) => Sentry.captureException(error),
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
      DEBUG && console.error(error) // eslint-disable-line no-console
      return
    }

    const tokenType = token.type
    const balanceModule = balanceModules.find(({ type }) => type === token.type)
    if (!balanceModule) {
      const error = new Error(`Failed to fetch balance: no module with type ${tokenType}`)
      Sentry.captureException(error)
      DEBUG && console.error(error) // eslint-disable-line no-console
      return
    }

    const addressesByToken = { [tokenId]: [address] }
    const balances = await balanceModule.fetchBalances(
      { substrate: chainConnector, evm: chainConnectorEvm },
      chaindataProvider,
      addressesByToken
    )

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
    newChains: ChainIdAndHealth[],
    newEvmNetworks: EvmNetworkIdAndHealth[],
    tokens: TokenList
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
    if (noChainChanges && noEvmNetworkChanges) return

    // Update chains and networks
    this.#chains = newChains
    const chainsMap = Object.fromEntries(this.#chains.map((chain) => [chain.id, chain]))
    this.#evmNetworks = newEvmNetworks.map((evmNetwork) => ({
      ...evmNetwork,
      substrateChainAccountFormat:
        (evmNetwork.substrateChain && chainsMap[evmNetwork.substrateChain.id]?.account) || null,
    }))
    const evmNetworksMap = Object.fromEntries(
      this.#evmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork])
    )

    // update tokens
    this.#tokens.next(
      Object.values(tokens).map(({ id, type, chain, evmNetwork }) => ({
        id,
        type,
        chain,
        evmNetwork,
      }))
    )

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
        const { isHardware, genesisHash } = details.json.meta

        if (!isHardware) return [address, null]
        if (!genesisHash) return [address, null]

        // For hardware accounts, only query balances on chains with the account's genesisHash
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
        const chain =
          (balance.chainId && this.#chains.find((b) => b.id === balance.chainId)) || null
        if (
          chain?.genesisHash &&
          addresses[balance.address] && // first check if account has any genesisHashes
          !addresses[balance.address]?.includes(chain.genesisHash) // then check if match
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
      const deleteBalances = new Balances(await balancesDb.balances.toArray()).sorted
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
      if (!this.#subscribers.observed) this.closeSubscriptions()
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

    const generation = this.#subscriptionsGeneration
    const addresses = await firstValueFrom(this.#addresses)
    const tokens = await firstValueFrom(this.#tokens)
    const chainDetails = Object.fromEntries(
      this.#chains.map(({ id, isHealthy, genesisHash }) => [id, { isHealthy, genesisHash }])
    )

    const evmNetworkHealthy = Object.fromEntries(
      this.#evmNetworks.map((evmNetwork) => [evmNetwork.id, evmNetwork.isHealthy])
    )

    // For the following TODOs, try and put them inside the relevant balance module when it makes sense.
    // Otherwise fall back to writing the workaround in here (but also then add it to the web app portfolio!)
    //
    // TODO: Don't fetch evm balances for substrate addresses
    // TODO: Don't fetch evm balances for ethereum accounts on chains whose native account format is secp256k1 (i.e. moonbeam/river/base)
    //       On these chains we can fetch the balance purely via substrate (and fetching via both evm+substrate will double up the balance)
    //
    const addressesByTokenByModule: Record<string, AddressesByToken<Token>> = {}
    tokens.forEach((token) => {
      // filter out tokens on chains/evmNetworks which aren't healthy
      const isHealthy =
        (token.chain?.id && chainDetails[token.chain.id]?.isHealthy) ||
        (token.evmNetwork?.id && evmNetworkHealthy[token.evmNetwork.id])
      if (!isHealthy) return

      if (!addressesByTokenByModule[token.type]) addressesByTokenByModule[token.type] = {}
      // filter out substrate addresses which have a genesis hash that doesn't match the genesisHash of the token's chain
      addressesByTokenByModule[token.type][token.id] = Object.keys(addresses).filter(
        (address) =>
          !token.chain ||
          !addresses[address] ||
          addresses[address]?.includes(chainDetails[token.chain.id]?.genesisHash ?? "")
      )
    })

    const closeSubscriptionCallbacks = balanceModules.map((balanceModule) =>
      balanceModule.subscribeBalances(
        { substrate: chainConnector, evm: chainConnectorEvm },
        chaindataProvider,
        addressesByTokenByModule[balanceModule.type] ?? {},
        (error, result) => {
          // ignore old subscriptions which have been told to close but aren't closed yet
          if (this.#subscriptionsGeneration !== generation) return

          // eslint-disable-next-line no-console
          if (error) DEBUG && console.error(error)
          else
            this.upsertBalances(result ?? new Balances([])).catch((error) => {
              log.error("Failed to upsert balances", { error })
            })
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
  private async upsertBalances(balancesUpdates: Balances) {
    // seralize
    const updates = balancesUpdates.toJSON()

    // update stored balances
    await balancesDb.transaction("rw", balancesDb.balances, async () => {
      await balancesDb.balances.bulkPut(
        Object.entries(updates).map(([id, balance]) => ({ id, ...balance }))
      )
    })
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
      // rpcs are no longer connected,
      // update cached balances to 'cache' status
      await balancesDb.transaction("rw", balancesDb.balances, async () => {
        await balancesDb.balances.toCollection().modify({ status: "cache" })
      })
    } catch (error) {
      log.error("Failed to update all balances to 'cache' status", { error })
    }

    this.setSubscriptionsState("Closed")
  }

  private setSubscriptionsState(newState: SubscriptionsState) {
    this.#subscriptionsState = newState
    this.#subscriptionsStateUpdated.next()
  }
}

export const balanceStore = new BalanceStore()

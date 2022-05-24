import { DEBUG } from "@core/constants"
import { chainStore } from "@core/domains/chains"
import { tokenStore } from "@core/domains/tokens"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import BalancesRpc from "@core/libs/rpc/Balances"
import OrmlTokensRpc from "@core/libs/rpc/OrmlTokens"
import { SubscribableByIdStorageProvider } from "@core/libs/Store"
import {
  Addresses,
  AddressesByChain,
  BalanceStorage,
  Balances,
  BalancesStorage,
  BalancesUpdate,
  Chain,
  Port,
  RequestBalance,
  RequestIdOnly,
} from "@core/types"
import { encodeAnyAddress } from "@core/util"
import keyring from "@polkadot/ui-keyring"
import { SingleAddress } from "@polkadot/ui-keyring/observable/types"
import * as Sentry from "@sentry/browser"
import isEqual from "lodash/isEqual"
import pick from "lodash/pick"
import { Subject, concatWith, defer, map } from "rxjs"

type ChainIdAndHealth = Pick<Chain, "id" | "isHealthy" | "genesisHash">

type SubscriptionsState = "Closed" | "Closing" | "Open"

export class BalanceStore extends SubscribableByIdStorageProvider<
  BalancesStorage,
  "pri(balances.subscribe)",
  "pri(balances.byid.subscribe)"
> {
  #subscriptionsState: SubscriptionsState = "Closed"
  #subscriptionsGeneration: number = 0
  #closeSubscriptionCallbacks: Array<Promise<() => void>> = []

  /** Subscribe to receive a list of *updated balances* whenever a balance is updated */
  readonly #balancesUpdates: Subject<BalancesUpdate> = new Subject<BalancesUpdate>()

  #chains: ChainIdAndHealth[] = []
  #addresses: Addresses = {}

  /**
   * Initialize the store with a set of addresses and chains.
   */
  constructor(prefix: string) {
    super(prefix)

    // remove balances from the store which aren't pallet-aware
    this.get().then((balances) => {
      const deleteKeys = Object.entries(balances)
        .filter(([, balance]) => typeof balance.pallet !== "string")
        .map(([key]) => key)

      this.delete(deleteKeys)
    })

    // get addresses by subscribing to the keyring, and add them to the list here
    keyring.accounts.subject.subscribe((accounts) => {
      // ignore empty keyring while wallet is still initializing
      if (Object.keys(accounts).length < 1) return

      this.setAccounts(accounts)
    })

    // subscribe to the chainstore and add chains to the list here
    chainStore.chains([], (error, chains) => {
      if (error) {
        Sentry.captureException(error)
        return
      }
      // TODO: Only connect to chains on which the user has a non-zero balance.
      this.setChains(
        Object.values(chains ?? {}).map((chain) => pick(chain, ["id", "isHealthy", "genesisHash"]))
      )
    })

    // if we already have subscriptions - start polling
    if (this.observable.observed || this.#balancesUpdates.observed) this.openSubscriptions()
  }

  /**
   * Gets the balance for an address on a chain, either from the store if the address is in the wallet, or externally from the RPC.
   *
   * @param chainId - The id of the chain for which to query the balance
   * @param tokenId - The id of the token for which to query the balance
   * @param address - The address to query the balance
   */
  async getBalance({
    chainId,
    tokenId,
    address: chainFormattedAddress,
  }: RequestBalance): Promise<BalanceStorage | undefined> {
    const address = encodeAnyAddress(chainFormattedAddress, 42)

    // search for existing balance in the store
    const storeBalances = new Balances(await this.get())
    const existing = storeBalances.find({ chainId, tokenId, address })
    if (existing.count > 0) return existing.sorted[0]?.toJSON()

    // no existing balance found, fetch it directly via rpc
    const token = await tokenStore.token(tokenId)
    if (!token) {
      Sentry.captureException(new Error(`Failed to fetch balance: invalid tokenId ${tokenId}`))
      return
    }

    const tokenType = token.type
    if (tokenType === "native")
      return (await BalancesRpc.balances({ [chainId]: [address] }))
        .find({ chainId, tokenId, address })
        .sorted[0]?.toJSON()
    if (tokenType === "orml")
      return (await OrmlTokensRpc.tokens({ [chainId]: [address] }))
        .find({ chainId, tokenId, address })
        .sorted[0]?.toJSON()

    // force compilation error if any token types don't have a case
    const exhaustiveCheck: never = tokenType
    throw new Error(`Unhandled token type ${exhaustiveCheck}`)
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
  async setChains(newChains: ChainIdAndHealth[]) {
    // Check for updates
    const existingChainsMap = Object.fromEntries(this.#chains.map((chain) => [chain.id, chain]))
    const noChanges =
      newChains.length === this.#chains.length &&
      newChains.every((newChain) => isEqual(newChain, existingChainsMap[newChain.id]))
    if (noChanges) return

    // Update chains
    this.#chains = newChains
    const chainsMap = Object.fromEntries(this.#chains.map((chain) => [chain.id, chain]))
    const tokens = await tokenStore.tokens()

    // Delete stored balances for chains which no longer exist
    const deletedBalances: string[] = []
    await this.mutate((balances) =>
      new Balances(balances)
        .find((balance) => {
          // remove balance if chain doesn't exist
          if (!balance.chainId || !chainsMap[balance.chainId]) {
            deletedBalances.push(balance.id)
            return false
          }

          // remove balance if token doesn't exist
          if (!tokens[balance.tokenId]) {
            deletedBalances.push(balance.id)
            return false
          }

          // keep balance
          return true
        })
        .toJSON()
    )

    // Remove deleted balances for any balancesUpdates subscribers
    this.#balancesUpdates.next({ type: "delete", balances: deletedBalances })

    // Update chains on existing subscriptions
    if (this.observable.observed || this.#balancesUpdates.observed) {
      await this.closeSubscriptions()
      this.openSubscriptions()
    }
  }

  /**
   * Sets the list of addresses to query.
   * Existing subscriptions are automatically updated.
   *
   * @param accounts - The accounts to watch for balances.
   */
  async setAccounts(accounts: Record<string, SingleAddress>) {
    this.#addresses = Object.fromEntries(
      Object.entries(accounts).map(([address, accountDetails]) => {
        const { isHardware, genesisHash } = accountDetails.json.meta
        if (!isHardware) return [address, null]
        if (!genesisHash) return [address, null]

        // For hardware accounts, only query balances on chains with the account's genesisHash
        return [address, [genesisHash]]
      })
    )

    // Delete stored balances for accounts which no longer exist
    const deletedBalances: string[] = []
    await this.mutate((balances) =>
      new Balances(balances)
        .find((balance) => {
          // remove balance if account doesn't exist
          if (!balance.address || this.#addresses[balance.address] === undefined) {
            deletedBalances.push(balance.id)
            return false
          }

          // keep balance
          return true
        })
        .toJSON()
    )

    // Remove deleted balances for any balancesUpdates subscribers
    this.#balancesUpdates.next({ type: "delete", balances: deletedBalances })

    // Update addresses on existing subscriptions
    if (this.observable.observed || this.#balancesUpdates.observed) {
      await this.closeSubscriptions()
      this.openSubscriptions()
    }
  }

  /**
   * Create a new subscription to the balances store.
   *
   * @param id - The message id
   * @param port - The message port
   * @returns The subscription `Unsubscribe` function
   */
  async subscribeUpdates(id: string, port: Port) {
    // create subscription callback
    const callback = createSubscription<"pri(balances.subscribe)">(id, port)

    // create an observable to get the currently stored balances
    const storedBalances = defer(() => this.get())

    // subscribe to balances and future balance updates
    const storedBalancesAndUpdates =
      // wait for stored balances before proceeding
      storedBalances.pipe(
        // convert from a BalancesStorage to an upsert
        map((balances): BalancesUpdate => ({ type: "reset", balances })),

        // follow up with all future balances updates
        concatWith(this.#balancesUpdates)
      )

    // create subscription
    const subscription = storedBalancesAndUpdates.subscribe(callback)

    // open rpcs (if not already open)
    this.openSubscriptions()

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()
      if (!this.observable.observed && !this.#balancesUpdates.observed) this.closeSubscriptions()
    })

    return true
  }

  public subscribe(id: string, port: Port, unsubscribeCallback?: () => void): boolean {
    const cb = createSubscription<"pri(balances.subscribe)">(id, port)

    const subscription = this.observable.subscribe((balances) => cb({ type: "upsert", balances }))

    // open rpcs (if not already open)
    this.openSubscriptions()

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()
      if (unsubscribeCallback) unsubscribeCallback()
      if (!this.observable.observed && !this.#balancesUpdates.observed) this.closeSubscriptions()
    })

    return true
  }

  public subscribeById(
    id: string,
    port: Port,
    request: RequestIdOnly,
    unsubscribeCallback?: () => void
  ): boolean {
    const cb = createSubscription<"pri(balances.byid.subscribe)">(id, port)

    const subscription = this.observable.subscribe((data) => cb(data[request.id]))

    // open rpcs (if not already open)
    this.openSubscriptions()

    port.onDisconnect.addListener((): void => {
      unsubscribe(id)
      subscription.unsubscribe()
      if (unsubscribeCallback) unsubscribeCallback()
      if (!this.observable.observed && !this.#balancesUpdates.observed) this.closeSubscriptions()
    })

    return true
  }

  /**
   * Opens balance subscriptions to all watched chains and addresses.
   */
  private openSubscriptions() {
    if (this.#subscriptionsState !== "Closed") return
    this.#subscriptionsState = "Open"

    const generation = this.#subscriptionsGeneration

    const chainAddresses = this.#chains
      .filter(({ isHealthy }) => isHealthy)
      .reduce((result, chain) => {
        result[chain.id] = Object.entries(this.#addresses)
          .filter(
            ([, genesisHashes]) =>
              genesisHashes === null ||
              (chain.genesisHash && genesisHashes?.includes(chain.genesisHash))
          )
          .map(([address, ,]) => address)
        return result
      }, {} as AddressesByChain)

    this.#closeSubscriptionCallbacks = this.#closeSubscriptionCallbacks
      .concat(
        BalancesRpc.balances(chainAddresses, (error, result) => {
          // ignore old subscriptions which have been told to close but aren't closed yet
          if (this.#subscriptionsGeneration !== generation) return

          // eslint-disable-next-line no-console
          if (error) DEBUG && console.error(error)
          else this.upsertBalances(result ?? new Balances([]))
        })
      )
      .concat(
        OrmlTokensRpc.tokens(chainAddresses, (error, result) => {
          // ignore old subscriptions which have been told to close but aren't closed yet
          if (this.#subscriptionsGeneration !== generation) return

          // eslint-disable-next-line no-console
          if (error) DEBUG && console.error(error)
          else this.upsertBalances(result ?? new Balances([]))
        })
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
    await this.set(updates)

    // inform subscribers of balances updates
    this.#balancesUpdates.next({ type: "upsert", balances: updates })
  }

  /**
   * Closes all balance subscriptions.
   */
  private async closeSubscriptions() {
    if (this.#subscriptionsState !== "Open") return
    this.#subscriptionsState = "Closing"

    // ignore old subscriptions if they're still closing when we next call `openSubscriptions()`
    this.#subscriptionsGeneration = (this.#subscriptionsGeneration + 1) % Number.MAX_SAFE_INTEGER

    this.#closeSubscriptionCallbacks
      .splice(0, this.#closeSubscriptionCallbacks.length)
      // wait 10_000ms in case the user is opening and closing the popup quickly
      // this way the rpcs will remain connected for an extra ten seconds
      .forEach((cb) => cb.then((close) => setTimeout(close, 10_000)))

    // rpcs are no longer connected,
    // update cached balances to 'cache' status
    await this.mutate((cachedBalances) => {
      for (const balanceKey in cachedBalances) {
        cachedBalances[balanceKey].status = "cache"
      }
      return cachedBalances
    })

    this.#subscriptionsState = "Closed"
  }
}

const balanceStoreInstance = new BalanceStore("balances")
export default balanceStoreInstance

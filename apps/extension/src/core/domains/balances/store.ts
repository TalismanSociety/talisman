import { DEBUG } from "@core/constants"
import { settingsStore } from "@core/domains/app/store.settings"
import { unsubscribe } from "@core/handlers/subscriptions"
import { db } from "@core/libs/db"
import Erc20BalancesEvmRpc from "@core/libs/evmRpc/Erc20Balances"
import NativeBalancesEvmRpc from "@core/libs/evmRpc/NativeBalances"
import BalancesRpc from "@core/libs/rpc/Balances"
import OrmlTokensRpc from "@core/libs/rpc/OrmlTokens"
import {
  Addresses,
  AddressesByChain,
  BalanceStorage,
  Balances,
  Chain,
  Erc20Token,
  EvmNetwork,
  EvmNetworkId,
  Port,
  RequestBalance,
} from "@core/types"
import { encodeAnyAddress } from "@core/util"
import keyring from "@polkadot/ui-keyring"
import { SingleAddress } from "@polkadot/ui-keyring/observable/types"
import { isEthereumAddress } from "@polkadot/util-crypto"
import * as Sentry from "@sentry/browser"
import { liveQuery } from "dexie"
import isEqual from "lodash/isEqual"
import pick from "lodash/pick"
import { Subject, combineLatest } from "rxjs"

type ChainIdAndHealth = Pick<Chain, "id" | "isHealthy" | "genesisHash" | "account">
type EvmNetworkIdAndHealth = Pick<
  EvmNetwork,
  "id" | "isHealthy" | "nativeToken" | "substrateChain"
> & {
  erc20Tokens: Array<Pick<Erc20Token, "id" | "contractAddress">>
  substrateChainAccountFormat: string | null
}

type SubscriptionsState = "Closed" | "Closing" | "Open"

export class BalanceStore {
  #subscriptionsState: SubscriptionsState = "Closed"
  #subscriptionsGeneration: number = 0
  #closeSubscriptionCallbacks: Array<Promise<() => void>> = []

  #chains: ChainIdAndHealth[] = []
  #evmNetworks: EvmNetworkIdAndHealth[] = []
  #addresses: Addresses = {}

  #subscribers: Subject<void> = new Subject()

  /**
   * Initialize the store with a set of addresses and chains.
   */
  constructor() {
    // get addresses by subscribing to the keyring, and add them to the list here
    keyring.accounts.subject.subscribe((accounts) => {
      // ignore empty keyring while wallet is still initializing
      if (Object.keys(accounts).length < 1) return

      this.setAccounts(accounts)
    })

    // subscribe to the chainstore and add chains to the list here
    combineLatest(
      // settings
      settingsStore.observable,
      // chains
      liveQuery(async () =>
        Object.fromEntries((await db.chains.toArray()).map((chain) => [chain.id, chain]))
      ),
      // evmNetworks
      liveQuery(async () =>
        Object.fromEntries(
          (await db.evmNetworks.toArray()).map((evmNetwork) => [evmNetwork.id, evmNetwork])
        )
      ),
      // tokens
      liveQuery(async () =>
        Object.fromEntries((await db.tokens.toArray()).map((token) => [token.id, token]))
      )
    ).subscribe({
      next: ([settings, chains, evmNetworks, tokens]) => {
        const erc20TokensByNetwork = Object.values(tokens).reduce((byNetwork, token) => {
          if (token.type !== "erc20") return byNetwork

          const { evmNetwork } = token
          if (!evmNetwork) return byNetwork

          if (!byNetwork[evmNetwork.id]) byNetwork[evmNetwork.id] = []
          byNetwork[evmNetwork.id].push(pick(token, ["id", "contractAddress"]))

          return byNetwork
        }, {} as { [key: EvmNetworkId]: EvmNetworkIdAndHealth["erc20Tokens"] })

        // TODO: Only connect to chains on which the user has a non-zero balance.
        this.setChains(
          Object.values(chains ?? {})
            .filter((chain) => (settings.useTestnets ? true : !chain.isTestnet))
            .map((chain) => pick(chain, ["id", "isHealthy", "genesisHash", "account"])),
          Object.values(evmNetworks ?? {})
            .filter((evmNetwork) => (settings.useTestnets ? true : !evmNetwork.isTestnet))
            .map((evmNetwork) => ({
              ...pick(evmNetwork, ["id", "isHealthy", "nativeToken", "substrateChain"]),
              erc20Tokens: erc20TokensByNetwork[evmNetwork.id],
              substrateChainAccountFormat: null,
            }))
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
   * @param tokenId - The id of the token for which to query the balance
   * @param address - The address to query the balance
   */
  async getBalance({
    chainId,
    evmNetworkId,
    tokenId,
    address: chainFormattedAddress,
  }: RequestBalance): Promise<BalanceStorage | undefined> {
    const address = encodeAnyAddress(chainFormattedAddress, 42)

    // search for existing balance in the store
    const storeBalances = new Balances(await db.balances.toArray())
    const existing = storeBalances.find({ chainId, evmNetworkId, tokenId, address })
    if (existing.count > 0) return existing.sorted[0]?.toJSON()

    // no existing balance found, fetch it directly via rpc
    const token = await db.tokens.get(tokenId)
    if (!token) {
      Sentry.captureException(new Error(`Failed to fetch balance: invalid tokenId ${tokenId}`))
      return
    }

    const tokenType = token.type
    if (tokenType === "native")
      return (await BalancesRpc.balances({ [chainId!]: [address] }))
        .find({ chainId, tokenId, address })
        .sorted[0]?.toJSON()
    if (tokenType === "orml")
      return (await OrmlTokensRpc.tokens({ [chainId!]: [address] }))
        .find({ chainId, tokenId, address })
        .sorted[0]?.toJSON()
    if (tokenType === "erc20") throw new Error("Not implemented")

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
  async setChains(newChains: ChainIdAndHealth[], newEvmNetworks: EvmNetworkIdAndHealth[]) {
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
    const tokens = Object.fromEntries((await db.tokens.toArray()).map((token) => [token.id, token]))

    // Delete stored balances for chains and networks which no longer exist
    await db.transaction("rw", db.balances, async () => {
      const deleteBalances = new Balances(await db.balances.toArray()).sorted
        .filter((balance) => {
          // remove balance if chain doesn't exist
          if (
            (!balance.chainId && balance.evmNetworkId === undefined) ||
            (balance.chainId && !chainsMap[balance.chainId]) ||
            (balance.evmNetworkId !== undefined && !evmNetworksMap[balance.evmNetworkId])
          )
            return true

          // remove balance if token doesn't exist
          if (!tokens[balance.tokenId]) return true

          // keep balance
          return false
        })
        .map((balance) => balance.id)

      await db.balances.bulkDelete(deleteBalances)
    })

    // Update chains on existing subscriptions
    if (this.#subscribers.observed) {
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
    await db.transaction("rw", db.balances, async () => {
      const deleteBalances = new Balances(await db.balances.toArray()).sorted
        .filter((balance) => {
          // remove balance if account doesn't exist
          if (!balance.address || this.#addresses[balance.address] === undefined) return true

          // keep balance
          return false
        })
        .map((balance) => balance.id)

      await db.balances.bulkDelete(deleteBalances)
    })

    // Update addresses on existing subscriptions
    if (this.#subscribers.observed) {
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
      .concat(
        NativeBalancesEvmRpc.balances(
          Object.keys(this.#addresses).filter(isEthereumAddress),
          this.#evmNetworks.filter(
            // for chains with secp256k1 (ethereum) accounts we fetch the native token balance via their substrate api.
            (evmNetwork) => evmNetwork.substrateChainAccountFormat !== "secp256k1"
          ),
          (error, result) => {
            // ignore old subscriptions which have been told to close but aren't closed yet
            if (this.#subscriptionsGeneration !== generation) return

            // eslint-disable-next-line no-console
            if (error) DEBUG && console.error(error)
            else this.upsertBalances(result ?? new Balances([]))
          }
        )
      )
      .concat(
        Erc20BalancesEvmRpc.balances(
          Object.keys(this.#addresses).filter(isEthereumAddress),
          Object.fromEntries(this.#evmNetworks.map(({ id, erc20Tokens }) => [id, erc20Tokens])),
          (error, result) => {
            // ignore old subscriptions which have been told to close but aren't closed yet
            if (this.#subscriptionsGeneration !== generation) return

            // eslint-disable-next-line no-console
            if (error) DEBUG && console.error(error)
            else this.upsertBalances(result ?? new Balances([]))
          }
        )
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
    await db.transaction("rw", db.balances, async () => {
      await db.balances.bulkPut(
        Object.entries(updates).map(([id, balance]) => ({ id, ...balance }))
      )
    })
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
    await db.transaction("rw", db.balances, async () => {
      await db.balances.toCollection().modify({ status: "cache" })
    })

    this.#subscriptionsState = "Closed"
  }
}

const balanceStoreInstance = new BalanceStore()
export default balanceStoreInstance

import keyring from "@polkadot/ui-keyring"
import {
  AddressesByToken,
  Balance,
  BalanceJson,
  MiniMetadata,
  UnsubscribeFn,
  db as balancesDb,
} from "@talismn/balances"
import { ChainId, ChainList, EvmNetworkList, Token, TokenList } from "@talismn/chaindata-provider"
import { isValidSubstrateAddress } from "@talismn/util"
import { liveQuery } from "dexie"
import { DEBUG } from "extension-shared"
import isEqual from "lodash/isEqual"
import { combineLatest } from "rxjs"

import { createSubscription, portDisconnected, unsubscribe } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { balanceModules } from "../../rpcs/balance-modules"
import { chaindataProvider } from "../../rpcs/chaindata"
import { updateAndWaitForUpdatedChaindata } from "../../rpcs/mini-metadata-updater"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { AddressesByChain, Port } from "../../types/base"
import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { ActiveChains, activeChainsStore, isChainActive } from "../chains/store.activeChains"
import {
  ActiveEvmNetworks,
  activeEvmNetworksStore,
  isEvmNetworkActive,
} from "../ethereum/store.activeEvmNetworks"
import { ActiveTokens, activeTokensStore, isTokenActive } from "../tokens/store.activeTokens"
import {
  AddressesAndEvmNetwork,
  AddressesAndTokens,
  Balances,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
} from "./types"

export class BalancesHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // balances handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return this.stores.balances.getBalance(request as RequestBalance)

      case "pri(balances.subscribe)": {
        const onDisconnected = portDisconnected(port)

        await awaitKeyringLoaded()
        const hasSubstrateAccounts = keyring
          .getAccounts()
          .some((account) => account.meta.type !== "ethereum")

        // TODO: Run this on a timer or something instead of when subscribing to balances
        await updateAndWaitForUpdatedChaindata(hasSubstrateAccounts)

        return this.stores.balances.subscribe(id, onDisconnected)
      }

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)":
        return subscribeBalancesByParams(id, port, request as RequestBalancesByParamsSubscribe)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

type BalanceSubscriptionParams = {
  addressesByTokenByModule: Record<string, AddressesByToken<Token>>
  miniMetadataIds: string[]
}

const subscribeBalancesByParams = async (
  id: string,
  port: Port,
  {
    addressesByChain,
    addressesAndEvmNetworks,
    addressesAndTokens,
  }: RequestBalancesByParamsSubscribe
): Promise<boolean> => {
  // create safe onDisconnect handler
  const onDisconnected = portDisconnected(port)

  // create subscription callback
  const callback = createSubscription<"pri(balances.byparams.subscribe)">(id, port)

  const hasSubstrateAddresses =
    Object.values(addressesByChain).flat().some(isValidSubstrateAddress) ||
    addressesAndTokens.addresses.some(isValidSubstrateAddress)

  // wait for chaindata to hydrate
  await updateAndWaitForUpdatedChaindata(hasSubstrateAddresses)

  // set up variables to track inner balances subscriptions
  let subscriptionParams: BalanceSubscriptionParams = {
    addressesByTokenByModule: {},
    miniMetadataIds: [],
  }
  let balancesSubscriptionsGeneration = 0
  let balancesUnsubCallbacks: Promise<UnsubscribeFn>[] = []

  // create a subscription to the balances params
  // allows us to restart the inner balances subscriptions whenever the data
  // which they depend on changes
  const byParamsSubscription = combineLatest([
    // chains
    chaindataProvider.chainsByIdObservable,
    // evmNetworks
    chaindataProvider.evmNetworksByIdObservable,
    // tokens
    chaindataProvider.tokensByIdObservable,
    // miniMetadatas - not used here but we must retrigger the subscriptions when this changes
    liveQuery(async () => await balancesDb.miniMetadatas.toArray()),

    // active state of substrate chains
    activeChainsStore.observable,
    // active state of evm networks
    activeEvmNetworksStore.observable,
    // enable state of tokens
    activeTokensStore.observable,
  ]).subscribe({
    next: (args) => {
      const newSubscriptionParams = getSubscriptionParams(
        addressesByChain,
        addressesAndEvmNetworks,
        addressesAndTokens,
        ...args
      )

      // restart subscription only if params change
      if (isEqual(subscriptionParams, newSubscriptionParams)) return
      subscriptionParams = newSubscriptionParams

      // close previous subscriptions
      balancesSubscriptionsGeneration =
        (balancesSubscriptionsGeneration + 1) % Number.MAX_SAFE_INTEGER
      balancesUnsubCallbacks.forEach((cb) => cb.then((close) => close()))

      const thisGeneration = balancesSubscriptionsGeneration
      const { addressesByTokenByModule } = newSubscriptionParams

      // create placeholder rows for all missing balances, so FE knows they are initializing
      const initBalances: BalanceJson[] = balanceModules.flatMap((balanceModule) => {
        const addressesByToken = addressesByTokenByModule[balanceModule.type] ?? {}
        return Object.entries(addressesByToken).flatMap(([tokenId, addresses]) =>
          addresses.map((address) => balanceModule.getPlaceholderBalance(tokenId, address))
        )
      })
      const getBalanceKey = (b: BalanceJson | Balance) => `${b.tokenId}:${b.address}`
      const initBalanceMap = Object.fromEntries(initBalances.map((b) => [getBalanceKey(b), b]))
      callback({ type: "upsert", balances: new Balances(initBalances).toJSON() })

      // after 30 seconds, change the status of all balances still initializing to stale
      setTimeout(() => {
        if (thisGeneration !== balancesSubscriptionsGeneration) return

        const staleBalances = Object.values(initBalanceMap)
          .filter((b) => b.status === "initializing")
          .map((b) => ({ ...b, status: "stale" } as BalanceJson))
        callback({ type: "upsert", balances: new Balances(staleBalances).toJSON() })
      }, 30_000)

      // subscribe to balances by params
      balancesUnsubCallbacks = balanceModules.map((balanceModule) =>
        balanceModule.subscribeBalances(
          addressesByTokenByModule[balanceModule.type] ?? {},
          (error, result) => {
            if (thisGeneration !== balancesSubscriptionsGeneration) return

            if (error) {
              // eslint-disable-next-line no-console
              DEBUG && console.error(error)
              return
            }

            for (const balance of result?.each ?? []) delete initBalanceMap[getBalanceKey(balance)]
            callback({ type: "upsert", balances: (result ?? new Balances([])).toJSON() })
          }
        )
      )
    },
  })

  // unsub on port disconnect
  onDisconnected.then((): void => {
    unsubscribe(id)
    byParamsSubscription.unsubscribe()
    balancesUnsubCallbacks.forEach((cb) => cb.then((close) => close()))
  })

  // subscription created
  return true
}

const getSubscriptionParams = (
  addressesByChain: AddressesByChain,
  addressesAndEvmNetworks: AddressesAndEvmNetwork,
  addressesAndTokens: AddressesAndTokens,
  chains: ChainList,
  evmNetworks: EvmNetworkList,
  tokens: TokenList,
  miniMetadatas: MiniMetadata[],
  activeChains: ActiveChains,
  activeEvmNetworks: ActiveEvmNetworks,
  activeTokens: ActiveTokens
): BalanceSubscriptionParams => {
  //
  // Convert the inputs of `addressesByChain` and `addressesAndEvmNetworks` into what we need
  // for each balance module: `addressesByToken`.
  //
  const addressesByToken: AddressesByToken<Token> = [
    ...Object.entries(addressesByChain)
      // convert chainIds into chains
      .map(([chainId, addresses]) => [chains[chainId], addresses] as const)
      .filter(([chain]) => chain && isChainActive(chain, activeChains)),

    ...addressesAndEvmNetworks.evmNetworks
      // convert evmNetworkIds into evmNetworks
      .map(({ id }) => [evmNetworks[id], addressesAndEvmNetworks.addresses] as const)
      .filter(([evmNetwork]) => isEvmNetworkActive(evmNetwork, activeEvmNetworks)),
  ]
    // filter out requested chains/evmNetworks which don't exist
    .filter(([chainOrNetwork]) => chainOrNetwork !== undefined)
    // filter out requested chains/evmNetworks which have no rpcs
    .filter(([chainOrNetwork]) => (chainOrNetwork.rpcs?.length ?? 0) > 0)

    // convert chains and evmNetworks into a list of tokenIds
    .flatMap(([chainOrNetwork, addresses]) =>
      Object.values(tokens)
        .filter((t) => t.chain?.id === chainOrNetwork.id || t.evmNetwork?.id === chainOrNetwork.id)
        .filter((t) => isTokenActive(t, activeTokens))
        .map((t) => [t.id, addresses] as const)
    )

    // collect all of the addresses for each tokenId into a map of { [tokenId]: addresses }
    .reduce((addressesByToken, [tokenId, addresses]) => {
      if (!addressesByToken[tokenId]) addressesByToken[tokenId] = []
      addressesByToken[tokenId].push(...addresses)
      return addressesByToken
    }, {} as AddressesByToken<Token>)

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
      .map(([tokenId, addresses]) => [tokens[tokenId], addresses] as const),
  ]
    // filter out tokens which don't exist
    .filter(([token]) => !!token)

    // group each `{ [token.id]: addresses }` by token.type
    .reduce((byModule, [token, addresses]) => {
      if (!byModule[token.type]) byModule[token.type] = {}
      byModule[token.type][token.id] = addresses
      return byModule
    }, {} as Record<string, AddressesByToken<Token>>)

  const chainIds = Object.keys(addressesByChain).concat(
    ...addressesAndTokens.tokenIds.map((tid) => tokens[tid].chain?.id as ChainId).filter(Boolean)
  )

  // this restarts subscription if metadata changes for any of the chains we subscribe to
  const miniMetadataIds = miniMetadatas
    .filter((mm) => chainIds.includes(mm.chainId))
    .map((m) => m.id)

  return {
    addressesByTokenByModule,
    miniMetadataIds,
  }
}

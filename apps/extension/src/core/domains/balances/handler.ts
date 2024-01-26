import { DEBUG } from "@core/constants"
import {
  AddressesAndEvmNetwork,
  AddressesAndTokens,
  Balances,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
} from "@core/domains/balances/types"
import {
  ActiveChains,
  activeChainsStore,
  isChainActive,
} from "@core/domains/chains/store.activeChains"
import {
  ActiveEvmNetworks,
  activeEvmNetworksStore,
  isEvmNetworkActive,
} from "@core/domains/ethereum/store.activeEvmNetworks"
import {
  ActiveTokens,
  activeTokensStore,
  isTokenActive,
} from "@core/domains/tokens/store.activeTokens"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { ExtensionHandler } from "@core/libs/Handler"
import { balanceModules } from "@core/rpcs/balance-modules"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { updateAndWaitForUpdatedChaindata } from "@core/rpcs/mini-metadata-updater"
import { AddressesByChain, Port } from "@core/types/base"
import {
  AddressesByToken,
  BalanceJson,
  MiniMetadata,
  UnsubscribeFn,
  db as balancesDb,
} from "@talismn/balances"
import { ChainId, ChainList, EvmNetworkList, Token, TokenList } from "@talismn/chaindata-provider"
import { MessageTypes, RequestTypes, ResponseType } from "core/types"
import { liveQuery } from "dexie"
import isEqual from "lodash/isEqual"
import { BehaviorSubject, combineLatest } from "rxjs"

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

      case "pri(balances.subscribe)":
        // TODO: Run this on a timer or something instead of when subscribing to balances
        await updateAndWaitForUpdatedChaindata()

        return this.stores.balances.subscribe(id, port)

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)": {
        await updateAndWaitForUpdatedChaindata()
        return subscribeBalancesByParams(id, port, request as RequestBalancesByParamsSubscribe)
      }

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
  request: RequestBalancesByParamsSubscribe
): Promise<boolean> => {
  const { addressesByChain, addressesAndEvmNetworks, addressesAndTokens } =
    request as RequestBalancesByParamsSubscribe

  // create subscription callback
  const callback = createSubscription<"pri(balances.byparams.subscribe)">(id, port)

  const obsSubscriptionParams = new BehaviorSubject<BalanceSubscriptionParams>({
    addressesByTokenByModule: {},
    miniMetadataIds: [],
  })

  let closeSubscriptionCallbacks: Promise<UnsubscribeFn>[] = []

  // watch for changes to all stores, mainly important for onboarding as they start empty
  combineLatest([
    // chains
    chaindataProvider.chainsListObservable,
    // evmNetworks
    chaindataProvider.evmNetworksListObservable,
    // tokens
    chaindataProvider.tokensListObservable,
    // miniMetadatas - not used here but we must retrigger the subscription when this changes
    liveQuery(async () => await balancesDb.miniMetadatas.toArray()),
    // active state of evm networks
    activeEvmNetworksStore.observable,
    // active state of substrate chains
    activeChainsStore.observable,
    // enable state of tokens
    activeTokensStore.observable,
  ]).subscribe({
    next: async ([
      chains,
      evmNetworks,
      tokens,
      miniMetadatas,
      activeEvmNetworks,
      activeChains,
      activeTokens,
    ]) => {
      const newSubscriptionParams = getSubscriptionParams(
        addressesByChain,
        addressesAndEvmNetworks,
        addressesAndTokens,
        chains,
        evmNetworks,
        tokens,
        activeChains,
        activeEvmNetworks,
        activeTokens,
        miniMetadatas
      )

      // restart subscription only if params change
      if (!isEqual(obsSubscriptionParams.value, newSubscriptionParams))
        obsSubscriptionParams.next(newSubscriptionParams)
    },
  })

  // restart subscriptions each type params update
  obsSubscriptionParams.subscribe(async ({ addressesByTokenByModule }) => {
    // close previous subscriptions
    await Promise.all(closeSubscriptionCallbacks)

    // create placeholder rows for all missing balances, so FE knows they are initializing
    // entries from initBalances will be removed as they are updated by the balance modules
    let initBalances: BalanceJson[] = []
    for (const balanceModule of balanceModules) {
      const addressesByToken = addressesByTokenByModule[balanceModule.type] ?? {}
      for (const [tokenId, addresses] of Object.entries(addressesByToken))
        for (const address of addresses)
          initBalances.push(balanceModule.getPlaceholderBalance(tokenId, address))
    }

    callback({ type: "upsert", balances: new Balances(initBalances).toJSON() })

    const timeout = setTimeout(() => {
      // mark as stale all balances that are still initializing
      if (initBalances.length) {
        const staleBalances = initBalances.map((b) => ({ ...b, status: "stale" } as BalanceJson))
        callback({ type: "upsert", balances: new Balances(staleBalances).toJSON() })
      }
    }, 30_000)

    const cancelTimeout = new Promise<UnsubscribeFn>((resolve) =>
      resolve(() => clearTimeout(timeout))
    )

    // subscribe to balances by params
    closeSubscriptionCallbacks = [
      cancelTimeout,
      ...balanceModules.map((balanceModule) =>
        balanceModule.subscribeBalances(
          addressesByTokenByModule[balanceModule.type] ?? {},
          (error, result) => {
            // eslint-disable-next-line no-console
            if (error) DEBUG && console.error(error)
            else {
              callback({ type: "upsert", balances: (result ?? new Balances([])).toJSON() })

              // remove balances from initBalances
              if (result)
                for (const bal of result.each) {
                  initBalances = initBalances.filter(
                    (b) => b.address !== bal.address && b.tokenId !== bal.tokenId
                  )
                }
            }
          }
        )
      ),
    ]
  })

  // unsub on port disconnect
  port.onDisconnect.addListener((): void => {
    unsubscribe(id)
    closeSubscriptionCallbacks.forEach((cb) => cb.then((close) => close()))
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
  activeChains: ActiveChains,
  activeEvmNetworks: ActiveEvmNetworks,
  activeTokens: ActiveTokens,
  miniMetadatas: MiniMetadata[]
): BalanceSubscriptionParams => {
  //
  // Convert the inputs of `addressesByChain` and `addressesAndEvmNetworks` into what we need
  // for each balance module: `addressesByToken`.
  //
  const addressesByToken: AddressesByToken<Token> = [
    ...Object.entries(addressesByChain)
      // convert chainIds into chains
      .map(([chainId, addresses]) => [chains[chainId], addresses] as const)
      .filter(([chain]) => isChainActive(chain, activeChains)),

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

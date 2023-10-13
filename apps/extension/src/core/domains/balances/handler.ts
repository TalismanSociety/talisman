import { DEBUG } from "@core/constants"
import { getNomPoolStake } from "@core/domains/balances/helpers"
import { balanceModules } from "@core/domains/balances/store"
import {
  Balances,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
  RequestNomPoolStake,
} from "@core/domains/balances/types"
import { createSubscription, unsubscribe } from "@core/handlers/subscriptions"
import { ExtensionHandler } from "@core/libs/Handler"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { Port } from "@core/types/base"
import { AddressesByToken } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { MessageTypes, RequestTypes, ResponseType } from "core/types"

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

      case "pri(balances.nompools.get)":
        return getNomPoolStake(request as RequestNomPoolStake)

      case "pri(balances.subscribe)":
        return this.stores.balances.subscribe(id, port)

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)": {
        // create subscription callback
        const callback = createSubscription<"pri(balances.byparams.subscribe)">(id, port)

        const { addressesByChain, addressesAndEvmNetworks, addressesAndTokens } =
          request as RequestBalancesByParamsSubscribe

        //
        // Collect the required data from chaindata.
        //

        const [chains, evmNetworks, tokens] = await Promise.all([
          chaindataProvider.chains(),
          chaindataProvider.evmNetworks(),
          chaindataProvider.tokens(),
        ])

        //
        // Convert the inputs of `addressesByChain` and `addressesAndEvmNetworks` into what we need
        // for each balance module: `addressesByToken`.
        //

        const addressesByToken: AddressesByToken<Token> = [
          ...Object.entries(addressesByChain)
            // convert chainIds into chains
            .map(([chainId, addresses]) => [chains[chainId], addresses] as const),

          ...addressesAndEvmNetworks.evmNetworks
            // convert evmNetworkIds into evmNetworks
            .map(({ id }) => [evmNetworks[id], addressesAndEvmNetworks.addresses] as const),
        ]
          // filter out requested chains/evmNetworks which don't exist
          .filter(([chainOrNetwork]) => chainOrNetwork !== undefined)
          // filter out requested chains/evmNetworks which have no rpcs
          .filter(([chainOrNetwork]) => (chainOrNetwork.rpcs?.length ?? 0) > 0)

          // convert chains and evmNetworks into a list of tokenIds
          .flatMap(([chainOrNetwork, addresses]) =>
            (chainOrNetwork.tokens || []).map(({ id: tokenId }) => [tokenId, addresses] as const)
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
          .filter(([token]) => token !== undefined && token.isDefault !== false) // TODO filter based on if token is enabled

          // group each `{ [token.id]: addresses }` by token.type
          .reduce((byModule, [token, addresses]) => {
            if (!byModule[token.type]) byModule[token.type] = {}
            byModule[token.type][token.id] = addresses
            return byModule
          }, {} as Record<string, AddressesByToken<Token>>)

        // subscribe to balances by params
        const closeSubscriptionCallbacks = balanceModules.map((balanceModule) =>
          balanceModule.subscribeBalances(
            addressesByTokenByModule[balanceModule.type] ?? {},
            (error, result) => {
              // eslint-disable-next-line no-console
              if (error) DEBUG && console.error(error)
              else callback({ type: "upsert", balances: (result ?? new Balances([])).toJSON() })
            }
          )
        )

        // unsub on port disconnect
        port.onDisconnect.addListener((): void => {
          unsubscribe(id)
          closeSubscriptionCallbacks.forEach((cb) => cb.then((close) => close()))
        })

        // subscription created
        return true
      }

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

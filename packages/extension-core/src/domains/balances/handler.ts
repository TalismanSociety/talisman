import { getSharedObservable } from "@talismn/util"
import { Observable, of } from "rxjs"

import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { balancePool, ExternalBalancePool } from "./pool"
import {
  BalanceSubscriptionResponse,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
} from "./types"
import { walletBalances$ } from "./walletBalances"

export class BalancesHandler extends ExtensionHandler {
  public async handle<TMessageType extends MessageTypes>(
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: Port,
  ): Promise<ResponseType<TMessageType>> {
    switch (type) {
      // --------------------------------------------------------------------
      // balances handlers -----------------------------------------------------
      // --------------------------------------------------------------------
      case "pri(balances.get)":
        return balancePool.getBalance(request as RequestBalance)

      case "pri(balances.subscribe)":
        return genericSubscription(id, port, walletBalances$)

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)":
        return genericSubscription(
          id,
          port,
          getExternalBalances$(request as RequestBalancesByParamsSubscribe),
        )

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

// const getWalletBalances$ = () => {
//   return getSharedObservable(
//     "getWalletBalances$",
//     null,
//     (): Observable<BalanceSubscriptionResponse> => {
//       const balancesProvider = new BalancesProvider(chaindataProvider, chainConnectors)

//       const addressesByTokenId$ = combineLatest({
//         networks: chaindataProvider.networks$,
//         tokens: chaindataProvider.tokens$,
//         accounts: keyringStore.accounts$,
//         activeTokens: activeTokensStore.observable,
//         activeNetworks: activeNetworksStore.observable,
//       }).pipe(
//         map(({ networks, tokens, accounts, activeTokens, activeNetworks }) => {
//           const arNetworks = networks.filter((n) => isNetworkActive(n, activeNetworks))
//           const arTokens = tokens.filter((t) => isTokenActive(t, activeTokens))

//           return fromPairs(
//             arNetworks.flatMap((network) => {
//               const networkTokens = arTokens.filter((t) => t.networkId === network.id)
//               const networkAccounts = accounts.filter((a) =>
//                 isAccountCompatibleWithNetwork(network, a),
//               )
//               return networkTokens.map(
//                 (token) =>
//                   [token.id, networkAccounts.map((a) => a.address)] as [TokenId, Address[]],
//               )
//             }),
//           )
//         }),
//       )

//       return addressesByTokenId$.pipe(
//         switchMap((addressesByTokenId) => balancesProvider.getBalances$(addressesByTokenId)),
//         map(
//           (result): BalanceSubscriptionResponse => ({
//             status: result.status,
//             data: result.balances as BalanceJson[],
//           }),
//         ),
//         tap((data) => {
//           console.log("walletBalancesEmit", data)
//         }),
//       )
//     },
//   )
// }

const getExternalBalances$ = (
  params: RequestBalancesByParamsSubscribe,
): Observable<BalanceSubscriptionResponse> => {
  return getSharedObservable(
    "getExternalBalances$",
    params,
    (): Observable<BalanceSubscriptionResponse> => {
      const { addressesAndEvmNetworks, addressesAndTokens, addressesByChain } = params
      const flatAddressesByChains = Object.values(addressesByChain).flat()

      // if no addresses, return early
      if (
        !flatAddressesByChains.length &&
        !addressesAndTokens.addresses.length &&
        !addressesAndEvmNetworks.addresses.length
      )
        return of<BalanceSubscriptionResponse>({
          balances: [],
          status: "live",
        })

      let externalBalancePool: ExternalBalancePool
      return new Observable<BalanceSubscriptionResponse>((subscriber) => {
        externalBalancePool = new ExternalBalancePool()

        // init synchronously
        subscriber.next({
          balances: [],
          status: "initialising",
        })

        // TODO refactor pool so it doesnt need an id nor a disconnect function..
        const id = crypto.randomUUID()
        let disconnect: () => void
        const onDisconnected = new Promise<void>((resolve) => {
          disconnect = () => resolve()
        })

        externalBalancePool.setSubcriptionParameters({
          addressesByChain,
          addressesAndEvmNetworks,
          addressesAndTokens,
        })

        externalBalancePool.subscribe(id, onDisconnected, (balances) => {
          subscriber.next(balances)
        })

        return () => {
          disconnect() // this triggers some 5 sec timeout in the pool, then only it will actually unsubscribe
          externalBalancePool.destroy() // not sure if this plays well with the above, though I havent noticed any issues yet
        }
      })
    },
  )
}

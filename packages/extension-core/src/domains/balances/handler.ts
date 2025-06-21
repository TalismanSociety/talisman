import { getSharedObservable } from "@talismn/util"
import { Observable, of } from "rxjs"

import {
  createSubscription,
  genericSubscription,
  portDisconnected,
} from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { balancePool, ExternalBalancePool } from "./pool"
import {
  BalanceSubscriptionResponse,
  RequestBalance,
  RequestBalancesByParamsSubscribe,
} from "./types"

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

      case "pri(balances.subscribe)": {
        // TODO turn balancePool into a promise, and leverage genericSubscription
        const onDisconnected = portDisconnected(port)
        const callback = createSubscription<"pri(balances.subscribe)">(id, port)

        balancePool.subscribe(id, onDisconnected, callback)

        return true
      }

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
          data: [],
          status: "live",
        })

      let externalBalancePool: ExternalBalancePool
      return new Observable<BalanceSubscriptionResponse>((subscriber) => {
        externalBalancePool = new ExternalBalancePool()

        // init synchronously
        subscriber.next({
          data: [],
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

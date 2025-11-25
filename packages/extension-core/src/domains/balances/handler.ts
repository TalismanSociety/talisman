import { IBalance } from "@talismn/balances"
import { getSharedObservable } from "@talismn/util"
import { fromPairs } from "lodash-es"
import { filter, firstValueFrom, map, Observable, of } from "rxjs"

import { genericSubscription } from "../../handlers/subscriptions"
import { ExtensionHandler } from "../../libs/Handler"
import { MessageTypes, RequestTypes, ResponseType } from "../../types"
import { Port } from "../../types/base"
import { balancesProvider } from "./balancesProvider"
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
        return getBalance(request as RequestBalance)

      case "pri(balances.subscribe)":
        return genericSubscription(id, port, walletBalances$)

      // TODO: Replace this call with something internal to the balances store
      // i.e. refactor the balances store to allow us to subscribe to arbitrary balances here,
      // instead of being limited to the accounts which are in the wallet's keystore
      case "pri(balances.byparams.subscribe)":
        return genericSubscription(
          id,
          port,
          getBalancesByParams$(request as RequestBalancesByParamsSubscribe),
        )

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}

const getBalance = ({ address, tokenId }: RequestBalance) => {
  return firstValueFrom(
    balancesProvider.getBalances$({ [tokenId]: [address] }).pipe(
      filter((res) => res.status === "live"),
      map((res): IBalance | null => res.balances[0] ?? null),
    ),
  )
}

const getBalancesByParams$ = (
  params: RequestBalancesByParamsSubscribe,
): Observable<BalanceSubscriptionResponse> => {
  return getSharedObservable(
    "getBalancesByParams$",
    params,
    (): Observable<BalanceSubscriptionResponse> => {
      const { addressesAndTokens } = params

      // if no addresses, return early
      if (!addressesAndTokens.addresses.length || !addressesAndTokens.tokenIds.length)
        return of<BalanceSubscriptionResponse>({
          balances: [],
          status: "live",
          failedBalanceIds: [],
        })

      const addressesByTokenId = fromPairs(
        addressesAndTokens.tokenIds.map(
          (tokenId) => [tokenId, addressesAndTokens.addresses] as [string, string[]],
        ),
      )

      return balancesProvider.getBalances$(addressesByTokenId)
    },
  )
}
